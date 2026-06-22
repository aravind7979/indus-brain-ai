import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from backend.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # PDF, TXT, DOCX
    file_path = Column(String, nullable=False)
    upload_date = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String, default="Pending")  # Pending, Processing, Completed, Failed
    chunk_count = Column(Integer, default=0)
    summary = Column(Text, nullable=True)
    
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")
    compliance_findings = relationship("ComplianceFinding", back_populates="document", cascade="all, delete-orphan")

class DocumentChunk(Base):
    __tablename__ = "document_chunks"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    faiss_index_id = Column(Integer, nullable=False)  # Map to position in FAISS vector store
    
    document = relationship("Document", back_populates="chunks")

class KnowledgeNode(Base):
    __tablename__ = "knowledge_nodes"
    
    id = Column(String, primary_key=True, index=True)  # E.g. "PUMP-P101", "PROC-STARTUP", "DOC-1"
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # Equipment, Procedure, Document, Incident, Maintenance Record
    description = Column(Text, nullable=True)
    metadata_json = Column(Text, nullable=True)  # Additional properties in JSON string

class KnowledgeEdge(Base):
    __tablename__ = "knowledge_edges"
    
    id = Column(Integer, primary_key=True, index=True)
    source_id = Column(String, ForeignKey("knowledge_nodes.id", ondelete="CASCADE"), nullable=False)
    target_id = Column(String, ForeignKey("knowledge_nodes.id", ondelete="CASCADE"), nullable=False)
    type = Column(String, nullable=False)  # references, affects, caused_by, related_to
    description = Column(Text, nullable=True)

class MaintenanceReport(Base):
    __tablename__ = "maintenance_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    equipment_id = Column(String, nullable=False)  # Matches KnowledgeNode id (e.g., PUMP-P101)
    report_date = Column(DateTime, default=datetime.datetime.utcnow)
    reporter = Column(String, nullable=False)
    findings = Column(Text, nullable=False)
    root_cause = Column(Text, nullable=True)
    recommendations = Column(Text, nullable=True)
    raw_text = Column(Text, nullable=True)  # Full report text if uploaded

class ComplianceFinding(Base):
    __tablename__ = "compliance_findings"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    section = Column(String, nullable=True)
    requirement_status = Column(String, nullable=False)  # Compliant, Non-Compliant, Observation
    findings = Column(Text, nullable=False)
    violations = Column(Text, nullable=True)
    recommendations = Column(Text, nullable=True)
    evaluation_date = Column(DateTime, default=datetime.datetime.utcnow)
    
    document = relationship("Document", back_populates="compliance_findings")

class IncidentReport(Base):
    __tablename__ = "incident_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    incident_date = Column(DateTime, default=datetime.datetime.utcnow)
    description = Column(Text, nullable=False)
    root_cause = Column(Text, nullable=True)
    lessons_learned = Column(Text, nullable=True)
    prevention_plan = Column(Text, nullable=True)
    raw_text = Column(Text, nullable=True)
