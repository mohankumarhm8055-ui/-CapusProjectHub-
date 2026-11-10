# 06 — The Sixteen Functional Modules

CampusProjectHub is structured into 16 distinct functional modules spanning student workflows, faculty governance, administrative curation, and artificial intelligence mentorship.

---

## Module 1: Student Project Management
- **Purpose:** Centralized hub for student capstone execution.
- **Target Users:** Current undergraduate and postgraduate student teams.
- **Problem Solved:** Fragmented spreadsheets, lost deadlines, and uncoordinated task tracking.
- **Main Features:** Project title, overview, semester milestone tracking, stage-gated progression, team assignment.
- **Inputs & Outputs:** Inputs: Project metadata, team roles. Outputs: Live project dashboard, progress state.
- **Status:** `Implemented` (UI components: `TeamWorkspacePreview.tsx`, `TeamModal.tsx`; Backend: `project.model.ts`).

## Module 2: Task and Milestone Management
- **Purpose:** Organize semester deliverables into time-bound milestones.
- **Target Users:** Student team members and faculty mentors.
- **Problem Solved:** Late delivery of critical semester artifacts before internal reviews.
- **Main Features:** Phase 1/Phase 2 milestone checklists, due dates, completion indicators.
- **Status:** `Implemented` (Embedded in `FinalScopeModal.tsx`, `ProposalEditorPage.tsx`, and project schema).

## Module 3: Team Collaboration
- **Purpose:** Coordinate roles and accountability among student teammates.
- **Target Users:** Student team leaders and collaborators.
- **Problem Solved:** Free-rider problem and ambiguous task allocation.
- **Main Features:** Role assignment (Frontend, Backend, Research, Documentation), responsibility logs.
- **Status:** `Implemented` (`TeamCollaborationSection.tsx`, `TeamModal.tsx`, `project.model.ts`).

## Module 4: Explore Projects
- **Purpose:** Public and student search catalog for historical college projects.
- **Target Users:** All students, faculty, and visiting evaluators.
- **Problem Solved:** Project discovery gap; unawareness of past departmental achievements.
- **Main Features:** Multi-filter catalog by Department, Technology, Category, Academic Year, and Search query.
- **Status:** `Implemented` (`ExploreProjectsPage.tsx`, `ExploreProjectCard.tsx`, `repository.search.service.ts`).

## Module 5: Individual Project Details
- **Purpose:** In-depth dossier of a specific completed or in-progress capstone.
- **Target Users:** Students researching prior art, faculty evaluators.
- **Problem Solved:** Inaccessible project reports, missing code links, and lost architectures.
- **Main Features:** Abstract, problem statement, architecture diagrams, screenshots lightbox, GitHub repo link, live demo URL, learning outcomes, challenges, faculty guide attribution.
- **Status:** `Implemented` (`ProjectDetailsPage.tsx`, `ScreenshotLightbox.tsx`, `RelatedProjectsCarousel.tsx`).

## Module 6: Academic Project Repository
- **Purpose:** Canonical departmental data store of verified capstones.
- **Target Users:** Department administrators, faculty guides, university archive committees.
- **Problem Solved:** Physical project books gathering dust in storage rooms.
- **Main Features:** 33+ field schema, verification flags (`VERIFIED_HISTORICAL`, `FACULTY_APPROVED`, `PENDING_VERIFICATION`), document attachments, privacy masking.
- **Status:** `Implemented` (`project.model.ts`, `repository.routes.ts`, `repository.seeder.ts`).

## Module 7: Senior-Junior Connection
- **Purpose:** Knowledge transfer and mentorship across academic cohorts.
- **Target Users:** Junior project innovators and senior alumni authors.
- **Problem Solved:** Senior-junior communication barrier after graduation.
- **Main Features:** Public project artifacts, consent-based in-platform mentorship requests, zero-leakage contact masking (phone numbers and emails concealed by default).
- **Status:** `Implemented` (Data masking in `repository.search.service.ts`, UI contact triggers in `ProjectDetailsPage.tsx`).

## Module 8: AI Project Mentor Workspace
- **Purpose:** Dedicated full-page technical advisor for student innovators.
- **Target Users:** Students conceptualizing or defending capstones.
- **Problem Solved:** Lack of personalized, honest guidance during early project phases.
- **Main Features:** Route `/ai-mentor`, streaming Server-Sent Events (SSE), multilingual support (English, Kannada, Hindi), viva examiner question generation, repository context injection.
- **Status:** `Implemented` (`AIMentorPage.tsx`, `ai.service.ts`, `ai.provider.ts`).

