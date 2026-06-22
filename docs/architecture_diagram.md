# INDUS BRAIN AI - Architecture Diagram

This document contains visual diagrams mapping out the core flows of the **INDUS BRAIN AI** system.

## 1. System Topology Overview (Decoupled Monolith)

This diagram shows how the frontend, backend, databases, and AI pipelines interact.

```mermaid
graph TD
    %% Clients
    User([Operator / Safety Officer]) <-->|HTTPS / WSS| FE[React + Vite + TS Frontend]
    
    %% API Gateway
    FE <-->|REST API + JWT Auth| BE[FastAPI Backend Engine]
    
    %% Backend internal routing
    subgraph FastAPI Backend Monolith [FastAPI Server]
        BE --> Auth[Auth Controller]
        BE --> DocAPI[Documents Controller]
        BE --> CopilotAPI[Copilot Chat Controller]
        BE --> ComplianceAPI[Compliance Auditor]
        BE --> MaintAPI[Reliability Agent]
        BE --> GraphAPI[Knowledge Graph Manager]
    end
    
    %% Data Persistence Layer
    subgraph Data Stores [Persistence Layer]
        SQLite[(SQLite DB)]
        FAISS[(FAISS Vector Store)]
    end
    
    %% Connections from endpoints to DBs
    Auth <-->|Read/Write Credentials| SQLite
    DocAPI <-->|Insert Metadata| SQLite
    DocAPI -->|Add Embeddings| FAISS
    
    %% Cognitive AI Integration
    subgraph AI Pipeline [AI Cognitive Layer]
        SentenceTransformers[Sentence-Transformers Local Model]
        Gemini[Gemini 2.5 Flash API]
    end
    
    %% Embedding and Vector connections
    DocAPI -->|Run Chunker| SentenceTransformers
    SentenceTransformers -->|384d Vectors| FAISS
    CopilotAPI -->|Retrieve Context Chunks| FAISS
    CopilotAPI <-->|Cross Reference Chunks| SQLite
    
    %% Gemini connections
    CopilotAPI <-->|System Instructions + Context Chunks| Gemini
    ComplianceAPI <-->|Audit Procedural text against Rules| Gemini
    MaintAPI <-->|Generate Failure Diagnoses| Gemini
    GraphAPI <-->|Extract Entity-Relations| Gemini
    
    %% SQLite updates by agents
    ComplianceAPI <-->|Save Audits| SQLite
    MaintAPI <-->|Save Logs & Graph Nodes| SQLite
    GraphAPI <-->|Query Nodes & Edges| SQLite
    
    classDef client fill:#1e3a8a,stroke:#3b82f6,stroke-width:2px,color:#fff;
    classDef server fill:#0f172a,stroke:#f97316,stroke-width:2px,color:#fff;
    classDef db fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#fff;
    classDef ai fill:#3b0764,stroke:#a855f7,stroke-width:2px,color:#fff;
    
    class FE client;
    class BE,Auth,DocAPI,CopilotAPI,ComplianceAPI,MaintAPI,GraphAPI server;
    class SQLite,FAISS db;
    class SentenceTransformers,Gemini ai;
```

---

## 2. Universal Document Ingestion Pipeline

This flowchart outlines the ingestion flow from raw files to SQLite and FAISS indexes.

```mermaid
flowchart TD
    Start([Upload PDF/TXT/DOCX]) --> Parse{File Extension Check}
    
    Parse -->|PDF| PDFParser[pypdf Text Extraction]
    Parse -->|DOCX| DOCXParser[python-docx Text Extraction]
    Parse -->|TXT| TXTParser[UTF-8 Text Extraction]
    
    PDFParser --> Chunker[Recursive Text Chunker]
    DOCXParser --> Chunker
    TXTParser --> Chunker
    
    Chunker --> Embedder[Generate SentenceTransformer Embeddings]
    
    Embedder --> FAISSAdd[Index Vectors in FAISS]
    Embedder --> SQLiteAdd[Save Chunks & FAISS index mapping in SQLite]
    
    FAISSAdd --> ExtractGraph[Gemini Entity/Relation Extraction]
    SQLiteAdd --> ExtractGraph
    
    ExtractGraph --> AddGraphNodes[Save Nodes & Edges in SQLite Graph Tables]
    AddGraphNodes --> Complete([Document Status: COMPLETED])
```

---

## 3. Conversational RAG Query Loop (Copilot Chat)

This diagram details the retrieval-augmented generation pipeline executed for user queries.

```mermaid
sequenceDiagram
    autonumber
    actor User as Operator / Engineer
    participant FE as Frontend Dashboard
    participant BE as FastAPI Copilot
    participant FAISS as FAISS Vector Store
    participant SQLite as SQLite Database
    participant Gemini as Gemini 2.5 Flash
    
    User->>FE: Ask question ("How should Pump P101 be started?")
    FE->>BE: POST /api/v1/copilot/chat { question }
    BE->>BE: Generate search query embedding
    BE->>FAISS: Perform cosine similarity search (k=5)
    FAISS-->>BE: Return matching Vector Index IDs
    BE->>SQLite: Query chunk text and document titles using Index IDs
    SQLite-->>BE: Return raw chunks, section offsets, and filenames
    BE->>BE: Assemble RAG prompt template (Question + Context Chunks)
    BE->>Gemini: Request structured JSON response (System Prompt + History)
    Note over Gemini: Evaluate question against context;<br/>Determine confidence & cited chunks
    Gemini-->>BE: Return structured JSON { answer, confidence, cited_chunk_indexes }
    BE->>BE: Format citations (link indexes to document names)
    BE-->>FE: Return ChatResponse { answer, citations, confidence_score }
    FE->>User: Render chatbot text, confidence meter, and clickable source citations
```
