# INDUS BRAIN AI - Demo Video Walkthrough Script (3-4 Minutes)

This script provides a step-by-step guide for recording the demonstration video of the **INDUS BRAIN AI** platform.

---

## Part 1: Platform Introduction (0:00 - 0:30)
* **Visual:** Browser showing the **INDUS BRAIN AI** corporate login portal with the pulsing orange terminal indicator.
* **Action:** Type username `operator_101` and password, and click **Establish Secure Connection**. The system transitions to the Executive Telemetry dashboard.
* **Audio Script:**
  > "Welcome to Indus Brain AI, a unified industrial knowledge intelligence platform designed to solve the fragmentation of unstructured documentation in heavy industry. Today, we'll walk through our deployment prototype. We start by logging into our secure operator portal, which authenticates us via JWT tokens and grants access to the dashboard."

---

## Part 2: Executive Telemetry & SCADA feeds (0:30 - 1:00)
* **Visual:** The dashboard page. Show the metrics cards (Total Documents, FAISS Chunks, Knowledge Nodes, Compliance Breaches) and scroll down to show the Mock SCADA Telemetry feed (PUMP-P101 showing bearing temperature alerts).
* **Action:** Hover over the SCADA feed. Hover over the System Diagnostics indicators showing FastAPI and FAISS status as operational.
* **Audio Script:**
  > "Once logged in, the operator is greeted by our Executive Telemetry dashboard. Here, we see real-time metrics pulled from our SQLite databanks: the total documents ingested, indexed FAISS vector slices, and active compliance warnings. Below, we integrate a simulated SCADA telemetry feed, highlighting that Pump P101 is experiencing high bearing temperatures, which warrants further procedural research."

---

## Part 3: Universal Ingestion Pipeline (1:00 - 1:40)
* **Visual:** Click on the **UNIVERSAL INGESTION** tab in the sidebar. Show the drag-and-drop file uploader.
* **Action:** Click "Browse Files", select a sample technical guide (e.g. `pump_operations_manual.txt` or similar doc), and submit it. Show the status badge starting at **PROCESSING** and changing to **COMPLETED** after a background task finishes.
* **Audio Script:**
  > "Let's ingest new documentation to expand our brain's capability. In the Universal Ingestion Portal, operators can upload PDF manuals, DOCX reports, or TXT guides. When a file is uploaded, a background task immediately extracts its text, splits it using a recursive chunker, generates dense semantic embeddings using a local SentenceTransformer model, and indexes the vectors in our FAISS vector store. Concurrently, Gemini 2.5 Flash analyzes the text to auto-extract machinery entities and adjacent relationship edges to populate our Knowledge Graph."

---

## Part 4: Expert Knowledge Copilot (1:40 - 2:20)
* **Visual:** Click on **EXPERT COPILOT** tab in the sidebar. Show the terminal chat layout.
* **Action:** Click on the suggested query button: *"How should Pump P101 be started?"* The chat loads, shows a typing indicator, and returns the response. Highlight the RAG confidence score meter (95%) and the clickable cited chunks below.
* **Audio Script:**
  > "Now, let's consult the expert brain. In the Expert Copilot, we have a RAG-driven chat interface powered by Gemini 2.5 Flash. We query: 'How should Pump P101 be started?'. The engine embeddings are generated, FAISS retrieves the top 5 matching text slices, and Gemini synthesizes an answer grounded strictly in our uploaded manuals. Notice the 95% Confidence rating, the lists of retrieved source manuals, and the precise chunk citations detailing exactly where this sequence was cited from."

---

## Part 5: Compliance Center Audit (2:20 - 3:00)
* **Visual:** Click on **COMPLIANCE AUDITOR** tab.
* **Action:** Select the newly uploaded procedure from the dropdown menu and click **Execute Audit**. The audit results load. Point to the red **CRITICAL VIOLATIONS** status banner, and scroll through the cards showing specific OISD code violations and recommendations.
* **Audio Script:**
  > "Operational safety is paramount. In our Compliance Auditor Center, we can audit active plant procedures against strict regulatory guidelines like the Oil Industry Safety Directorate. We select our uploaded startup sequence and run the audit. The engine flags a 'Critical Violation' in Section 4: LOTO and Gas Testing protocols are marked optional, which violates mandatory OISD safety standard 115. Actionable recommendations are immediately generated to fix the SOP before operational permits are issued."

---

## Part 6: Maintenance Logs & Interactive Knowledge Graph (3:00 - 3:45)
* **Visual:** Click on **RELIABILITY AGENT** tab. Submit a defect log for Pump P101 ("Pump bearing overheated, slight whining sound"). Show the generated root cause. Next, click on the **KNOWLEDGE GRAPH** tab. Show the interactive layered SVG graph with curved lines and animated flowing dashes.
* **Action:** Drag a couple of nodes around. Click on the node labeled `PUMP-P101` and show the side-panel detailing its type, description, and outgoing/incoming relationships (e.g. references from startup SOP, affects relations).
* **Audio Script:**
  > "In the Reliability console, operators can log anomalies. Submitting our findings for Pump P101 triggers Gemini to diagnose bearing oil contamination as the root cause, and logs this record into the database. Finally, we navigate to the Industrial Knowledge Graph. Here, we render a draggable, interactive topology of our operations brain. We can see how our manuals, procedures, safety standards, and logged maintenance incidents are related. Clicking on Pump P101 displays its operational context, linking its incident logs directly back to compliance standards."

---

## Part 7: Settings & Conclusion (3:45 - 4:00)
* **Visual:** Click on **SYSTEM SETTINGS**. Run a diagnostic self-test showing PASS on backend and database checks. Close with the dashboard screen.
* **Audio Script:**
  > "Under settings, operators can run diagnostic self-tests and seed sample data grids. Indus Brain AI provides heavy industry with a scalable, production-ready Operations Brain that mitigates breakdown downtime and enforces absolute regulatory safety. Thank you."
