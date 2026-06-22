import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from backend.database import get_db
from backend.models import MaintenanceReport, DocumentChunk, KnowledgeNode, KnowledgeEdge
from backend.schemas import MaintenanceAnalysisRequest, MaintenanceAnalysisResponse
from backend.auth import get_current_user
from backend.ai.vector_store import vector_store_manager
from backend.ai.gemini_client import gemini_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/maintenance", tags=["Maintenance Intelligence"])

@router.post("/analyze", response_model=MaintenanceAnalysisResponse)
def analyze_maintenance(
    payload: MaintenanceAnalysisRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    title = payload.title
    equipment_id = payload.equipment_id
    findings = payload.findings
    reporter = payload.reporter
    
    # 1. Search vector database for manuals or guides relevant to this equipment and findings
    try:
        search_query = f"{equipment_id} {title} {findings}"
        search_results = vector_store_manager.search(search_query, k=3)
    except Exception as e:
        logger.error(f"Maintenance vector search failed: {e}")
        search_results = []
        
    related_docs_text = ""
    for idx, _ in search_results:
        chunk = db.query(DocumentChunk).filter(DocumentChunk.faiss_index_id == idx).first()
        if chunk:
            related_docs_text += f"\n- {chunk.content}\n"
            
    # 2. Get AI Root Cause Analysis
    try:
        ai_analysis = gemini_client.generate_maintenance_analysis(title, findings, related_docs_text)
    except Exception as e:
        logger.error(f"Maintenance AI analysis failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate root cause: {str(e)}"
        )
        
    root_cause = ai_analysis.get("root_cause", "Undetermined failure mode.")
    recommendations = ai_analysis.get("recommendations", "Review physical system connections.")
    
    # 3. Retrieve historical similar failures from SQLite
    # We find reports matching the same equipment, excluding this current new entry
    past_failures = db.query(MaintenanceReport).filter(
        MaintenanceReport.equipment_id == equipment_id
    ).order_by(MaintenanceReport.report_date.desc()).limit(3).all()
    
    similar_failures_list = []
    for report in past_failures:
        similar_failures_list.append({
            "id": report.id,
            "title": report.title,
            "date": report.report_date.isoformat(),
            "reporter": report.reporter,
            "root_cause": report.root_cause
        })
        
    # 4. Save new report to Database
    db_report = MaintenanceReport(
        title=title,
        equipment_id=equipment_id,
        reporter=reporter,
        findings=findings,
        root_cause=root_cause,
        recommendations=recommendations,
        raw_text=f"Equipment: {equipment_id}\nFindings: {findings}"
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    
    # 5. Connect to Knowledge Graph
    # Ensure equipment node exists
    equip_node = db.query(KnowledgeNode).filter(KnowledgeNode.id == equipment_id).first()
    if not equip_node:
        equip_node = KnowledgeNode(
            id=equipment_id,
            name=equipment_id.replace("-", " ").title(),
            type="Equipment",
            description=f"Industrial equipment unit: {equipment_id}"
        )
        db.add(equip_node)
        
    # Create Maintenance Node
    maint_node_id = f"MAINT-{db_report.id}"
    maint_node = KnowledgeNode(
        id=maint_node_id,
        name=f"Report: {title}",
        type="Maintenance Record",
        description=f"Root cause: {root_cause[:120]}..."
    )
    db.add(maint_node)
    db.commit()
    
    # Connect edge: Maintenance caused_by/affects Equipment
    db_edge = KnowledgeEdge(
        source_id=maint_node_id,
        target_id=equipment_id,
        type="affects",
        description=f"Maintenance log for equipment unit"
    )
    db.add(db_edge)
    db.commit()
    
    return MaintenanceAnalysisResponse(
        report_id=db_report.id,
        title=db_report.title,
        equipment_id=db_report.equipment_id,
        findings=db_report.findings,
        root_cause=db_report.root_cause,
        recommendations=db_report.recommendations,
        similar_failures=similar_failures_list
    )

@router.get("/reports", response_model=List[MaintenanceAnalysisResponse])
def get_maintenance_reports(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    reports = db.query(MaintenanceReport).order_by(MaintenanceReport.report_date.desc()).all()
    
    out = []
    for r in reports:
        out.append(MaintenanceAnalysisResponse(
            report_id=r.id,
            title=r.title,
            equipment_id=r.equipment_id,
            findings=r.findings,
            root_cause=r.root_cause,
            recommendations=r.recommendations,
            similar_failures=[] # Keep empty for list views to save payload size
        ))
    return out
