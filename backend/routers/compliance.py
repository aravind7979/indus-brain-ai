import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from backend.database import get_db
from backend.models import Document, DocumentChunk, ComplianceFinding, KnowledgeNode, KnowledgeEdge
from backend.schemas import ComplianceCheckRequest, ComplianceCheckResponse, ComplianceFindingOut
from backend.auth import get_current_user
from backend.ai.vector_store import vector_store_manager
from backend.ai.gemini_client import gemini_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/compliance", tags=["Compliance Intelligence"])

@router.post("/evaluate", response_model=ComplianceCheckResponse)
def evaluate_compliance(
    payload: ComplianceCheckRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    doc_id = payload.document_id
    
    # 1. Fetch document and text
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
        
    chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == doc_id).order_by(DocumentChunk.chunk_index).all()
    if not chunks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document has no text content parsed yet. Please wait for processing to finish."
        )
        
    procedure_text = "\n".join([c.content for c in chunks])
    
    # 2. Search FAISS for compliance standard contexts (Factory Act, OISD)
    # We query vector store for rules related to safety, lockouts, ventilation, hazards
    try:
        search_results = vector_store_manager.search("Factory Act OISD safety standard requirements compliance", k=5)
    except Exception as e:
        logger.error(f"Compliance FAISS search failed: {e}")
        search_results = []
        
    standards_context = ""
    for idx, _ in search_results:
        chk = db.query(DocumentChunk).filter(DocumentChunk.faiss_index_id == idx).first()
        # Ensure we don't fetch chunks from the same document we are evaluating
        if chk and chk.document_id != doc_id:
            standards_context += f"\n- {chk.content}\n"
            
    if not standards_context:
        # Fallback default regulations standard to guide the auditor if no safety manuals are uploaded yet
        standards_context = (
            "Standard Regulatory Guidelines:\n"
            "1. Lockout Tagout (LOTO): Physical locks and tags must be placed on power isolators before any maintenance. Verification of zero energy state is mandatory.\n"
            "2. Gas Testing: For confined space entry or hot work, atmospheric gas testing (for oxygen, flammables, toxic gas) must be conducted and logged within 30 minutes of work start.\n"
            "3. Personal Protective Equipment (PPE): Level C/B clothing, safety boots, high-vis vests, safety glasses, and hard hats are mandatory on the factory floor.\n"
            "4. Ventilation: Confined spaces must be continuously ventilated. Blowers are required if oxygen level is below 19.5%."
        )
        
    # 3. Call Gemini Auditor
    try:
        audit_results = gemini_client.generate_compliance_audit(procedure_text[:8000], standards_context)
    except Exception as e:
        logger.error(f"Compliance AI evaluation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Compliance analysis failed: {str(e)}"
        )
        
    overall_status = audit_results.get("overall_status", "Action Required")
    findings_list = audit_results.get("findings", [])
    
    # 4. Remove previous compliance findings for this document to avoid duplicates
    db.query(ComplianceFinding).filter(ComplianceFinding.document_id == doc_id).delete()
    
    # 5. Save findings in SQLite
    response_findings = []
    for f in findings_list:
        db_finding = ComplianceFinding(
            document_id=doc_id,
            section=f.get("section", "General"),
            requirement_status=f.get("requirement_status", "Observation"),
            findings=f.get("findings", ""),
            violations=f.get("violations"),
            recommendations=f.get("recommendations")
        )
        db.add(db_finding)
        response_findings.append(ComplianceFindingOut(
            section=db_finding.section,
            requirement_status=db_finding.requirement_status,
            findings=db_finding.findings,
            violations=db_finding.violations,
            recommendations=db_finding.recommendations
        ))
        
    db.commit()
    
    # 6. Update Knowledge Graph: Register compliance/violation nodes
    doc_node_id = f"DOC-{doc_id}"
    # Ensure doc node is registered
    doc_node = db.query(KnowledgeNode).filter(KnowledgeNode.id == doc_node_id).first()
    if not doc_node:
        doc_node = KnowledgeNode(
            id=doc_node_id,
            name=doc.filename,
            type="Document",
            description=f"Uploaded document for review"
        )
        db.add(doc_node)
        db.commit()
        
    # Add nodes for each Non-Compliant finding to show on the graph
    for idx, f in enumerate(response_findings):
        if f.requirement_status == "Non-Compliant":
            violation_node_id = f"VIOLATION-{doc_id}-{idx}"
            violation_node = KnowledgeNode(
                id=violation_node_id,
                name=f"Violation: {f.section or 'Safety Rule'}",
                type="Incident",  # Classify as incident event node
                description=f"Safety violation: {f.violations or f.findings}"
            )
            db.add(violation_node)
            db.commit()
            
            # Connect edge: Violation node affects Document/Procedure
            db_edge = KnowledgeEdge(
                source_id=violation_node_id,
                target_id=doc_node_id,
                type="affects",
                description="Compliance audit warning link"
            )
            db.add(db_edge)
            db.commit()
            
    return ComplianceCheckResponse(
        document_id=doc_id,
        filename=doc.filename,
        overall_status=overall_status,
        findings=response_findings
    )

@router.get("/findings", response_model=List[ComplianceFindingOut])
def get_all_compliance_findings(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    findings = db.query(ComplianceFinding).all()
    out = []
    for f in findings:
        out.append(ComplianceFindingOut(
            section=f.section,
            requirement_status=f.requirement_status,
            findings=f.findings,
            violations=f.violations,
            recommendations=f.recommendations
        ))
    return out
