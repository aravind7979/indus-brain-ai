import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from backend.database import get_db
from backend.models import IncidentReport, DocumentChunk, KnowledgeNode, KnowledgeEdge
from backend.schemas import IncidentAnalysisRequest, IncidentAnalysisResponse
from backend.auth import get_current_user
from backend.ai.vector_store import vector_store_manager
from backend.ai.gemini_client import gemini_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/incidents", tags=["Lessons Learned Intelligence"])

@router.post("/analyze", response_model=IncidentAnalysisResponse)
def analyze_incident(
    payload: IncidentAnalysisRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    title = payload.title
    description = payload.description
    
    # 1. Search vector database for similar incidents or manuals
    try:
        search_query = f"incident accident explosion breakdown failure {title} {description}"
        search_results = vector_store_manager.search(search_query, k=3)
    except Exception as e:
        logger.error(f"Incident vector search failed: {e}")
        search_results = []
        
    past_incidents_text = ""
    for idx, _ in search_results:
        chunk = db.query(DocumentChunk).filter(DocumentChunk.faiss_index_id == idx).first()
        if chunk:
            past_incidents_text += f"\n- {chunk.content}\n"
            
    # 2. Get AI Analysis & Lessons Learned
    try:
        ai_analysis = gemini_client.generate_lessons_learned(title, description, past_incidents_text)
    except Exception as e:
        logger.error(f"Incident AI analysis failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Incident analysis failed: {str(e)}"
        )
        
    root_cause = ai_analysis.get("root_cause", "Undetermined root cause.")
    lessons_learned = ai_analysis.get("lessons_learned", "Maintain close oversight of operational margins.")
    prevention_plan = ai_analysis.get("prevention_plan", "Enforce strict safety protocol guidelines.")
    
    # 3. Retrieve historical similar incidents from SQLite
    past_incidents = db.query(IncidentReport).order_by(
        IncidentReport.incident_date.desc()
    ).limit(3).all()
    
    similar_incidents_list = []
    for report in past_incidents:
        similar_incidents_list.append({
            "id": report.id,
            "title": report.title,
            "date": report.incident_date.isoformat(),
            "root_cause": report.root_cause
        })
        
    # 4. Save new incident report to Database
    db_report = IncidentReport(
        title=title,
        description=description,
        root_cause=root_cause,
        lessons_learned=lessons_learned,
        prevention_plan=prevention_plan,
        raw_text=description
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    
    # 5. Connect to Knowledge Graph
    # Create Incident Node
    incident_node_id = f"INCIDENT-{db_report.id}"
    incident_node = KnowledgeNode(
        id=incident_node_id,
        name=f"Incident: {title}",
        type="Incident",
        description=f"Lessons Learned: {lessons_learned[:120]}..."
    )
    db.add(incident_node)
    db.commit()
    
    # Try parsing text to extract equipment associations (e.g. Pump P101)
    for term in ["PUMP-P101", "COMPRESSOR-C202", "P101", "C202"]:
        if term.lower() in title.lower() or term.lower() in description.lower():
            # Standardize equip node ID
            equip_id = "PUMP-P101" if "p101" in term.lower() else "COMPRESSOR-C202"
            
            # Ensure equipment node exists
            equip_node = db.query(KnowledgeNode).filter(KnowledgeNode.id == equip_id).first()
            if not equip_node:
                equip_node = KnowledgeNode(
                    id=equip_id,
                    name=equip_id.replace("-", " ").title(),
                    type="Equipment",
                    description=f"Industrial equipment unit: {equip_id}"
                )
                db.add(equip_node)
                db.commit()
                
            # Create connection: Incident caused_by/affects Equipment
            db_edge = KnowledgeEdge(
                source_id=incident_node_id,
                target_id=equip_id,
                type="caused_by",
                description=f"Incident happened during operations of {equip_id}"
            )
            db.add(db_edge)
            db.commit()
            
    return IncidentAnalysisResponse(
        incident_id=db_report.id,
        title=db_report.title,
        root_cause=db_report.root_cause,
        lessons_learned=db_report.lessons_learned,
        prevention_plan=db_report.prevention_plan,
        similar_incidents=similar_incidents_list
    )

@router.get("/reports", response_model=List[IncidentAnalysisResponse])
def get_incident_reports(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    reports = db.query(IncidentReport).order_by(IncidentReport.incident_date.desc()).all()
    
    out = []
    for r in reports:
        out.append(IncidentAnalysisResponse(
            incident_id=r.id,
            title=r.title,
            root_cause=r.root_cause,
            lessons_learned=r.lessons_learned,
            prevention_plan=r.prevention_plan,
            similar_incidents=[] # Keep empty for list view
        ))
    return out