## Module 9: Project Similarity Analysis
- **Purpose:** Automated overlap detection against historical departmental records.
- **Target Users:** Students submitting synopses; faculty review committees.
- **Problem Solved:** Silent duplication of previous years' projects.
- **Main Features:** Character/token n-gram Jaccard matching, technology vs concept disambiguation (*Similarity != Plagiarism*), novelty critique.
- **Status:** `Implemented` (`repository.search.service.ts`, `POST /api/repository/compare`).

## Module 10: AI Feature Evaluation Engine
- **Purpose:** 7-dimensional feasibility auditing to eliminate semester scope creep.
- **Target Users:** Student project teams.
- **Problem Solved:** Unrealistic scope proposals resulting in unfinished semester deliverables.
- **Main Features:** 7 dimensions evaluation, 4 classifications (`ESSENTIAL`, `RECOMMENDED`, `OPTIONAL`, `UNNECESSARY`), holistic feasibility ratings.
- **Status:** `Implemented` (`evaluation.engine.ts`, `FeatureEvaluationCards.tsx`, `evaluation.routes.ts`).

## Module 11: Project Scope Finalization & Student Decisions
- **Purpose:** Student agency in accepting, rejecting, or modifying AI-reviewed features.
- **Target Users:** Student teams finalizing capstone scope.
- **Problem Solved:** Black-box AI systems imposing unwanted features on students.
- **Main Features:** Accept/Reject/Modify controls, automatic trade-off generation for rejected features, decision persistence across reassessment, final scope generator.
- **Status:** `Implemented` (`decision.service.ts`, `scope.generator.ts`, `FinalScopeModal.tsx`).

## Module 12: Academic Proposal Generator
- **Purpose:** Synthesis of finalized scope into standard IEEE 830 proposals.
- **Target Users:** Students preparing capstone synopses and reports.
- **Problem Solved:** Days wasted on manual Word formatting and rejected proposals.
- **Main Features:** Dedicated editor `/ai-mentor/proposals/:id`, 15 canonical sections, in-place AI refinement, immutable version history, real DOCX & PDF exports.
- **Status:** `Implemented` (`proposal.engine.ts`, `ProposalEditorPage.tsx`, `proposal.export.service.ts`).

## Module 13: College Template Management
- **Purpose:** Enforce institutional typography, margin, and section standards.
- **Target Users:** College departments and universities.
- **Problem Solved:** University formatting rejections due to conflicting guidelines.
- **Main Features:** Template metadata (VTU / Autonomous Standard Engineering Capstone Template), mandatory vs optional section ordering.
- **Status:** `Partially Implemented` (Default VTU template operational; visual template builder and custom upload engine planned for Task 6).

## Module 14: Faculty Project Guidance
- **Purpose:** Empower faculty guides to supervise and mentor student teams.
- **Target Users:** Faculty guides and project coordinators.
- **Problem Solved:** Guide isolation and lack of real-time project insight.
- **Main Features:** Guide assignment, review notes logging, rubric checks.
- **Status:** `Implemented` (`proposal.controller.ts` submission endpoints, `repository.submission.service.ts`).

## Module 15: Submission and Approval Workflow
- **Purpose:** Formal stage-gated institutional approval pipeline.
- **Target Users:** Students and departmental review panels.
- **Problem Solved:** Unaudited verbal project approvals and lost submission records.
- **Main Features:** Strict state transitions (`DRAFT` ➔ `SUBMITTED` ➔ `CHANGES_REQUESTED` ➔ `APPROVED`), line-item faculty critique history, resubmissions.
- **Status:** `Implemented` (`proposal.model.ts`, `repository.submission.service.ts`).

## Module 16: Admin Management
- **Purpose:** Institutional oversight, bulk imports, and system administration.
- **Target Users:** Department HoDs and system administrators.
- **Problem Solved:** Inability to bulk-ingest historical projects into the digital archive.
- **Main Features:** Historical archive bulk ingestion with duplicate title validation, user role management, system health auditing.
- **Status:** `Implemented` (`repository.ingestion.service.ts`, `auditLog.model.ts`).
