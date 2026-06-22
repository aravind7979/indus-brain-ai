import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from backend.database import get_db
from backend.models import KnowledgeNode, KnowledgeEdge, Document, DocumentChunk
from backend.schemas import GraphOut, NodeOut, EdgeOut
from backend.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/graph", tags=["Knowledge Graph"])

@router.get("", response_model=GraphOut)
def get_graph(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    nodes = db.query(KnowledgeNode).all()
    edges = db.query(KnowledgeEdge).all()
    
    nodes_out = [
        NodeOut(
            id=n.id,
            name=n.name,
            type=n.type,
            description=n.description,
            metadata_json=n.metadata_json
        ) for n in nodes
    ]
    
    edges_out = [
        EdgeOut(
            id=e.id,
            source=e.source_id,
            target=e.target_id,
            type=e.type,
            description=e.description
        ) for e in edges
    ]
    
    return GraphOut(nodes=nodes_out, edges=edges_out)

@router.post("/node", response_model=NodeOut, status_code=status.HTTP_201_CREATED)
def create_node(node: NodeOut, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    # Check if exists
    existing = db.query(KnowledgeNode).filter(KnowledgeNode.id == node.id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Node with ID '{node.id}' already exists"
        )
        
    db_node = KnowledgeNode(
        id=node.id,
        name=node.name,
        type=node.type,
        description=node.description,
        metadata_json=node.metadata_json
    )
    db.add(db_node)
    db.commit()
    db.refresh(db_node)
    return db_node

@router.post("/edge", response_model=EdgeOut, status_code=status.HTTP_201_CREATED)
def create_edge(edge: EdgeOut, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    # Validate source and target exist
    src = db.query(KnowledgeNode).filter(KnowledgeNode.id == edge.source).first()
    tgt = db.query(KnowledgeNode).filter(KnowledgeNode.id == edge.target).first()
    if not src or not tgt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both source and target nodes must exist in the database."
        )
        
    db_edge = KnowledgeEdge(
        source_id=edge.source,
        target_id=edge.target,
        type=edge.type,
        description=edge.description
    )
    db.add(db_edge)
    db.commit()
    db.refresh(db_edge)
    return EdgeOut(
        id=db_edge.id,
        source=db_edge.source_id,
        target=db_edge.target_id,
        type=db_edge.type,
        description=db_edge.description
    )

@router.delete("/node/{node_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_node(node_id: str, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    node = db.query(KnowledgeNode).filter(KnowledgeNode.id == node_id).first()
    if not node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Node not found"
        )
    db.delete(node)
    db.commit()
    return

@router.post("/seed", status_code=status.HTTP_200_OK)
def seed_industrial_knowledge_graph(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    # 1. Define nodes to insert
    nodes_to_seed = [
        {"id": "PUMP-P101", "name": "Centrifugal Pump P101", "type": "Equipment", "description": "Main high-pressure water feed pump for Boiler B303."},
        {"id": "COMPRESSOR-C202", "name": "Reciprocating Compressor C202", "type": "Equipment", "description": "Primary natural gas bypass compressor for thermal cracking loop."},
        {"id": "BOILER-B303", "name": "High-Pressure Boiler B303", "type": "Equipment", "description": "Steam generator feeding pressure to turbine manifolds."},
        {"id": "SOP-STARTUP-P101", "name": "Pump P101 Startup SOP", "type": "Procedure", "description": "Standard operating procedure detailing step-by-step startup for P101 Centrifugal pump."},
        {"id": "SOP-SHUTDOWN-C202", "name": "Compressor C202 Trip Procedure", "type": "Procedure", "description": "Standard checklist outlining emergency shutdown steps for Compressor C202 to prevent pressure surges."},
        {"id": "REG-OISD-115", "name": "OISD Safety Standard 115", "type": "Document", "description": "Oil Industry Safety Directorate guidelines detailing LOTO safety protocols."},
        {"id": "REG-FACTORY-ACT", "name": "Factory Act Chapter IV", "type": "Document", "description": "National compliance regulations detailing machine guarding and electrical isolation rules."},
        {"id": "INCIDENT-2025-OVERHEAT", "name": "P101 Dec-2025 Failure", "type": "Incident", "description": "Pump P101 bearing overheating incident causing a 2-hour plant production shutdown."},
        {"id": "INCIDENT-2026-LEAK", "name": "C202 Feb-2026 Leakage", "type": "Incident", "description": "Compressor C202 seal gas leakage triggering fire alarms, cleared by emergency bypass venting."},
        {"id": "MAINT-P101-BEARING", "name": "P101 Bearing Overhaul", "type": "Maintenance Record", "description": "Replacement of damaged radial bearings and alignment realignment on Pump P101."}
    ]
    
    # 2. Define edges to insert
    edges_to_seed = [
        {"source": "SOP-STARTUP-P101", "target": "PUMP-P101", "type": "references", "description": "Operational instructions for startup sequence"},
        {"source": "SOP-SHUTDOWN-C202", "target": "COMPRESSOR-C202", "type": "references", "description": "Safety procedures for emergency shutoff"},
        {"source": "INCIDENT-2025-OVERHEAT", "target": "PUMP-P101", "type": "caused_by", "description": "Overheating event happened on equipment shaft"},
        {"source": "INCIDENT-2026-LEAK", "target": "COMPRESSOR-C202", "type": "caused_by", "description": "Gas leak event originated at packing seal"},
        {"source": "MAINT-P101-BEARING", "target": "PUMP-P101", "type": "affects", "description": "Maintenance overhaul replaces bearings on unit"},
        {"source": "SOP-STARTUP-P101", "target": "REG-OISD-115", "type": "references", "description": "Requires compliance with LOTO checks"},
        {"source": "SOP-SHUTDOWN-C202", "target": "REG-FACTORY-ACT", "type": "references", "description": "Ensures standard máquina isolation regulations"},
        {"source": "INCIDENT-2025-OVERHEAT", "target": "MAINT-P101-BEARING", "type": "related_to", "description": "Bearing replacement was executed to resolve overheat"},
        {"source": "BOILER-B303", "target": "PUMP-P101", "type": "related_to", "description": "P101 supplies feed-water directly into Boiler B303"}
    ]
    
    # Clear previous seed graph nodes to avoid primary key collisions
    db.query(KnowledgeEdge).delete()
    db.query(KnowledgeNode).delete()
    db.commit()
    
    # Seed nodes
    for node in nodes_to_seed:
        db_node = KnowledgeNode(
            id=node["id"],
            name=node["name"],
            type=node["type"],
            description=node["description"]
        )
        db.add(db_node)
    db.commit()
    
    # Seed edges
    for edge in edges_to_seed:
        db_edge = KnowledgeEdge(
            source_id=edge["source"],
            target_id=edge["target"],
            type=edge["type"],
            description=edge["description"]
        )
        db.add(db_edge)
    db.commit()
    
    logger.info("Successfully seeded Knowledge Graph with high-quality demonstration nodes and edges.")
    return {"message": "Knowledge Graph seeded successfully with 10 nodes and 9 edges."}
