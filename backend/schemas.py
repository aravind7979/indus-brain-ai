from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# --- User & Authentication ---
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=4)

class UserLogin(BaseModel):
    username: str
    password: str

class UserOut(BaseModel):
    id: int
    username: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# --- Documents ---
class DocumentOut(BaseModel):
    id: int
    filename: str
    file_type: str
    upload_date: datetime
    status: str
    chunk_count: int
    summary: Optional[str] = None
    
    class Config:
        from_attributes = True

class DocumentStats(BaseModel):
    total_documents: int
    total_chunks: int
    processing_count: int
    failed_count: int

# --- AI Copilot (RAG) ---
class ChatRequest(BaseModel):
    question: str
    history: Optional[List[Dict[str, str]]] = Field(default_factory=list) # List of {"role": "user"/"assistant", "content": "..."}

class Citation(BaseModel):
    document_id: int
    filename: str
    chunk_index: int
    content_snippet: str

class ChatResponse(BaseModel):
    answer: str
    confidence_score: float  # 0.0 to 1.0
    citations: List[Citation]
    retrieved_docs: List[str] # List of unique filenames retrieved

# --- Maintenance Intelligence ---
class MaintenanceAnalysisRequest(BaseModel):
    title: str
    equipment_id: str
    findings: str
    reporter: Optional[str] = "Operator"

class MaintenanceAnalysisResponse(BaseModel):
    report_id: int
    title: str
    equipment_id: str
    findings: str
    root_cause: str
    recommendations: str
    similar_failures: List[Dict[str, Any]]
    
    class Config:
        from_attributes = True

# --- Compliance Intelligence ---
class ComplianceCheckRequest(BaseModel):
    document_id: int # The SOP or safety manual to audit

class ComplianceFindingOut(BaseModel):
    section: Optional[str]
    requirement_status: str # Compliant, Non-Compliant, Observation
    findings: str
    violations: Optional[str]
    recommendations: Optional[str]

class ComplianceCheckResponse(BaseModel):
    document_id: int
    filename: str
    overall_status: str # Fully Compliant, Critical Violations, Action Required
    findings: List[ComplianceFindingOut]

# --- Lessons Learned / Incidents ---
class IncidentAnalysisRequest(BaseModel):
    title: str
    description: str

class IncidentAnalysisResponse(BaseModel):
    incident_id: int
    title: str
    root_cause: str
    lessons_learned: str
    prevention_plan: str
    similar_incidents: List[Dict[str, Any]]
    
    class Config:
        from_attributes = True

# --- Knowledge Graph ---
class NodeOut(BaseModel):
    id: str
    name: str
    type: str
    description: Optional[str] = None
    metadata_json: Optional[str] = None

class EdgeOut(BaseModel):
    id: int
    source: str
    target: str
    type: str
    description: Optional[str] = None

class GraphOut(BaseModel):
    nodes: List[NodeOut]
    edges: List[EdgeOut]
