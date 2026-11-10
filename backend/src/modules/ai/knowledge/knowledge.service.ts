import fs from 'fs'
import path from 'path'

export interface IKnowledgeSection {
  id: string
  title: string
  category: string
  summary: string
  content?: string
}

export class KnowledgeService {
  private docsDir: string

  constructor(customDocsDir?: string) {
    this.docsDir = customDocsDir || path.resolve(process.cwd(), '../docs/ai-mentor/knowledge')
    if (!fs.existsSync(this.docsDir)) {
      // Fallback relative to backend folder if running inside backend/
      const directPath = path.resolve(process.cwd(), 'docs/ai-mentor/knowledge')
      if (fs.existsSync(directPath)) {
        this.docsDir = directPath
      }
    }
  }

  /**
   * Reads a specific markdown knowledge document
   */
  readKnowledgeDoc(docFilename: string): string | null {
    try {
      let targetFile = docFilename
      // Match by ID if applicable
      const docs = this.listKnowledgeDocs()
      const matchById = docs.find((d) => d.id === docFilename || d.filename === docFilename)
      if (matchById) {
        targetFile = matchById.filename
      } else if (!targetFile.endsWith('.md')) {
        targetFile = `${targetFile}.md`
      }

      const candidates = [
        path.join(this.docsDir, targetFile),
        path.resolve(process.cwd(), '../docs/ai-mentor/knowledge', targetFile),
        path.resolve(process.cwd(), 'docs/ai-mentor/knowledge', targetFile),
        path.resolve(__dirname, '../../../../docs/ai-mentor/knowledge', targetFile),
      ]
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          return fs.readFileSync(p, 'utf-8')
        }
      }
      return null
    } catch {
      return null
    }
  }

  /**
   * Queries knowledge base for relevant context based on user prompt
   */
  queryKnowledge(prompt: string): string | null {
    const p = prompt.toLowerCase()

    // 1. Project Identity / Overview / What is CampusProjectHub
    if (
      p.includes('what is campusprojecthub') ||
      p.includes('tell me about campusprojecthub') ||
      p.includes('explain campusprojecthub') ||
      p.includes('what does campusprojecthub do') ||
      p.includes('overview of campusprojecthub')
    ) {
      return `[CAMPUSPROJECTHUB MASTER KNOWLEDGE - PROJECT IDENTITY]
Platform: CampusProjectHub — AI-Powered Academic Project Management & Knowledge-Sharing Platform.
Target Users: College students, seniors, juniors, faculty guides, department HoDs.
Core Vision: Connected academic project ecosystem linking current project development with past batch institutional memory.
Five Core Pillars:
1. Explore Past Projects: Search historical capstones with architecture diagrams, GitHub code, and screenshots.
2. Algorithmic Similarity Intelligence: Dual-stage token Jaccard containment (Similarity != Plagiarism).
3. 7-Dimensional AI Project Mentor: Honest pedagogical auditing preventing semester scope creep.
4. IEEE 830 Proposal Generator: 15 canonical sections with instant OpenXML DOCX and PDFKit PDF export.
5. Faculty Review Pipeline: Formal stage-gated approvals (Draft -> Submitted -> Approved).`
    }

    // 2. Problem Statement (8 Core Academic Problems)
    if (
      p.includes('problem statement') ||
      p.includes('problems solved') ||
      p.includes('why do we need campusprojecthub') ||
      p.includes('academic problems')
    ) {
      return `[CAMPUSPROJECTHUB MASTER KNOWLEDGE - PROBLEM STATEMENT]
CampusProjectHub solves 8 interconnected academic problems:
A. Project Discovery Gap: Students cannot find what previous cohorts have built.
B. Repeated Project Ideas: Unintentional duplication of existing projects year after year.
C. Lost Project Knowledge: Reports and source code disappear upon senior graduation.
D. Senior-Junior Communication Gap: Juniors have no channel to seek advice from previous project teams.
E. Disconnected Tools: WhatsApp, Google Sheets, and Trello create data silos and lost milestones.
F. Team Coordination Failures: Free-rider dilemmas and unassigned project tasks.
G. Limited Faculty Visibility: Faculty discover unviable scopes weeks too late before vivas.
H. Documentation Difficulties: Days wasted formatting IEEE 830 documents manually.`
    }

    // 3. Senior-Junior Connection & Knowledge Network
    if (
      p.includes('senior junior') ||
      p.includes('senior-junior') ||
      p.includes('seniors') ||
      p.includes('juniors') ||
      p.includes('mentorship')
    ) {
      return `[CAMPUSPROJECTHUB MASTER KNOWLEDGE - SENIOR-JUNIOR CONNECTION]
Differentiator: Transforms completed capstones into living mentorship assets across cohorts.
Dossier Preserved: Problem statement, architecture diagrams, GitHub repos, live demos, challenges, learning outcomes, and future enhancements.
How Juniors Learn: Juniors inspect senior architectures and read documented 'Challenges' to identify genuine gaps to improve.
Zero-Leakage Privacy Rule:
- Student emails and phone numbers are strictly masked (***@college.edu, ***-***-****) in public views.
- Mentorship requests occur through an in-platform consent gateway; seniors decide voluntarily whether to accept.`
    }

    // 4. Sixteen Functional Modules
    if (
      p.includes('functional modules') ||
      p.includes('modules list') ||
      p.includes('how many modules') ||
      p.includes('16 modules')
    ) {
      return `[CAMPUSPROJECTHUB MASTER KNOWLEDGE - 16 FUNCTIONAL MODULES]
CampusProjectHub includes 16 integrated functional modules:
1. Student Project Management (Dashboard, stage-gated milestones)
2. Task and Milestone Management (Checklists, phase deadlines)
3. Team Collaboration (Role allocation: Frontend, Backend, Research)
4. Explore Projects (Multi-filter catalog by department, tech, year)
5. Individual Project Details (Dossier with screenshots, GitHub, challenges)
6. Academic Project Repository (33+ field schema, verification flags)
7. Senior-Junior Connection (Artifact preservation, consent mentorship)
8. AI Project Mentor Workspace (Dedicated /ai-mentor route, SSE streaming)
9. Project Similarity Analysis (Dual-stage Jaccard containment)
10. AI Feature Evaluation (7 dimensions: Relevance, Value, Originality, Feasibility, Complexity, Resources, Time)
11. Project Scope Finalization (Student Accept/Reject/Modify controls)
12. Academic Proposal Generator (15 IEEE sections, in-place AI diffs)
13. College Template Management (VTU / Autonomous standard)
14. Faculty Project Guidance (Guide allocation, line-item critique)
15. Submission and Approval Workflow (Draft -> Submitted -> Approved)
16. Admin Management (Bulk historical archive ingestion, audit logs)`
    }

    // 5. System Architecture & Tech Stack
    if (
      p.includes('system architecture') ||
      p.includes('tech stack') ||
      p.includes('technology stack') ||
      p.includes('technologies used')
    ) {
      return `[CAMPUSPROJECTHUB MASTER KNOWLEDGE - ARCHITECTURE & TECH STACK]
Three-Tier Client-Server Architecture:
- Presentation Tier: React 19, TypeScript 5.7, Tailwind CSS v4, Lucide React, Framer Motion, Vite 8 bundler.
- Application Tier: Node.js LTS v22, Express.js 4.21, Zod 3.24 runtime validation, jsonwebtoken JWT, docx & pdfkit binary document generators.
- Data Persistence Tier: MongoDB 7/8 via Mongoose ODM 8.9 with concurrent in-memory Map fallback stores.
- Real-Time Communication: HTTP Server-Sent Events (SSE) for word-by-word streaming.`
    }

    // 6. Security, Privacy & Contact Masking
    if (
      p.includes('security') ||
      p.includes('privacy') ||
      p.includes('contact masking') ||
      p.includes('rbac')
    ) {
      return `[CAMPUSPROJECTHUB MASTER KNOWLEDGE - SECURITY & PRIVACY]
- Role-Based Access Control: Strict separation of student, faculty, and admin roles.
- Ownership Enforcement: 403 Forbidden thrown if student attempts to read or mutate another student's conversation, evaluation, or proposal.
- Student PII Masking: Emails and phone numbers are masked in all public API responses.
- Internal Critique Shielding: Rejection reasons and internal faculty review notes are stripped from public responses.
- Payload Safety: Zod schema validation neutralizes injection attacks.`
    }

    // 7. Limitations & Honest Trade-offs
    if (
      p.includes('limitations') ||
      p.includes('drawbacks') ||
      p.includes('what is not supported') ||
      p.includes('future roadmap')
    ) {
      return `[CAMPUSPROJECTHUB MASTER KNOWLEDGE - ARCHITECTURAL LIMITATIONS & ROADMAP]
Documented Limitations:
1. Dual Provider: Runs on high-fidelity deterministic mock locally; requires external GEMINI_API_KEY for cloud inference.
2. Simulated Voice Mode: Speech waveform preview active; full duplex peer-to-peer WebRTC voice mesh deferred (classified UNNECESSARY for initial release).
3. Template Scope: Standard VTU CSE template active; custom drag-and-drop template designer scheduled for Task 6.
4. Ephemeral In-Memory Fallback: Memory fallback resets on restart if MongoDB is disconnected.
5. University ERP: Bidirectional synchronization with external ERP databases is outside current capstone boundaries.`
    }

    return null
  }

  /**
   * Lists all indexed master knowledge documents with metadata
   */
  listKnowledgeDocs(): Array<{ id: string; filename: string; title: string; category: string }> {
    return [
      { id: '01', filename: '01-project-identity.md', title: 'CampusProjectHub Identity & Core Vision', category: 'Foundation' },
      { id: '02', filename: '02-problem-statement.md', title: '8 Core Academic Problems Analyzed', category: 'Foundation' },
      { id: '03', filename: '03-existing-system.md', title: 'Existing College Project Systems & Gaps', category: 'Foundation' },
      { id: '04', filename: '04-proposed-solution.md', title: 'Proposed Solution & Core Pillars', category: 'Foundation' },
      { id: '05', filename: '05-project-objectives.md', title: 'Engineering Objectives & Rubric Alignment', category: 'Foundation' },
      { id: '06', filename: '06-functional-modules.md', title: '16 Functional Modules Comprehensive Audit', category: 'Architecture' },
      { id: '07', filename: '07-student-workflow.md', title: 'End-to-End Student Lifecycle Workflow', category: 'Workflows' },
      { id: '08', filename: '08-faculty-workflow.md', title: 'Faculty Guide & Committee Workflow', category: 'Workflows' },
      { id: '09', filename: '09-project-repository.md', title: 'Living College Project Repository Schema', category: 'Repository' },
      { id: '10', filename: '10-senior-junior-connection.md', title: 'Senior-Junior Knowledge Network & Privacy', category: 'Collaboration' },
      { id: '11', filename: '11-ai-project-mentor.md', title: 'Dedicated AI Project Mentor Workspace', category: 'AI Intelligence' },
      { id: '12', filename: '12-feature-evaluation.md', title: '7-Dimensional Feature Evaluation Engine', category: 'AI Intelligence' },
      { id: '13', filename: '13-proposal-generation.md', title: 'IEEE 830 Academic Proposal Generator', category: 'Documentation' },
      { id: '14', filename: '14-system-architecture.md', title: 'Three-Tier System Architecture & Diagrams', category: 'Architecture' },
      { id: '15', filename: '15-database-architecture.md', title: 'MongoDB Schemas, Indexes & Fallback Stores', category: 'Data Architecture' },
      { id: '16', filename: '16-technology-stack.md', title: 'Technology Stack & Selection Justification', category: 'Architecture' },
      { id: '17', filename: '17-security-and-privacy.md', title: 'RBAC, Ownership & PII Masking Architecture', category: 'Security' },
      { id: '18', filename: '18-project-limitations.md', title: 'Architectural Boundaries & Trade-Offs', category: 'Engineering Realism' },
      { id: '19', filename: '19-future-enhancements.md', title: 'Phase II & Multi-College Expansion Roadmap', category: 'Roadmap' },
      { id: '20', filename: '20-demo-conversation.md', title: 'Master AI Mentor Demonstration Dialogues', category: 'Demonstration' },
      { id: 'index', filename: 'project-knowledge-index.md', title: 'Master Project Knowledge Index', category: 'Meta' },
      { id: 'status', filename: 'implementation-status.md', title: 'Implementation Reality Matrix', category: 'Meta' },
      { id: 'sources', filename: 'knowledge-source-registry.md', title: 'Codebase Source Traceability Matrix', category: 'Meta' },
    ]
  }
}

export const knowledgeService = new KnowledgeService()
