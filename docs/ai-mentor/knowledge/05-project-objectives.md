# 05 — Project Objectives & Rubric Alignment

## 1. Primary Engineering Objectives

The core objectives of CampusProjectHub are defined around measurable academic criteria:

1. **Establish a Canonical Academic Repository:**
   Design and implement a relational/document data model (33+ fields) indexing historical college capstones with department tags, academic years, verified documents, and student privacy masking.

2. **Implement Dual-Stage Algorithmic Similarity Intelligence:**
   Develop an algorithmic comparison engine that calculates token/character Jaccard containment and technology overlap, achieving distinct classification between `IDENTICAL_TITLE_EXACT`, `SIMILAR_PROJECT_CONCEPT`, `RELATED_TECHNOLOGY_ONLY`, and `DISTINCT_PROJECT_IDEA`.

3. **Deploy a 7-Dimensional Pedagogical Feature Evaluation Engine:**
   Build an honest evaluation matrix auditing proposed features across Problem Relevance, User Value, Originality, Technical Feasibility, Complexity, Resource Requirements, and Time Suitability, outputting actionable feasibility ratings (`FEASIBLE_INITIAL`, `FEASIBLE_REDUCED_SCOPE`, `REQUIRES_RESOURCES_OR_TIME`, `NOT_FEASIBLE`).

4. **Automate IEEE 830-Compliant Proposal Generation:**
   Construct an editable proposal compiler that translates finalized scope into 15 standard academic sections with in-place AI refinement, immutable version history, and real OpenXML DOCX and PDFKit binary exports.

5. **Provide Secure, Consent-Based Senior-Junior Networking:**
   Enable current students to inspect past project architectures and request guidance while enforcing zero-leakage contact masking of phone numbers and email addresses.

6. **Standardize Faculty Review and Institutional Compliance:**
   Implement a strict state-machine approval pipeline (`DRAFT` ➔ `SUBMITTED` ➔ `CHANGES_REQUESTED` ➔ `APPROVED`) with line-item review comments and historical revision preservation.

---

## 2. Alignment with University Capstone Evaluation Rubrics

CampusProjectHub is structured to satisfy typical autonomous university and VTU engineering capstone evaluation criteria:

| Evaluation Rubric Criterion | Weightage | CampusProjectHub Feature Alignment |
| :--- | :---: | :--- |
| **Literature Survey & Novelty** | 15% | Repository Search & Similarity Intelligence prove historical gap analysis and novelty over past batches. |
| **Problem Definition & Scope** | 15% | 7-Dimensional Feasibility Audit prevents unfeasible scope creep; binds scope to 12-week semester. |
| **Methodology & Architecture** | 25% | 3-tier modular architecture, RESTful API design, token streaming, and dual-mode repository persistence. |
| **Implementation & Rigor** | 25% | Full-stack TypeScript implementation (React 19 + Node/Express + MongoDB) with zero third-party UI templates. |
| **Documentation & Viva Defense** | 20% | Automated IEEE 830 DOCX/PDF export with standard references; AI Mentor viva defense question prep. |

---

## 3. Phased Implementation Milestones

- **Phase 1: Foundation & Data Architecture (Weeks 1–4)**
  - Canonical Project Schema & MongoDB connection with in-memory fallback.
  - Student authentication, landing page, and Explore Projects platform.
  - Seeding verified historical department benchmarks.

- **Phase 2: Intelligence Engine & Core Workflows (Weeks 5–9)**
  - Dedicated AI Project Mentor workspace (`/ai-mentor`) with SSE streaming.
  - Dual-stage similarity matching and privacy-masked contact display.
  - 7-Dimensional Feature Evaluation Matrix with student Accept/Reject/Modify controls.

- **Phase 3: Proposal Generation, Faculty Review & Defense (Weeks 10–12)**
  - Dedicated Academic Proposal Editor (`/ai-mentor/proposals/:id`).
  - Valid binary OpenXML `.docx` and `.pdf` export engines.
  - Faculty submission and review tracking pipeline.

---

## 4. Current Implementation Status
- **Status:** `Fully Implemented & Verified` (All 6 primary objectives satisfied in codebase and tested via 37 automated tests).
