# INDUS BRAIN AI - Pitch Presentation Deck (10 Slides)

This file contains the structured text, headers, and visual cues for the **INDUS BRAIN AI** pitch deck, tailored for judges at the **ET AI Hackathon 2026**.

---

## Slide 1: Cover / Landing
### INDUS BRAIN AI — Unified Industrial Knowledge Intelligence Platform
**Sub-title:** The Operational & Asset Brain for Enterprise Heavy Industry
* **Problem Statement Addressed:** PS8 — AI for Industrial Knowledge Intelligence
* **Presenter:** Lead Development Team
* **Hackathon:** ET AI Hackathon 2026
* **Visual Concept:** Deep slate dark background with a glowing amber/orange network graph visualization. Minimalist, premium, futuristic.

---

## Slide 2: The Core Problem
### Fragmented Documents & Siloed Operations
* **The Reality:** Industrial sites operate on massive, fragmented documentation: SOPs, OEM manuals, compliance guidelines, safety logs, and operator reports.
* **The Pain Points:**
  1. **Operational Downtime:** Maintenance engineers waste hours searching for procedures during critical machinery breakdowns.
  2. **Compliance Risks:** Safety procedures are audited manually, resulting in missed regulations and hazardous accidents.
  3. **Knowledge Erosion:** Senior engineers retire, taking vital tacit site knowledge with them.
* **Visual Concept:** Split screen. Left: A chaotic pile of paper folders, manuals, and reports. Right: Three bold metrics detailing cost impact ($22k/hr average downtime cost).

---

## Slide 3: The Solution
### INDUS BRAIN AI: A Unified Cognitive Brain
* We transform unstructured, siloed documents into a single, unified cognitive asset brain.
* **Three Pillars of the Platform:**
  1. **Universal Ingestor:** Parses PDFs, DOCX files, and TXT logs, generating semantic vectors for search.
  2. **Expert RAG Copilot:** High-precision chatbot citing exact pages and chunks, with semantic confidence metrics.
  3. **Reliability & Compliance Agent:** Automated root-cause diagnostics and regulatory audits (Factory Act, OISD) powered by Gemini 2.5 Flash.
* **Visual Concept:** A high-level flowchart showing raw documents flowing into "INDUS BRAIN" and outputting conversational guidance, audit compliance reports, and an interactive graph map.

---

## Slide 4: System Architecture
### Decoupled, Robust Monolith Architecture
* **Frontend:** React 19 + TypeScript + Vite + TailwindCSS. Configured as a SCADA-inspired cyber-panel (Dark Mode default).
* **Backend:** FastAPI (Python 3.12+) REST API. Modular, lightweight, high-throughput.
* **Databases:**
  * **SQLite:** Operational metadata, user credentials, audit findings, and graph topologies.
  * **FAISS (Local Vector Storage):** Fast vector search indexing.
* **Model Pipeline:** Sentence-Transformers (`all-MiniLM-L6-v2`) locally for 384d semantic vectors, and **Gemini 2.5 Flash** for LLM cognitive generation.
* **Visual Concept:** Architectural block diagram showing React Frontend in Vercel communicating with FastAPI Backend on AWS EC2, fetching from SQLite/FAISS, and querying Gemini.

---

## Slide 5: Universal Ingestion Pipeline
### From Fragmented Manuals to High-Precision Index
* **The Pipeline:**
  1. **Ingest & Extract:** Extract clean text from PDFs (pypdf), Word documents (python-docx), and raw text.
  2. **Recursive Chunking:** Splitting documents by boundaries (paragraphs, lines) with overlapping windows (1000 size, 200 overlap).
  3. **Local Vector Embeddings:** Converting text chunks into 384-dimensional dense vectors.
  4. **Dynamic Graph Construction:** Gemini extracts entities (Equipment names, SOPs) and relations directly from text during ingestion.
* **Visual Concept:** Horizontal chain-link pipeline visual: Upload ➔ Extract ➔ Chunk ➔ Embed ➔ Index.

---

## Slide 6: Expert RAG Copilot
### High-Precision Conversational Engineering
* Traditional LLMs hallucinate. **Indus Brain AI enforces strict context-grounded retrieval.**
* **Core Advantages:**
  * **Citations Panel:** Every answer lists the document filename and chunk number containing the source statement.
  * **Confidence Score:** Real-time percentage gauge reflecting how completely the retrieved document chunks match the user's inquiry.
  * **Conversational Context:** Keeps track of dialogue history to handle multi-step machinery troubleshoot scripts.
* **Visual Concept:** Mock-up screenshot of the Copilot interface highlighting a 95% Confidence rating and clickable document links.

---

## Slide 7: Compliance Center
### Automated Safety audits & Guardrails
* Safety guidelines are complex. The Compliance Agent acts as a 24/7 automated auditor.
* **How It Works:**
  1. Operator uploads a new procedure or SOP.
  2. Compliance Agent runs semantic vector lookups for relevant safety standard guidelines (e.g. OISD codes).
  3. Gemini Audits section-by-section, outputs status: **Compliant**, **Observation**, or **Non-Compliant** with recommendations.
* **Visual Concept:** Section card showing a warning banner: *"Non-Compliant: Gas sniffer testing missing before hot work. Violates OISD-115 Section 4.2."*

---

## Slide 8: Maintenance Intelligence
### Diagnostics, Root Cause & Preventive Logs
* Turn raw defect logs into structured preventive maintenance tasks.
* **Features:**
  * **Root Cause Generator:** Gemini correlates operator logs with manuals to diagnose issues (e.g. lubrication contamination).
  * **Actionable Checklists:** Recommends step-by-step remediation tasks.
  * **Similarity Matching:** SQL queries fetch historical repair logs of the same equipment to alert operators to recurring issues.
* **Visual Concept:** Double-card layout. Left: operator log input ("Pump overheating"). Right: generated analysis with orange and green status callouts.

---

## Slide 9: Industrial Knowledge Graph
### Visualizing Operational Dependencies
* Nodes represent real-world entities: Equipment (PUMP-P101), Documents (OISD-115), Procedures (SOP-STARTUP), and Incidents (OVERHEAT).
* Edges represent operational links: *references*, *affects*, *caused_by*, *related_to*.
* **Interactive SVG Panel:**
  * Draggable layout grouped in sections.
  * Animated flow dots representing dependency signals.
  * Side-panel details displaying adjacent links upon node click.
* **Visual Concept:** SVG graph screenshot showing Pump P101 in the center connected to an incident node in red and startup procedure in green.

---

## Slide 10: Business Value & Scalability
### Immediate ROI & Enterprise Integration Roadmap
* **Business ROI (Estimated):**
  * **35% reduction** in MTTR (Mean Time to Repair) for equipment anomalies.
  * **99.9% reduction** in safety guideline compliance oversight.
  * **15% decrease** in annual operational insurance premiums.
* **Scalability Roadmap:**
  1. **Phase 1 (Ingested):** Fragmented PDFs & RAG (Done).
  2. **Phase 2 (Near-Term):** Connect live IoT/SCADA sensor telemetry to feed real-time graph states.
  3. **Phase 3 (Enterprise):** AWS EC2 + RDS multi-region redundancy, hybrid vector database setup.
* **Visual Concept:** A nice multi-step project timeline leading to a bold "Enterprise Ready" seal.
