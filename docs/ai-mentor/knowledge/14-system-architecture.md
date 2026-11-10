# 14 — System Architecture

CampusProjectHub is architected as a modular, three-tier client-server system designed for high availability, zero-downtime offline fallback, and real-time streaming communication.

```mermaid
flowchart TD
    subgraph Client Layer (Frontend)
        UI1["React 19 + TypeScript (SPA)"]
        UI2["Tailwind CSS v4 + Framer Motion"]
        UI3["React Router v7 (Client Routing)"]
        UI4["SSE Stream Receiver (EventSource/Fetch API)"]
    end

    subgraph Server Layer (Backend - Express.js)
        API["Express 4.21 HTTP / SSE Server (Port 5000)"]
        MW["Middleware: CORS, JWT Auth, Rate Limiting, Zod Validation"]
        
        subgraph Domain Modules
            M_AI["AI Mentor & Provider Adapter"]
            M_REPO["Repository Intelligence & Similarity Engine"]
            M_EVAL["7D Feature Evaluation Engine"]
            M_PROP["Academic Proposal & Export Service"]
        end
    end

    subgraph Data Persistence Layer
        DB["MongoDB (campusprojecthub)"]
        MEM["Concurrent In-Memory Fallback Stores"]
    end

    UI1 -->|REST API Requests| API
    UI4 -->|Server-Sent Events| API
    API --> MW
    MW --> M_AI
    MW --> M_REPO
    MW --> M_EVAL
    MW --> M_PROP
    M_REPO <--> DB
    M_REPO <--> MEM
    M_EVAL <--> DB
    M_EVAL <--> MEM
    M_PROP <--> DB
    M_PROP <--> MEM
```

---

## 1. Presentation Tier (Frontend)
- **Framework & Language:** React 19 and TypeScript 5.7 running on Vite 8 bundler.
- **Styling Architecture:** Tailwind CSS v4 with bespoke academic tokens (Deep Slate `#0F172A`, Vivid Indigo `#6658FF`, Emerald `#10B981`).
- **Iconography & Animation:** Lucide React (v1.70.0) with smooth CSS transforms and Framer Motion micro-interactions.
- **State & Communication:** React Hooks with custom RESTful service abstractions (`aiMentorApiService`, `aiEvaluationApiService`, `aiProposalApiService`).

---

## 2. Application Tier (Backend)
- **Runtime Environment:** Node.js (LTS v22).
- **Web Framework:** Express 4.21 with strict route modularity:
  - `/api/ai/*`: Conversations, streaming mentor responses, identity status.
  - `/api/repository/*`: Benchmark search, title exact matching, similarity comparisons, admin bulk imports.
  - `/api/ai/evaluations/*`: 7-dimensional feasibility assessments, student decision recording, reassessment persistence.
  - `/api/proposals/*`: 15-section proposal generation, single-section AI refinement, versioning, DOCX/PDF export, faculty submissions.
- **Input Validation:** Zod (v3.24) runtime schema validation on all incoming request bodies and parameters.
- **Streaming Pipeline:** HTTP Server-Sent Events (SSE) with `Transfer-Encoding: chunked` and connection keep-alive.

---

## 3. Data Persistence Tier
- **Primary Database:** MongoDB 7.0/8.0 connected via Mongoose ODM 8.9 (`mongodb://localhost:27017/campusprojecthub`).
- **Collections:**
  - `projects`: Canonical 33-field project records with department and slug indexes.
  - `conversations` & `messages`: Thread histories and token tracking.
  - `feature_evaluations`: Constraints, 7D scores, student decisions, and final scopes.
  - `academic_proposals`: 15-section documents, template metadata, revision versions, and faculty submissions.
  - `audit_logs`: Institutional verification and bulk import records.
- **Dual-Mode Fallback:** Every repository incorporates an in-memory Map store that seamlessly activates during test runner execution, sandboxed tasks, or database connection interruptions.

---

## 4. Document Export Subsystem
- **OpenXML Engine (`docx`):** Programmatically constructs Word documents with hierarchical HeadingLevels, custom 1.15 line pitch, paragraph spacing, and dynamic footer page numbers.
- **PDFKit Engine (`pdfkit`):** Direct stream-to-buffer binary generator with `bufferPages: true` for exact `Page X of Y` footers, A4 margins, and justified academic typography.
