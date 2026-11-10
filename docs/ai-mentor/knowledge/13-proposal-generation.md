# 13 — Academic Proposal Generator & Dedicated Editor

The **Academic Proposal Generator** translates student decisions and finalized project scope into formal IEEE 830-compliant academic proposals in a dedicated editor at `/ai-mentor/proposals/:proposalId`.

---

## 1. The 15 Standard Proposal Sections

The generator compiles 15 canonical sections based on university capstone standards:

1. **Project Title:** Formal engineering title specification.
2. **Abstract:** Comprehensive academic synopsis outlining problem, method, and key deliverables.
3. **Introduction:** Context within engineering education and departmental goals.
4. **Problem Statement:** Direct mapping from finalized scope statement.
5. **Existing System:** Critical analysis of current manual paper and spreadsheet mechanisms.
6. **Proposed System:** Comprehensive overview of CampusProjectHub's 5 core pillars.
7. **Objectives:** Numbered engineering targets and deliverable milestones.
8. **Scope of the Project:** Delineation between in-scope semester features and out-of-scope deferred items.
9. **Proposed Features:** Grouped into Essential Capabilities, Accepted Enhancements, and Excluded Features with Defense Rationales.
10. **System Architecture:** 3-tier client-server structure and component interactions.
11. **Technology Stack:** Frontend (React 19, TypeScript), Backend (Node, Express, Zod), Database (MongoDB), and Document Engines.
12. **Methodology:** 3-phase Agile sprint methodology with testing and verification procedures.
13. **Expected Outcomes:** Measurable deliverables (zero duplication, validated proposals, faculty sign-off).
14. **Timeline and Milestones:** Phased 12-week roadmap breakdown.
15. **References:** Standard academic citations (IEEE 830-1998, Pressman Software Engineering, Jaccard Index 1912, Fielding REST 2000).

---

## 2. Dedicated 3-Panel Proposal Editor Workspace

- **Left Panel:** 15-section list with completion icons, word counts, and student manual edit tags.
- **Main Editor:** Large canvas with autosave indicators, reading time stats, and section-level AI action toolbar:
  - `Clarity`: Enhances passive voice and academic vocabulary.
  - `Grammar`: Eliminates typographical and syntactic errors.
  - `Technical Rigor`: Strengthens architecture layers and interface definitions.
  - `Shorten`: Condenses word count by ~25%.
  - `Expand`: Elaborates with formal IEEE 830 context.
- **Proposed AI Revision Preview Card:** Shows side-by-side or above-canvas diff with rationale, delta word counts, and `Accept Revision` / `Discard` controls.
- **Right Panel:** Readiness Advisory audit, Version History chain, and Faculty Submission panel.
- **Document Preview Mode:** Instant toggle to clean publication-ready paper preview.

---

## 3. Nine-Criterion Advisory Readiness Assessment

The engine audits 9 transparent criteria (`PASS` / `WARN` / `FAIL`):
1. **Problem Clarity:** Operational friction conveyed clearly.
2. **Objective Alignment:** Concrete numbered deliverables.
3. **Scope Consistency:** Verifies no rejected features (e.g. Voice WebRTC) are listed as active.
4. **Feature Completeness:** Clear separation of core and enhancement tiers.
5. **Technical Feasibility:** Undergraduate viability of tech stack.
6. **Architecture Consistency:** Clear 3-tier presentation, application, and data layers.
7. **Methodology Completeness:** Phased sprint milestones and verification tests.
8. **Reference Validity:** Standard peer-reviewed and engineering citations.
9. **Required Sections:** All mandatory template sections populated.

**Advisory Rating Output:** `READY_FOR_FACULTY_REVIEW`, `ALMOST_READY`, or `NEEDS_IMPROVEMENT`.

---

## 4. Valid Binary Document Export (DOCX & PDF)
- **DOCX Export:** Generates genuine OpenXML `.docx` files validated against the PK Zip header (`[0x50, 0x4B, 0x03, 0x04]`). Includes cover metadata, 1.15 line spacing, 1-inch margins, bullet lists, and footer page numbers.
- **PDF Export:** Generates standard `.pdf` files validated against the `%PDF-` header. Features page buffering, justified typography, and dynamic `Page X of Y` footers.
