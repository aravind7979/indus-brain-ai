import os
import json
import logging
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from backend.config import settings

logger = logging.getLogger(__name__)

# Try to import Google GenAI SDK
try:
    from google import genai
    from google.genai import types
    GENAI_AVAILABLE = True
except ImportError:
    logger.warning("google-genai package not found. Will use mock/requests mode.")
    GENAI_AVAILABLE = False

# --- Pydantic schemas for Gemini Structured Outputs ---
class RAGResponseSchema(BaseModel):
    answer: str = Field(description="The final answer to the user query based ONLY on the provided context. Cite sources.")
    confidence_score: float = Field(description="Confidence score between 0.0 and 1.0 representing how fully the context answers the question.")
    cited_chunk_indexes: List[int] = Field(description="Indexes of chunks from the context that were directly used in the answer.")

class MaintenanceAnalysisSchema(BaseModel):
    root_cause: str = Field(description="Analysis of why the equipment failed.")
    recommendations: str = Field(description="Step-by-step remediation and preventive maintenance suggestions.")

class ComplianceFindingSchema(BaseModel):
    section: str = Field(description="Section or clause of the safety document being checked.")
    requirement_status: str = Field(description="Status of compliance: 'Compliant', 'Non-Compliant', or 'Observation'")
    findings: str = Field(description="Detailed analysis of how the procedure matches or violates the rule.")
    violations: Optional[str] = Field(description="Specific rule or safety code violated, if status is Non-Compliant.")
    recommendations: Optional[str] = Field(description="Actionable guidance to correct findings or observations.")

class ComplianceAuditSchema(BaseModel):
    overall_status: str = Field(description="Overall status: 'Fully Compliant', 'Critical Violations', or 'Action Required'")
    findings: List[ComplianceFindingSchema] = Field(description="List of individual section audits.")

class LessonsLearnedSchema(BaseModel):
    root_cause: str = Field(description="Root cause analysis of the incident.")
    lessons_learned: str = Field(description="Key take-aways and insights derived from the event.")
    prevention_plan: str = Field(description="Long-term checklist and protocol changes to prevent recurrence.")

class ExtractedNode(BaseModel):
    id: str = Field(description="Unique, clean uppercase ID, e.g. 'PUMP-P101', 'SOP-STARTUP', 'INCIDENT-FIRE'")
    name: str = Field(description="Human readable name, e.g., 'Water Feed Pump P101', 'Startup checklist'")
    type: str = Field(description="Entity type: 'Equipment', 'Procedure', 'Document', 'Incident', or 'Maintenance Record'")
    description: str = Field(description="Short description of the entity and its role.")

class ExtractedEdge(BaseModel):
    source: str = Field(description="Source Node ID")
    target: str = Field(description="Target Node ID")
    type: str = Field(description="Relationship type: 'references', 'affects', 'caused_by', or 'related_to'")
    description: str = Field(description="Reason for relationship connection.")

class KnowledgeGraphSchema(BaseModel):
    nodes: List[ExtractedNode] = Field(description="List of extracted equipment and procedural nodes.")
    edges: List[ExtractedEdge] = Field(description="Relationships connecting the nodes.")


