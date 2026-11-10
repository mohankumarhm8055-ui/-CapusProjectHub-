export interface ProgressiveSection {
  index: number
  key: string
  title: string
  content: string
  followUpPrompt: string
  nextIndex: number
}

export const PROGRESSIVE_SECTIONS: ProgressiveSection[] = [
  // 1. Introduction
  {
    index: 0,
    key: 'introduction',
    title: '1. Introduction & Vision',
    content: `### 1. Introduction & Vision: Welcome to CampusProjectHub

**CampusProjectHub** is an AI-powered academic project management and institutional intelligence platform designed for engineering colleges.

#### The Core Vision:
In most colleges, academic projects are treated as **ephemeral course hurdles**: students spend a semester building software, submit a paper report to the library, and graduate. The next year, new students repeat identical ideas from scratch.

CampusProjectHub shifts the paradigm from **passive project bookkeeping** to an **active academic knowledge ecosystem**:
1. It preserves graduating project dossiers (source code, architecture diagrams, technical hurdles, and screenshots).
2. It guides incoming juniors with real-time AI similarity analysis and feasibility auditing.
3. It streamlines formal faculty review workflows and automated IEEE 830 proposal generation.

*Status: Core Platform [Implemented] | Dedicated AI Workspace [Implemented]*`,
    followUpPrompt: 'Would you like to examine the **8 core academic problems** CampusProjectHub was built to solve, or jump straight into the system architecture?',
    nextIndex: 1,
  },

  // 2. Problem Statement
  {
    index: 1,
    key: 'problem-statement',
    title: '2. Academic Problem Statement',
    content: `### 2. Academic Problem Statement: The 8 Chronic Academic Problems

Traditional college project management suffers from eight systemic points of failure:

1. **The Project Discovery Gap [Implemented]**: Students cannot search what previous cohorts have built, leading to uninformed topic selection.
2. **Repeated Project Ideas [Implemented]**: Identical projects (e.g. basic attendance or bookstore portals) recur cyclically every two years.
3. **Lost Project Knowledge [Implemented]**: Reports and code vanish with graduating seniors rather than becoming institutional reference assets.
4. **Senior-Junior Communication Barrier [Implemented]**: Juniors lack structured, privacy-preserving channels to consult alumni who tackled similar engineering hurdles.
5. **Tool Fragmentation**: Teams juggle WhatsApp groups, Google Docs, Trello boards, and email threads, scattering critical documentation.
6. **Team Coordination Breakdowns**: Lack of role clarity leads to unbalanced workloads and last-minute scramble before reviews.
7. **Limited Faculty Visibility**: Guides struggle to track authentic commit progress across multiple teams, discovering unviable scopes days before vivas.
8. **Documentation Bottlenecks**: Students spend days wrestling with manual word processor formatting instead of focusing on software engineering.`,
    followUpPrompt: 'Would you like to see how **existing approaches** (paper forms, Google Drive, spreadsheets) fail, or explore the **7 pillars of our proposed solution**?',
    nextIndex: 2,
  },

  // 3. Existing System & Limitations
  {
    index: 2,
    key: 'existing-system',
    title: '3. Existing System & Gaps',
    content: `### How Colleges Currently Manage Projects & Why It Fails

Traditional department workflows rely on fragmented, ad-hoc mechanisms:

| Method | Typical Implementation | Chronic Failure Mode |
| :--- | :--- | :--- |
| **Physical Paper Forms** | Project registration sheets signed by guides | Lost in department file cabinets; zero searchable metadata. |
| **Shared Spreadsheets** | Google Sheets with milestone dates | No version history, no code links, no similarity checking, manual data entry errors. |
| **Library Report Stacks** | Spiral-bound printed theses | Inaccessible during ideation; nobody reads physical shelf archives. |
| **WhatsApp / Email Threads** | Ad-hoc group chats for updates | Artifacts scattered; zero institutional memory preserved upon graduation. |
| **Generic Commercial Tools** | Trello / Jira / Notion | Lack academic rubrics, stage-gated milestone approvals, and institutional continuity. |`,
    followUpPrompt: 'Shall we explore the **7 Pillars of the Proposed Solution** that directly replace these fragmented methods?',
    nextIndex: 3,
  },

  // 4. Proposed Solution & Core Pillars
  {
    index: 3,
    key: 'proposed-solution',
    title: '4. Proposed Solution & Core Pillars',
    content: `### The 7 Pillars of CampusProjectHub

CampusProjectHub integrates the entire capstone journey into a unified platform:

\`\`\`text
[Explore Repository] ──> [AI Similarity Audit] ──> [7D Feature Evaluation]
         │                                                    │
         v                                                    v
[Senior Mentorship] <── [Faculty Guide Review] <── [IEEE 830 Proposal Export]
\`\`\`

1. **Living College Project Repository [Implemented]**: Searchable database of past projects with tech tags, architecture diagrams, and GitHub repositories.
2. **Algorithmic Similarity Intelligence [Implemented]**: Dual-stage token Jaccard containment enforcing the academic principle: *Similarity is NOT plagiarism; novelty is mandatory*.
3. **Dedicated AI Project Mentor [Implemented]**: Full-page interactive workspace offering honest engineering guidance and viva preparation.
4. **7-Dimensional Feature Evaluation Engine [Implemented]**: Pedagogical scope assessment detecting scope creep and viva traps.
5. **IEEE 830 Proposal Generator [Implemented]**: Automated generation of 15 canonical sections with instant OpenXML DOCX and PDF export.
6. **Team Collaboration & Milestone Management [Implemented]**: Role allocation (Frontend, Backend, Research) with stage gating.
7. **Senior-Junior Mentorship Gateway [Implemented]**: Privacy-preserving, consent-based guidance requests with zero contact leakage.`,
    followUpPrompt: 'Would you like to review the **specific engineering objectives** or explore the **16 functional modules**?',
    nextIndex: 4,
  },

  // 5. Engineering Objectives
  {
    index: 4,
    key: 'objectives',
    title: '5. Engineering Objectives & Rubrics',
    content: `### Engineering Objectives & Accreditation Alignment

CampusProjectHub is engineered to satisfy formal university capstone rubrics (e.g. VTU, autonomous engineering college evaluation standards):

* **Objective 1 — Institutional Memory**: Ensure 100% of approved departmental capstones are indexed with code links and documented hurdles.
* **Objective 2 — Prevent Unintentional Duplication**: Provide similarity scoring that isolates technical stack overlap from genuine conceptual duplication.
* **Objective 3 — Pedagogical Guidance**: Give students transparent technical trade-offs before they commit to unrealistic project scopes.
* **Objective 4 — Industry Documentation Standard**: Eliminate manual formatting errors by synthesizing IEEE 830 compliant proposals.
* **Objective 5 — Faculty Governance**: Provide strict stage gating (\`DRAFT\` ➔ \`SUBMITTED\` ➔ \`CHANGES_REQUESTED\` ➔ \`APPROVED\`) with line-item review logs.
* **Objective 6 — Privacy Compliance**: Protect student PII through deterministic output sanitization (\`***@college.edu\`).`,
    followUpPrompt: 'Would you like to examine the complete breakdown of all **16 Functional Modules**?',
    nextIndex: 5,
  },

  // 6. Functional Modules
  {
    index: 5,
    key: 'functional-modules',
    title: '6. 16 Functional Modules Breakdown',
    content: `### CampusProjectHub — 16 Functional Modules

The platform is structured into 16 interconnected modules covering the full student, faculty, and administrative lifecycle:

1. **Student Project Management [Implemented]**: Milestone tracking, stage gating, and capstone progress overview.
2. **Task & Milestone Management [Implemented]**: Checklists, phase deadlines, and progress reporting.
3. **Team Collaboration [Implemented]**: Role allocation (Frontend, Backend, Research) and team activity feed.
4. **Explore Projects [Implemented]**: Departmental repository discovery with multi-parameter filtering.
5. **Individual Project Details [Implemented]**: Deep dossier view with screenshots, architecture, and masked contacts.
6. **Academic Project Repository [Implemented]**: 33-field Mongoose schema, seed benchmarks, and MongoDB persistence.
7. **Senior-Junior Connection [Implemented]**: Dossier browsing and privacy-masked consent mentorship requests.
8. **AI Project Mentor Workspace [Implemented]**: Dedicated \`/ai-mentor\` full-page environment with streaming SSE.
9. **Similarity Analysis Engine [Implemented]**: Dual-stage token Jaccard containment and overlap scoring.
10. **AI Feature Evaluation [Implemented]**: 7-dimensional evaluation framework with viva question generation.
11. **Project Scope Finalization [Implemented]**: Student Accept/Reject/Modify controls producing frozen scope locks.
12. **Academic Proposal Generator [Implemented]**: 15 IEEE 830 sections with section-level AI refinement and diffs.
13. **College Template Management [Implemented]**: Standard VTU / Autonomous university DOCX and PDF compliance.
14. **Faculty Project Guidance [Implemented]**: Guide allocation, line-item feedback, and review queuing.
15. **Submission & Approval Workflow [Implemented]**: Formal stage machine (\`DRAFT\` ➔ \`SUBMITTED\` ➔ \`APPROVED\`).
16. **Admin Platform Management [Implemented]**: Archive ingestion, user management, and immutable audit logs.`,
    followUpPrompt: 'Would you like to see how **Project Discovery & Similarity Search** works under the hood, or explore the **Senior-Junior Connection**?',
    nextIndex: 6,
  },

  // 7. Project Discovery & Repository
  {
    index: 6,
    key: 'project-discovery',
    title: '7. Project Discovery & Repository Intelligence',
    content: `### Living Repository & Similarity Engine

CampusProjectHub does not store raw PDFs in flat folders. Every project is stored with a **33-field structured academic schema**:

#### Dual-Stage Similarity Algorithm:
\`\`\`text
Student Idea: "Smart Attendance using Face Recognition"
                   │
                   ├──> Stage 1: Exact Title & n-gram Jaccard Containment
                   │              (filters common stopwords & tech words)
                   │
                   └──> Stage 2: Dimensional Vector Alignment
                                  (Title vs Concept vs Tech vs Features)
\`\`\`

#### Four Strict Similarity Classifications:
1. **\`EXACT_OR_NEAR_EXACT_TITLE\`**: ≥75% title overlap ➔ Alert student to select a distinct focus.
2. **\`SIMILAR_PROJECT_CONCEPT\`**: Conceptual alignment ➔ Cites the previous project, identifies documented gaps, and prompts the student for novelty.
3. **\`SIMILAR_FEATURE_SET\`**: Overlapping sub-modules ➔ Clarifies that shared features are permissible if the architectural core differs.
4. **\`RELATED_TECHNOLOGY_ONLY\`**: Shared stack (e.g., both use React + Python) ➔ *Explicitly cleared of plagiarism flags*.`,
    followUpPrompt: 'Shall we dive into the **Senior-Junior Connection & Privacy Masking** next?',
    nextIndex: 7,
  },

  // 8. Senior-Junior Connection
  {
    index: 7,
    key: 'senior-junior-connection',
    title: '8. Senior-Junior Connection & Privacy',
    content: `### Senior-Junior Knowledge Network & Privacy Guard

The Senior-Junior network bridges the generational divide in colleges by turning past capstones into mentorship opportunities without compromising student privacy:

#### 1. What Seniors Leave Behind:
* High-level **Architecture Diagrams**.
* Grounded **GitHub repository links** and live demos.
* **Documented Hurdles & Real Bottlenecks** (e.g. state management race conditions, database indexing bottlenecks) and how they resolved them.
* **Future Enhancements**: Concrete extension opportunities left for junior batches.

#### 2. The Zero-Leakage Privacy Rule:
* **No Public Phone/Email Exposure**: Student contacts are sanitized at the API layer (\`s****@college.edu\`, \`+91 98***-****\`).
* **Consent Mentorship Gateway**: Juniors submit an in-platform mentorship inquiry explaining their proposed capstone and specific questions.
* **Voluntary Senior Opt-In**: The senior receives an alert and chooses whether to accept and open a discussion thread.`,
    followUpPrompt: 'Would you like to examine our **Three-Tier System Architecture** next?',
    nextIndex: 8,
  },

  // 9. System Architecture
  {
    index: 8,
    key: 'system-architecture',
    title: '9. Three-Tier System Architecture',
    content: `### 9. Three-Tier System Architecture: Client-Server Separation

CampusProjectHub is built on clean architectural separation across three tiers:

\`\`\`text
[Presentation Tier]        [Application Tier]          [Data Persistence Tier]
┌──────────────────┐       ┌──────────────────┐        ┌──────────────────────┐
│  React 19 (Vite) │ <───> │ Node.js + Express│ <────> │ MongoDB 7/8 (Primary)│
│  Tailwind CSS v4 │ (SSE) │ Zod Validation   │        │ In-Memory Fallback   │
│  Lucide Icons    │       │ docx + pdfkit    │        │ Seed Benchmarks      │
└──────────────────┘       └──────────────────┘        └──────────────────────┘
\`\`\`

* **Presentation Tier**: Fast client rendering with React 19, TypeScript 5.7, Tailwind CSS v4, and SSE stream consumer.
* **Application Tier**: Node.js LTS, Express 4.21, Zod schema validation, and dedicated binary generators (\`docx\` and \`pdfkit\`).
* **Persistence Tier**: MongoDB via Mongoose ODM with an integrated dual-mode in-memory store ensuring local development runs seamlessly even without a live MongoDB daemon.`,
    followUpPrompt: 'Would you like to inspect the **Technology Stack** details or look at the **Database Design**?',
    nextIndex: 9,
  },

  // 10. Technology Stack
  {
    index: 9,
    key: 'technology-stack',
    title: '10. Modern Technology Stack',
    content: `### Technology Stack & Selection Justification

Every technology was selected for maintainability, type safety, and student project feasibility:

| Tier | Technology | Justification |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 19** | Concurrent rendering, latest hooks, fast component re-renders. |
| **Language** | **TypeScript 5.7** | End-to-end type safety, self-documenting data models. |
| **Styling** | **Tailwind CSS v4** | Modern utility-first styling with high responsiveness. |
| **Backend Runtime** | **Node.js LTS (v22)** | High I/O throughput for streaming AI tokens and document export. |
| **API Framework** | **Express.js 4.21** | Lightweight, robust middleware ecosystem (JWT, CORS, Rate Limit). |
| **Validation** | **Zod 3.24** | Runtime schema parsing neutralizing NoSQL injection and malformed bodies. |
| **Document Synthesis**| **docx & pdfkit** | Programmatic, zero-browser binary file generation (prevents memory leaks). |
| **Database** | **MongoDB 7/8 + Mongoose** | Flexible schema for semi-structured project dossiers. |`,
    followUpPrompt: 'Shall we examine the **Database Design & Schema Collections** next?',
    nextIndex: 10,
  },

  // 11. Database Design
  {
    index: 10,
    key: 'database-design',
    title: '11. Database Design & Fallback Persistence',
    content: `### Database Architecture & Dual-Mode Fallback

The backend defines 6 core collections in MongoDB with strict indexing:

1. **\`projects\`**: 33-field canonical schema with compound indexes on \`collegeId\`, \`department\`, \`academicYear\`, and text index on \`title\`.
2. **\`conversations\`**: Thread tracking with \`ownerId\` and \`lastMessageAt\` indexes.
3. **\`messages\`**: Message records with \`conversationId\`, \`role\`, and provider metadata.
4. **\`feature_evaluations\`**: 7-dimensional evaluation scores, feature classifications, and student decisions.
5. **\`academic_proposals\`**: 15 IEEE 830 sections with versioning history chains.
6. **\`audit_logs\`**: Immutable faculty sign-off and milestone transition logs.

#### Dual-Mode Persistence Engine:
If MongoDB is offline during local evaluation, CampusProjectHub seamlessly switches to **high-fidelity In-Memory Map stores** without throwing server crashes.`,
    followUpPrompt: 'Would you like to review the **Complete Student & Faculty Workflow**?',
    nextIndex: 11,
  },

  // 12. Complete Workflow
  {
    index: 11,
    key: 'complete-workflow',
    title: '12. Complete Capstone Workflow',
    content: `### End-to-End Capstone Lifecycle Workflow

CampusProjectHub coordinates the entire student and faculty journey:

\`\`\`text
1. Onboarding      --> Student creates Academic Account (Student / Guide role)
         │
2. Exploration     --> Student searches Past Department Projects & masked contacts
         │
3. Ideation        --> Student consults AI Project Mentor for similarity check
         │
4. Feature Scoping --> 7D Evaluation classifies features; Student Locks Scope
         │
5. Proposal Gen    --> Automated IEEE 830 draft synthesized with section AI diffs
         │
6. Faculty Review  --> Guide reviews line items: Approves or Requests Changes
         │
7. Archival        --> Approved project is published to Repository for next batch
\`\`\`

Strict separation of authority: **The AI acts solely as an advisor; the human faculty guide holds ultimate academic approval authority.**`,
    followUpPrompt: 'Shall we look at the **Key Advantages & Educational Value** of the platform?',
    nextIndex: 12,
  },

  // 13. Advantages & Value
  {
    index: 12,
    key: 'advantages',
    title: '13. Advantages & Measurable Value',
    content: `### Platform Advantages & Educational Impact

1. **Eliminates Topic Duplication**: Prevents teams from submitting clones of past projects unknowingly.
2. **Saves Weeks of Documentation**: Generates fully formatted IEEE 830 documents with cover pages in seconds.
3. **Protects Students from Scope Creep**: The 7D feature evaluator honest critique prevents teams from taking on impossible semester workloads.
4. **Preserves Institutional Memory**: Ensures valuable student research doesn't leave campus when seniors graduate.
5. **Complete Data Privacy**: Protects student PII with zero contact leakage.
6. **Empowers Faculty**: Guides spend review meetings discussing engineering design rather than fixing document margins.`,
    followUpPrompt: 'Would you like to hear about our **Honest Engineering Limitations & Boundaries**?',
    nextIndex: 13,
  },

  // 14. Limitations & Boundaries
  {
    index: 13,
    key: 'limitations',
    title: '14. Architectural Boundaries & Honest Limitations',
    content: `### Honest System Limitations & Engineering Boundaries

In keeping with academic engineering honesty, CampusProjectHub explicitly documents its current boundaries:

1. **AI Provider Dual Modes**:
   - High-fidelity **deterministic mock engine** runs locally out-of-the-box with zero API keys or external expenses.
   - Cloud inference requires configuring a valid \`GEMINI_API_KEY\` in environment settings.
2. **Voice Mentorship Interface**:
   - The workspace provides an active **visual waveform preview and audio synthesis simulation**.
   - Peer-to-peer full-duplex WebRTC voice mesh was evaluated and formally classified as \`UNNECESSARY\` for initial release to prevent semester scope creep.
3. **Template Customization**:
   - Standard VTU / Autonomous CSE templates with complete IEEE 830 sections are built-in.
   - A drag-and-drop custom college template designer is scheduled for Phase II (Task 6).
4. **In-Memory Fallback Ephemerality**:
   - Fallback memory stores reset if the Node process restarts while MongoDB is disconnected.
5. **University ERP Boundaries**:
   - Direct two-way sync with proprietary university ERP/SIS systems is kept out-of-scope for the capstone.`,
    followUpPrompt: 'Would you like to explore our **Future Enhancements Roadmap**?',
    nextIndex: 14,
  },

  // 15. Future Enhancements
  {
    index: 14,
    key: 'future-enhancements',
    title: '15. Future Enhancements & Multi-Phase Roadmap',
    content: `### Multi-Phase Future Roadmap

* **Phase II — Visual College Template Designer [Task 6]**: Drag-and-drop cover sheet editor supporting autonomous university formatting rules.
* **Phase III — Federated Repository Network**: Inter-college project discovery enabling cross-institution capstone collaboration across state universities.
* **Phase IV — Cloud Vector Embeddings**: Scalable remote vector indexing for multi-thousand departmental thesis archives.
* **Phase V — Full-Duplex WebRTC Voice Examiner**: Real-time simulated viva audio defense with speech transcription and committee rubrics.

---

### You have completed the CampusProjectHub Master Architecture Overview!
You now understand the complete platform from student discovery to faculty review and repository preservation.`,
    followUpPrompt: 'Would you like to test your own project idea against our college repository, or ask a specific technical question?',
    nextIndex: 0,
  },
]
