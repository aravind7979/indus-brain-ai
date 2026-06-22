import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from backend.database import get_db
from backend.models import DocumentChunk, Document
from backend.schemas import ChatRequest, ChatResponse, Citation
from backend.auth import get_current_user
from backend.ai.vector_store import vector_store_manager
from backend.ai.gemini_client import gemini_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/copilot", tags=["AI Expert Copilot"])

@router.post("/chat", response_model=ChatResponse)
def copilot_chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    question = payload.question
    history = payload.history
    
    # 1. Check if database has any chunks
    total_chunks = db.query(DocumentChunk).count()
    if total_chunks == 0:
        return ChatResponse(
            answer="Welcome to INDUS BRAIN AI! No operational manuals or safety documents are currently ingested in the system. Please upload technical documents (PDF, TXT, DOCX) in the 'Document Management' tab to initialize the Expert Brain.",
            confidence_score=0.0,
            citations=[],
            retrieved_docs=[]
        )
        
    # 2. Search FAISS index for top matching chunk IDs
    try:
        search_results = vector_store_manager.search(question, k=5)
    except Exception as e:
        logger.error(f"Vector search failed: {e}")
        search_results = []
        
    # 3. Retrieve chunk text and document names from SQLite
    chunks_context = []
    retrieved_filenames = set()
    
    for idx, dist in search_results:
        chunk_record = db.query(DocumentChunk).filter(DocumentChunk.faiss_index_id == idx).first()
        if chunk_record:
            doc = db.query(Document).filter(Document.id == chunk_record.document_id).first()
            filename = doc.filename if doc else "Unknown Source"
            if doc:
                retrieved_filenames.add(doc.filename)
                
            chunks_context.append({
                "db_chunk_id": chunk_record.id,
                "document_id": chunk_record.document_id,
                "filename": filename,
                "chunk_index": chunk_record.chunk_index,
                "content": chunk_record.content
            })
            
    # 4. Generate response using Gemini Client (RAG context injection)
    try:
        gemini_response = gemini_client.generate_rag_response(question, chunks_context, history)
    except Exception as e:
        logger.error(f"Gemini client failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI Engine failed to generate answer: {str(e)}"
        )
        
    # 5. Extract citations based on indices cited by Gemini
    citations = []
    cited_indexes = gemini_response.get("cited_chunk_indexes", [])
    
    for idx in cited_indexes:
        if 0 <= idx < len(chunks_context):
            ctx = chunks_context[idx]
            citations.append(Citation(
                document_id=ctx["document_id"],
                filename=ctx["filename"],
                chunk_index=ctx["chunk_index"],
                content_snippet=ctx["content"][:200] + "..."
            ))
            
    # If Gemini cited nothing but we retrieved chunks, provide a default citation of the best match
    if not citations and chunks_context:
        ctx = chunks_context[0]
        citations.append(Citation(
            document_id=ctx["document_id"],
            filename=ctx["filename"],
            chunk_index=ctx["chunk_index"],
            content_snippet=ctx["content"][:200] + "..."
        ))
        
    return ChatResponse(
        answer=gemini_response.get("answer", "No answer could be formulated."),
        confidence_score=gemini_response.get("confidence_score", 0.5),
        citations=citations,
        retrieved_docs=list(retrieved_filenames)
    )