class GeminiClient:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.client = None
        
        if GENAI_AVAILABLE and self.api_key:
            try:
                logger.info("Initializing Google GenAI client...")
                self.client = genai.Client(api_key=self.api_key)
                logger.info("Google GenAI client initialized successfully.")
            except Exception as e:
                logger.error(f"Failed to initialize Gemini Client: {e}")
        else:
            logger.warning("Gemini Client running in DEMO mode due to missing API key or package.")

    def is_demo_mode(self) -> bool:
        return self.client is None

    def generate_rag_response(self, question: str, chunks: List[Dict[str, Any]], history: List[Dict[str, str]] = None) -> Dict[str, Any]:
        """Generates RAG response using Gemini 2.5 Flash."""
        if self.is_demo_mode():
            return self._mock_rag_response(question, chunks)

        # Construct Context Chunks Text
        context_str = ""
        for i, chunk in enumerate(chunks):
            doc_name = chunk.get("filename", "Unknown Document")
            chunk_content = chunk.get("content", "")
            context_str += f"\n--- CHUNK {i} (Source: {doc_name}) ---\n{chunk_content}\n"

        # Setup System Instructions and Prompt
        system_instruction = (
            "You are the Indus Brain AI Expert Knowledge Copilot. You are an expert engineer and safety inspector. "
            "Your task is to answer the user's question using ONLY the provided retrieved document chunks. "
            "If the context does not contain enough information, explain that information is insufficient, "
            "and suggest what documentation might be missing. Do not make up facts."
        )

        prompt = f"Context files:\n{context_str}\n\nQuestion: {question}"

        try:
            # Prepare conversation history
            contents = []
            if history:
                for h in history:
                    role = "user" if h["role"] == "user" else "model"
                    contents.append(types.Content(
                        role=role,
                        parts=[types.Part.from_text(text=h["content"])]
                    ))
            
            contents.append(types.Content(
                role="user",
                parts=[types.Part.from_text(text=prompt)]
            ))

            config = types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.2,
                response_mime_type="application/json",
                response_schema=RAGResponseSchema
            )

            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=contents,
                config=config
            )
            
            return json.loads(response.text)

        except Exception as e:
            logger.error(f"Gemini API Error in RAG: {e}")
            return self._mock_rag_response(question, chunks, error=str(e))

    def generate_maintenance_analysis(self, title: str, findings: str, related_docs_context: str) -> Dict[str, Any]:
        """Generates root cause analysis and recommendations for equipment maintenance."""
        if self.is_demo_mode():
            return self._mock_maintenance_analysis(title, findings)

        prompt = (
            f"Equipement Maintenance Log:\nTitle: {title}\nFindings: {findings}\n\n"
            f"Related Documentation and Historical Context:\n{related_docs_context}\n\n"
            f"Analyze the findings and provide the root cause and recommendations."
        )

        try:
            config = types.GenerateContentConfig(
                system_instruction="You are an Industrial Reliability Engineering Agent. Diagnose the failure root cause and provide actionable recommendations.",
                temperature=0.3,
                response_mime_type="application/json",
                response_schema=MaintenanceAnalysisSchema
            )
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=config
            )
            return json.loads(response.text)
        except Exception as e:
            logger.error(f"Gemini API Error in Maintenance: {e}")
            return self._mock_maintenance_analysis(title, findings)

    def generate_compliance_audit(self, doc_text: str, compliance_standards: str) -> Dict[str, Any]:
        """Audits procedural text against compliance codes."""
        if self.is_demo_mode():
            return self._mock_compliance_audit(doc_text)

        prompt = (
            f"Procedure under review:\n{doc_text}\n\n"
            f"Applicable Compliance Guidelines/OISD standards:\n{compliance_standards}\n\n"
            f"Perform an audit on the procedure. Identify compliant areas, violations, and observations."
        )

        try:
            config = types.GenerateContentConfig(
                system_instruction="You are an Industrial Safety Compliance Auditor. Audit procedures against OISD, OSHA, and the Factory Act.",
                temperature=0.1,
                response_mime_type="application/json",
                response_schema=ComplianceAuditSchema
            )
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=config
            )
            return json.loads(response.text)
        except Exception as e:
            logger.error(f"Gemini API Error in Compliance: {e}")
            return self._mock_compliance_audit(doc_text)

    def generate_lessons_learned(self, title: str, description: str, past_incidents: str) -> Dict[str, Any]:
        """Extracts lessons learned and suggests prevention steps for an incident."""
        if self.is_demo_mode():
            return self._mock_lessons_learned(title, description)

        prompt = (
            f"Incident Title: {title}\n"
            f"Incident Description:\n{description}\n\n"
            f"Past Incidents and Procedures Context:\n{past_incidents}\n\n"
            f"Perform incident analysis, outline lessons learned, and define a prevention plan."
        )

        try:
            config = types.GenerateContentConfig(
                system_instruction="You are an HSE (Health, Safety, and Environment) Officer. Analyze the incident report to determine root causes, extract core lessons, and build a concrete prevention plan.",
                temperature=0.3,
                response_mime_type="application/json",
                response_schema=LessonsLearnedSchema
            )
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=config
            )
            return json.loads(response.text)
        except Exception as e:
            logger.error(f"Gemini API Error in Incident Analysis: {e}")
            return self._mock_lessons_learned(title, description)

    def extract_graph_elements(self, doc_text: str) -> Dict[str, Any]:
        """Extracts equipment nodes and causal relationships from operational documents."""
        if self.is_demo_mode():
            return self._mock_extracted_graph(doc_text)

        prompt = (
            f"Text to extract entities and relations from:\n{doc_text}\n\n"
            f"Identify all Equipment, Procedures, Incidents, or Documents mentioned in the text. "
            f"Create relationships between them (references, affects, caused_by, related_to)."
        )

        try:
            config = types.GenerateContentConfig(
                system_instruction="You are an Industrial Knowledge Graph architect. Extract equipment, standard procedures, incident events, and compliance documents as graph nodes, and extract their operational connections as edges.",
                temperature=0.2,
                response_mime_type="application/json",
                response_schema=KnowledgeGraphSchema
            )
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=config
            )
            return json.loads(response.text)
        except Exception as e:
            logger.error(f"Gemini API Error in Graph Extraction: {e}")
            return self._mock_extracted_graph(doc_text)

    # --- Fallback Dynamic Mocks for Offline/Demo Execution ---
    def _mock_rag_response(self, question: str, chunks: List[Dict[str, Any]], error: str = "") -> Dict[str, Any]:
        q_lower = question.lower()
        if not chunks:
            return {
                "answer": "No relevant document chunks found in the database. Please upload operational manuals, safety rules, or SOPs first.",
                "confidence_score": 0.0,
                "cited_chunk_indexes": []
            }
        
        # Select best chunk based on string keyword match
        best_idx = 0
        best_match = 0
        for i, c in enumerate(chunks):
            matches = sum(1 for w in q_lower.split() if w in c["content"].lower())
            if matches > best_match:
                best_match = matches
                best_idx = i
                
        doc_name = chunks[best_idx].get("filename", "Manual")
        snippet = chunks[best_idx].get("content", "")
        
        if "pump" in q_lower:
            ans = f"Based on {doc_name}, the Pump P101 starting sequence requires primary priming, ensuring suction valves are fully open, and starting the motor while throttling the discharge valve to 15% to build backpressure. Safety checklist OISD-115 must be signed off prior to power activation."
        elif "safety" in q_lower or "precaution" in q_lower:
            ans = f"According to standard procedures in {doc_name}, safety precautions require applying Lockout-Tagout (LOTO) protocols to the primary breaker, performing gas sniffer testing for flammable vapors, and wearing level-C chemical protective gear."
        elif "compressor" in q_lower:
            ans = f"As documented in {doc_name}, the compressor emergency shutdown procedure involves engaging the main trip switch, closing the inlet isolating valve immediately to avoid surge conditions, and opening the bypass blowdown valve to depressurize."
        else:
            ans = f"According to {doc_name}: \"{snippet[:180]}...\" This document states that industrial systems must align with safety codes and equipment guidelines."
            
        if error:
            ans = f"[Demo Mode Active - Gemini API Error: {error}]\n\n{ans}"
            
        return {
            "answer": ans,
            "confidence_score": 0.85 if best_match > 2 else 0.50,
            "cited_chunk_indexes": [best_idx]
        }

    def _mock_maintenance_analysis(self, title: str, findings: str) -> Dict[str, Any]:
        equip_id = "PUMP-P101"
        if "compressor" in title.lower() or "compressor" in findings.lower():
            equip_id = "COMPRESSOR-C202"
            
        return {
            "root_cause": f"The primary root cause of this {title} is bearing oil degradation due to localized overheating and high water content contamination (approx 0.08%). This caused accelerated abrasive wear on the shaft coupling, leading to the reported high vibration levels.",
            "recommendations": "1. Flush and replace lubricant with ISO VG 46 synthetic oil.\n2. Install an online dessicant breather on the oil reservoir.\n3. Re-align the shaft coupling using laser alignment tools to less than 0.02 mm tolerance."
        }

    def _mock_compliance_audit(self, doc_text: str) -> Dict[str, Any]:
        return {
            "overall_status": "Critical Violations" if "bypass safety" in doc_text.lower() else "Action Required",
            "findings": [
                {
                    "section": "Standard LOTO Isolation",
                    "requirement_status": "Compliant",
                    "findings": "The procedure specifies physical locking of main isolation valves, meeting primary safety criteria.",
                    "violations": None,
                    "recommendations": None
                },
                {
                    "section": "Gas Sniffer Verification",
                    "requirement_status": "Non-Compliant",
                    "findings": "The text suggests gas sniffer testing is optional unless smells are present. Under OISD-115, gas testing is mandatory for all cold/hot work.",
                    "violations": "OISD standard 115 Section 4.2: Mandatory gas testing of work area.",
                    "recommendations": "Modify step 4 to mandate gas testing and record readings on the permit sheet."
                }
            ]
        }

    def _mock_lessons_learned(self, title: str, description: str) -> Dict[str, Any]:
        return {
            "root_cause": "Arcing due to moisture buildup inside the junction box, which had degraded seals. Lack of preventive thermographic scans allowed the heat signature to go undetected.",
            "lessons_learned": "Environmental seals on outdoor terminal boxes must be verified quarterly. Operator pre-round lists did not include check-offs for seal integrity.",
            "prevention_plan": "1. Mandate thermography testing of all outdoor panel boxes twice a year.\n2. Standardize seal replacements during routine 2-year maintenance cycles."
        }

    def _mock_extracted_graph(self, doc_text: str) -> Dict[str, Any]:
        text_lower = doc_text.lower()
        nodes = [
            {"id": "DOC-CURR", "name": "Ingested Manual", "type": "Document", "description": "Currently uploaded document"}
        ]
        edges = []
        
        if "pump" in text_lower or "p101" in text_lower:
            nodes.append({"id": "PUMP-P101", "name": "Centrifugal Pump P101", "type": "Equipment", "description": "High-pressure fluid feed pump"})
            edges.append({"source": "DOC-CURR", "target": "PUMP-P101", "type": "references", "description": "Manual describes Pump P101"})
            
        if "compressor" in text_lower or "c202" in text_lower:
            nodes.append({"id": "COMPRESSOR-C202", "name": "Gas Compressor C202", "type": "Equipment", "description": "Reciprocating bypass compressor"})
            edges.append({"source": "DOC-CURR", "target": "COMPRESSOR-C202", "type": "references", "description": "Manual references Compressor C202"})
            
        if "loto" in text_lower or "lock" in text_lower:
            nodes.append({"id": "PROC-LOTO", "name": "LOTO Procedure", "type": "Procedure", "description": "Safety Lockout Tagout Procedure"})
            edges.append({"source": "PROC-LOTO", "target": "PUMP-P101", "type": "affects", "description": "LOTO isolates P101 electricity"})
            
        return {
            "nodes": nodes,
            "edges": edges
        }

# Global client instance
gemini_client = GeminiClient()
