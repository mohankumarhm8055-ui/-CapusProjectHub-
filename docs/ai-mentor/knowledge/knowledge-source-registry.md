# CampusProjectHub — Knowledge Source Traceability Registry

This registry provides complete bidirectional traceability connecting every knowledge domain, functional module, and architectural claim to its underlying source code files, schemas, and REST endpoints.

---

## 1. Traceability Matrix

| Functional Capability | Frontend Implementation | Backend Implementation | Data Model / Schema | Test Suite |
| :--- | :--- | :--- | :--- | :--- |
| **Project Identity & Landing** | `src/sections/HeroSection.tsx`, `src/components/BrandLogo.tsx`, `src/sections/WhyChooseSection.tsx` | `backend/src/app.ts`, `backend/src/server.ts` | Static Platform Metadata | Frontend Build & CDP |
| **Authentication & Registration**| `src/pages/SignUpPage.tsx`, `src/pages/SignInPage.tsx`, `src/components/auth/AuthLayout.tsx` | `backend/src/middleware/auth.middleware.ts` | JWT Payload & Roles (`student`, `faculty`) | Build & Navigation Tests |
| **Explore Projects & Dossier** | `src/pages/ExploreProjectsPage.tsx`, `src/pages/ProjectDetailsPage.tsx`, `src/components/ExploreProjectCard.tsx` | `backend/src/modules/repository/repository.routes.ts`, `backend/src/modules/repository/repository.controller.ts` | `IProject`, `MongoProjectModel`, `InMemoryProjectStore` (`project.model.ts`) | `repository.test.ts` (Tests 1, 2) |
| **Repository Intelligence & Search**| `src/services/aiMentorApiService.ts` | `backend/src/modules/repository/repository.search.service.ts` | `IProjectSearchResult`, `IComparisonMatch` (`project.model.ts`) | `repository.test.ts` (Tests 3, 4) |
| **Admin Archive Ingestion** | N/A (Backend Admin Endpoint) | `backend/src/modules/repository/repository.ingestion.service.ts` | `AuditLog` (`auditLog.model.ts`) | `repository.test.ts` (Tests 5, 6) |
| **AI Project Mentor Workspace** | `src/pages/AIMentorPage.tsx`, `src/components/ai-mentor/ChatConversation.tsx`, `MessageComposer.tsx` | `backend/src/modules/ai/ai.routes.ts`, `backend/src/modules/ai/ai.service.ts`, `backend/src/modules/ai/ai.provider.ts` | `IConversation`, `IMessage` (`conversation.model.ts`, `message.model.ts`) | `ai.test.ts` (8/8 Tests) |
| **7D Feature Evaluation Engine**| `src/components/ai-mentor/FeatureEvaluationCards.tsx`, `ProjectAssessmentModal.tsx` | `backend/src/modules/ai/feature-evaluation/evaluation.engine.ts`, `context.engine.ts` | `IEvaluationRecord`, `MongoEvaluationModel`, `InMemoryEvaluationStore` | `evaluation.test.ts` (Tests 1, 2, 3, 4) |
| **Student Decisions & Final Scope**| `src/components/ai-mentor/FinalScopeModal.tsx` | `backend/src/modules/ai/feature-evaluation/decision.service.ts`, `scope.generator.ts` | `IStudentDecision`, `IFinalScope` (`evaluation.model.ts`) | `evaluation.test.ts` (Tests 5, 6, 7) |
| **Academic Proposal Generator** | `src/pages/ProposalEditorPage.tsx` | `backend/src/modules/proposals/proposal.engine.ts`, `backend/src/modules/proposals/proposal.controller.ts` | `IProposal`, `MongoProposalModel`, `InMemoryProposalStore` (`proposal.model.ts`) | `proposal.test.ts` (Tests 1, 2, 3, 4, 7) |
| **Readiness Advisory Assessment**| `src/pages/ProposalEditorPage.tsx` (Readiness Tab) | `backend/src/modules/proposals/proposal.readiness.ts` | `IReadinessAuditResult` (`proposal.model.ts`) | `proposal.test.ts` (Test 6) |
| **DOCX & PDF Document Export** | `src/pages/ProposalEditorPage.tsx` (Download Buttons) | `backend/src/modules/proposals/proposal.export.service.ts` | OpenXML `docx` & PDFKit Buffer Streams | `proposal.test.ts` (Tests 8, 9) |
| **Proposal Versioning & Restore**| `src/pages/ProposalEditorPage.tsx` (Versions Tab) | `backend/src/modules/proposals/proposal.controller.ts` | `IProposalVersionSnapshot` (`proposal.model.ts`) | `proposal.test.ts` (Test 5) |
| **Faculty Review Submissions** | `src/pages/ProposalEditorPage.tsx` (Review Tab), `src/components/TeamModal.tsx` | `backend/src/modules/proposals/proposal.controller.ts`, `backend/src/modules/repository/repository.submission.service.ts` | `IFacultyReviewRecord` (`proposal.model.ts`) | `proposal.test.ts` (Test 10), `repository.test.ts` (Test 7) |
| **Security & Privacy Masking** | `src/services/aiMentorApiService.ts`, `src/services/aiEvaluationApiService.ts` | `backend/src/middleware/auth.middleware.ts`, `backend/src/middleware/rateLimit.ts` | `teamMembers.email` and `phone` data masking | `repository.test.ts` (Test 8), `evaluation.test.ts` (Test 8), `proposal.test.ts` (Test 11) |

---

## 2. API Endpoint Registry

```text
# Repository Intelligence Endpoints
GET    /api/repository/search              - Multi-filter catalog search with privacy masking
GET    /api/repository/projects/:id        - Full project dossier lookup
POST   /api/repository/compare             - Algorithmic similarity comparison against historical projects
POST   /api/repository/admin/import        - Admin bulk historical benchmark ingestion
POST   /api/repository/student/submit      - Student project submission lifecycle

# AI Project Mentor Endpoints
GET    /api/ai/status                      - System identity and provider capabilities
POST   /api/ai/conversations               - Create conversation thread
GET    /api/ai/conversations               - List user conversation threads
POST   /api/ai/conversations/:id/messages  - Send message (supports SSE real-time token streaming)

# 7-Dimensional Feature Evaluation Endpoints
POST   /api/ai/evaluations                 - Run 7-dimensional feasibility assessment
GET    /api/ai/evaluations/:id             - Fetch evaluation record and decisions
PATCH  /api/ai/evaluations/:id/decisions   - Record student decision (Accept, Reject, Modify)
POST   /api/ai/evaluations/:id/reassess    - Scope reassessment with decision persistence
POST   /api/ai/evaluations/:id/generate-scope - Compile final project scope and milestones
PATCH  /api/ai/evaluations/:id/scope       - In-place editing of final project scope

# Academic Proposal Generator Endpoints
POST   /api/proposals/generate             - Compile 15-section IEEE 830 proposal from scope
GET    /api/proposals                      - List student academic proposals
GET    /api/proposals/:id                  - Fetch proposal details and active sections
PATCH  /api/proposals/:id/sections/:secId  - In-place section editing with autosave
POST   /api/proposals/:id/sections/:secId/improve - Single-section AI refinement preview
POST   /api/proposals/:id/versions         - Create immutable version snapshot
GET    /api/proposals/:id/versions         - Retrieve version revision chain
POST   /api/proposals/:id/restore          - Restore past version as new revision
POST   /api/proposals/:id/readiness        - 9-criterion transparent quality audit
GET    /api/proposals/:id/export           - Binary OpenXML DOCX / PDF download
POST   /api/proposals/:id/submit           - Formal faculty review submission
```
