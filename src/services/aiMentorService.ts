import type { Conversation, MentorSettings, SuggestionCard } from '../types/aiMentor'

const STORAGE_KEY = 'campusprojecthub_ai_mentor_conversations'
const SETTINGS_KEY = 'campusprojecthub_ai_mentor_settings'

export const DEFAULT_SUGGESTION_CARDS: SuggestionCard[] = [
  {
    id: 'evaluate-campusprojecthub',
    title: 'Evaluate CampusProjectHub',
    description: 'Analyze similarity against historical repository benchmarks and evaluate the 8 core capabilities.',
    iconName: 'Sparkles',
    category: 'PRIMARY PROJECT EVALUATION',
    badgeText: 'Core Platform Audit',
    prompt:
      'I am developing CampusProjectHub, an AI-powered college project management platform. Can you help me identify similar existing projects, evaluate my proposed features and determine how I can make this project technically meaningful and different?',
  },
  {
    id: 'find-projects',
    title: 'Similarity Analysis & Integrity',
    description: 'Learn how dual-stage similarity prevents false plagiarism alarms while enforcing academic integrity.',
    iconName: 'Compass',
    category: 'REPOSITORY INTELLIGENCE',
    badgeText: 'Similarity != Plagiarism',
    prompt:
      'How does the CampusProjectHub repository intelligence engine compare student ideas against previous historical archives without falsely flagging shared technology stacks as duplicates?',
  },
  {
    id: 'proposal-templates',
    title: 'Academic Proposals & Templates',
    description: 'Explore college-specific DOCX & PDF proposal compilation adhering to university standards.',
    iconName: 'BookOpen',
    category: 'PROPOSAL GENERATION',
    badgeText: 'College Templates (DOCX/PDF)',
    prompt:
      'How should CampusProjectHub implement college-specific DOCX and PDF proposal generation adhering to university formatting standards like IEEE and department rubrics?',
  },
  {
    id: 'evaluate-features',
    title: 'Faculty Review & Team Collaboration',
    description: 'Audit role-based submission lifecycles, faculty review stages, and student team collaboration.',
    iconName: 'CheckSquare',
    category: 'GOVERNANCE & LIFECYCLE',
    badgeText: 'Faculty Review Workflow',
    prompt:
      'What database schema, audit logging, and role-based permissions should CampusProjectHub implement for student draft submissions, faculty change requests, and final project approval?',
  },
]

export const DEFAULT_SETTINGS: MentorSettings = {
  personality: 'supportive-guide',
  academicLevel: 'undergraduate',
  citationFormat: 'ieee',
  enforceAcademicIntegrity: true,
}

// Initial mock conversations representing realistic academic mentoring
const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-today-1',
    title: 'Architecture & Feasibility: CampusProjectHub Platform',
    updatedAt: '10 mins ago',
    createdAt: 'Today',
    group: 'Today',
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        content:
          'I am developing CampusProjectHub, an AI-powered college project management platform. Can you help me identify similar existing projects, evaluate my proposed features and determine how I can make this project technically meaningful and different?',
        timestamp: '10:15 AM',
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: `### CampusProjectHub — Academic Architecture & Feasibility Audit

* **Primary Project Identified**: **CampusProjectHub** (AI-Powered Academic Project Management & Learning Platform)
* **Sample Repository Benchmark Cited**:
  - **Reference Record**: *Academic Project Management & Workflow Tracking Portal [Sample Historical Benchmark Data - For Academic Evaluation Demonstration]* (2023–24, Dept of Computer Science & Engineering)
  - **Provenance Disclosure**: *[Note: This is a realistic hypothetical record generated for academic evaluation demonstration of college project repositories. It does not represent an actual historical college project.]*

---

#### 1. Repository Overlap & Historical Gap Analysis
Traditional department project management systems were essentially **static CRUD portals** with basic tracking:
1. Basic student team registration forms and milestone date logs.
2. Binary faculty approve/reject buttons.
3. Unindexed PDF report uploads stored in flat server directories.

**What Makes CampusProjectHub Different**:
CampusProjectHub shifts the paradigm from **passive project bookkeeping** to an **active AI-assisted academic intelligence platform** combining 8 integrated capabilities:
1. **Academic Project Management**: Structured milestone tracking with stage gating.
2. **Student Team Collaboration**: Role allocation, shared task boards, and activity audit trails.
3. **College Project Discovery**: Multi-filter catalog search (department, technology, academic year) with student contact privacy masking.
4. **AI-Powered Project Similarity Analysis**: Token containment and semantic vector cosine matching (*Similarity != Plagiarism* guardrails).
5. **AI Feature Evaluation & Feasibility Assessment**: Pedagogical mentoring detecting scope creep and anticipated viva examiner questions.
6. **Academic Proposal Generation**: Automated problem statement, objectives, and methodology synthesis.
7. **College-Specific DOCX and PDF Templates**: Standardized academic document formatting (IEEE/VTU guidelines).
8. **Faculty Project Review & Approval**: Formal multi-state workflow (\`DRAFT\` ➔ \`SUBMITTED\` ➔ \`UNDER_REVIEW\` ➔ \`CHANGES_REQUESTED\` ➔ \`APPROVED\`).

---

#### 2. Feasibility & Implementation Constraints for a Student Mini-Project

When defending CampusProjectHub to an academic project review committee, examiners will scrutinize **Scope Feasibility**:

| Capability | High-Risk Trap (Scope Creep) | Recommended Mini-Project Implementation |
| :--- | :--- | :--- |
| **AI Similarity Engine** | Heavy remote vector databases requiring costly cloud GPUs | Lightweight character/token n-gram Jaccard containment with local embeddings fallback |
| **Proposal Templating** | Dynamic headless Chromium browser rendering (high memory/crash risk) | Deterministic programmatic templating using \`docx\` and \`pdfkit\` libraries |
| **Faculty Review Workflow** | Complex multi-tier college ERP hierarchy | Strict State Machine with immutable audit logging and role-based access control (RBAC) |
| **AI Project Mentor** | Generic third-party chat widget lacking context | Full-page dedicated workspace with streaming SSE and repository-grounded prompt injection |

---

#### 3. Key Viva Examiner Questions to Prepare:

> 1. *"How does your similarity engine distinguish between two completely different projects that merely share the same React and Python stack?"*
> **Your Defense**: Explain that your engine isolates \`RELATED_TECHNOLOGY_ONLY\` from \`SIMILAR_PROJECT_CONCEPT\`. Shared libraries or frameworks are filtered out from the conceptual similarity score to prevent false plagiarism flags.
>
> 2. *"How do you prevent students from viewing internal faculty rejection comments before official publication?"*
> **Your Defense**: Emphasize backend data masking at the controller layer: \`rejectionReason\` and internal review notes are stripped from public responses unless the requester's JWT or session role matches \`faculty\` or \`admin\`.

---

#### 4. Recommended Action Plan for Your Team:
1. **Milestone 1**: Lock down the Canonical Project Schema (33+ fields) and Mongoose repository indexes.
2. **Milestone 2**: Finalize the AI Project Mentor Workspace with Server-Sent Events (SSE) streaming and repository context injection.
3. **Milestone 3**: Implement deterministic DOCX/PDF proposal exports with college-specific cover sheets and reference citations.`,
        timestamp: '10:16 AM',
        suggestedFollowUps: [
          'How do we design the database schema for the 8 core capabilities?',
          'How do we implement DOCX proposal generation without third-party cloud services?',
          'What are the security boundaries between Student and Faculty roles?',
        ],
      },
    ],
  },
  {
    id: 'conv-today-2',
    title: 'Database Schema Review for E-Commerce Capstone',
    updatedAt: '2 hours ago',
    createdAt: 'Today',
    group: 'Today',
    messages: [
      {
        id: 'msg-3',
        role: 'user',
        content: 'Can you review our database schema for inventory reservation during checkout?',
        timestamp: '8:42 AM',
      },
      {
        id: 'msg-4',
        role: 'assistant',
        content: `### Review of Inventory Reservation Workflow

When handling academic e-commerce projects, the single most common design flaw examiners highlight is the **Race Condition on concurrent checkout**.

#### Key Recommendations:
1. **Pessimistic vs. Optimistic Locking**:
   * For student projects, implement **Optimistic Concurrency Control (OCC)** using a \`version\` column or atomic updates:
   \`\`\`sql
   UPDATE inventory 
   SET stock = stock - 1, version = version + 1 
   WHERE product_id = $1 AND stock >= 1 AND version = $current_version;
   \`\`\`
2. **TTL for Reserved Cart Items**:
   * Always set a 10-minute expiry for unpaid reserved stock via a Redis key or background worker cron job.

This demonstrates robust software engineering principles in your documentation report!`,
        timestamp: '8:44 AM',
        suggestedFollowUps: [
          'How do I represent this in an ER diagram for my thesis report?',
          'What happens if the payment gateway webhook fails?',
        ],
      },
    ],
  },
  {
    id: 'conv-yesterday-1',
    title: 'Feasibility Analysis: Drone Agriculture Monitoring',
    updatedAt: 'Yesterday',
    createdAt: 'Yesterday',
    group: 'Yesterday',
    messages: [
      {
        id: 'msg-5',
        role: 'user',
        content: 'Is an autonomous drone crop pest detection project feasible for a 4-person team in 4 months?',
        timestamp: 'Yesterday 3:15 PM',
      },
      {
        id: 'msg-6',
        role: 'assistant',
        content: `### Honest Feasibility Audit: Drone Crop Pest Detection

**Feasibility Verdict**: ⚠️ **High Risk of Scope Creep (Score: 6.5/10)**

#### The Honest Breakdown:
* **Hardware Bottlenecks**: Quadcopter assembly, flight controllers (Pixhawk), and battery management will consume 60% of your time, leaving insufficient time for machine learning.
* **Academic Recommendation**:
  * Decouple the hardware: Use a simulated drone dataset (such as PlantVillage or Agriculture-Vision benchmark datasets) or pre-captured drone orthomosaics.
  * Focus your innovation on the **YOLOv8 defect segmentation pipeline** and a web dashboard for farmers with NDVI vegetation health indexes.
  * This shifts your project from hardware troubleshooting to verifiable computer vision deliverables.`,
        timestamp: 'Yesterday 3:16 PM',
        suggestedFollowUps: [
          'What public drone crop datasets are approved for university capstones?',
          'Suggest a realistic 12-week Gantt chart milestone breakdown',
        ],
      },
    ],
  },
  {
    id: 'conv-week-1',
    title: 'Microservices vs Monolith for Academic Review',
    updatedAt: '4 days ago',
    createdAt: 'Previous 7 Days',
    group: 'Previous 7 Days',
    messages: [
      {
        id: 'msg-7',
        role: 'user',
        content: 'Should we build our final year project as microservices or a modular monolith?',
        timestamp: '4 days ago',
      },
      {
        id: 'msg-8',
        role: 'assistant',
        content: `### Architecture Guidance: Microservices vs. Modular Monolith

**My Honest Academic Recommendation**: Build a **Well-Structured Modular Monolith**.

#### Why University Teams Fall Into the Microservices Trap:
1. **Network Overhead & Distributed Transactions**: Managing distributed rollback (Saga pattern) across 5 services in an academic prototype introduces unnecessary bugs during the live demonstration.
2. **Deployment Complexity**: Setting up Docker Compose, API Gateways, service discovery, and tracing consumes weeks without adding business logic value.
3. **What Examiners Actually Grade**: They grade clean domain separation, robust database normalization, unit testing, and clear API documentation—all of which are easier to excel at in a modular monolith.`,
        timestamp: '4 days ago',
        suggestedFollowUps: [
          'How should we structure folders in our monorepo?',
          'What Swagger / OpenAPI tools should we configure?',
        ],
      },
    ],
  },
]

// Academic response generator for realistic demonstrations
export function generateAcademicResponse(prompt: string, _settings?: MentorSettings): {
  content: string
  suggestedFollowUps: string[]
  codeSnippet?: { language: string; code: string }
} {
  const p = prompt.toLowerCase()

  // 0a. Specific Project Idea Inquiry (e.g. "I have a mini-project idea about a project management system.")
  if (
    p.includes('project management') ||
    (p.includes('mini-project') && (p.includes('idea') || p.includes('system'))) ||
    p.includes('project idea about') ||
    p.includes('have a mini-project idea')
  ) {
    return {
      content: `That's a good starting point for a mini-project. A project management system can help students organize their work, coordinate teams, assign tasks and track project progress.

However, project management systems already exist, so we should identify what makes your project different rather than simply building another task-management application.

For CampusProjectHub, there is an opportunity to go beyond ordinary project management:

- **Project Management**: Manage teams, tasks, milestones and deadlines.
- **Academic Project Repository**: Discover projects developed by previous batches.
- **Knowledge Sharing**: Help juniors learn from seniors' completed projects.
- **AI Project Mentor**: Evaluate project ideas, identify similar projects and recommend improvements.
- **Proposal Generation**: Convert finalized project ideas into academic proposals.

We should first understand your intended scope and then decide which features are realistic for your mini-project.

One question to start: Are you planning to build this specifically for college students and faculty, where students can manage their academic projects and discover projects developed by previous batches?`,
      suggestedFollowUps: [
        'Yes, specifically for college students and faculty',
        'Is this project suitable for a mini-project?',
        'What makes CampusProjectHub different?',
      ],
    }
  }

  // 0a-2. Specific College Scope Affirmation (e.g. "Yes, specifically for college students.")
  if (
    p.includes('specifically for college') ||
    (p.includes('college students') && (p.includes('yes') || p.includes('specifically') || p.includes('faculty')))
  ) {
    return {
      content: `Focusing specifically on an academic institution—college students and faculty guides—is a strong strategic decision. Academic project workflows differ fundamentally from corporate software development.

In commercial tools like Trello or Jira, the entire architecture assumes paid enterprise teams with continuous sprint cycles. They completely fail in college environments because:
1. **No Institutional Memory**: When seniors graduate, their project reports, architectures, and lessons learned are lost, causing incoming juniors to unknowingly propose duplicate project ideas.
2. **No Academic Milestone Gating**: Colleges require strict stage-gating (\`Draft\` ➔ \`Guide Review\` ➔ \`Phase 1 Evaluation\` ➔ \`Final Defense\`) with formal faculty sign-off.
3. **No Prior-Art Discovery**: Generic tools cannot index past departmental capstones or prevent duplicate scopes.

For a realistic single-semester mini-project (8 to 12 weeks), here is how your team should bound your scope:

- **Core Mini-Project Features to Build (High Priority)**:
  1. **Student Team Workspace**: Team registration, role division (Frontend, Backend, Database), and task boards.
  2. **Academic Milestone Submissions**: Phase deadline tracking, document uploads, and submission audit logs.
  3. **Department Project Repository**: Searchable archive of past projects with privacy-masked senior contacts.
  4. **Faculty Review Interface**: Guide dashboard to accept, review, and request changes on student submissions.

- **High-Risk Features to Defer for Future Work**:
  - Real-time video conferencing (use external Google Meet links instead).
  - Heavy cloud GPU machine learning pipelines.
  - Complex college ERP billing or attendance system integrations.

Between the student project workflow and the previous-batch project repository, which part do you see as your primary focus for this semester?`,
      suggestedFollowUps: [
        'What are the disadvantages?',
        'How can we implement the project repository?',
        'Can we reduce the scope?',
      ],
    }
  }

  // 0b. Project Suitability Inquiry
  if (p.includes('suitable') || p.includes('suitability')) {
    return {
      content: `Yes, a project management platform can be a very suitable academic mini-project, provided you carefully define your scope to match a single-semester timeline.

When faculty evaluators review a mini-project, they look for three primary criteria:
1. **Clear Problem Formulation**: Solving a specific workflow challenge (such as academic team collaboration and milestone submission) rather than a toy replica.
2. **Technical Soundness**: Proper relational or document data modeling, role-based authentication, and milestone tracking.
3. **Execution Realism**: A feature set that a student team can comfortably complete, test, and defend within 8 to 12 weeks.

The most common mistake students make is trying to build a full commercial clone like Jira or Asana with real-time video, third-party integrations, and automated billing. That leads to superficial prototypes that fail faculty scrutiny.

Instead, a focused academic MVP featuring **team workspaces, task assignments, milestone submissions, and a basic project archive** is both manageable and academically defensible.

One question to help calibrate: What is your team size and how many weeks do you have before your first project evaluation?`,
      suggestedFollowUps: [
        'Can we reduce the scope to an MVP?',
        'Do we really need AI for this mini-project?',
        'Prepare a problem statement for our mini-project',
      ],
    }
  }

  // 0c. Platform Differentiation Inquiry
  if (p.includes('what makes') || (p.includes('different') && (p.includes('campusprojecthub') || p.includes('trello') || p.includes('jira') || p.includes('drive')))) {
    return {
      content: `What makes CampusProjectHub fundamentally different from tools like Trello, Jira, or Google Drive is that it is architected specifically for the **academic project lifecycle**, not generic commercial task boards.

Here is how CampusProjectHub differentiates across the academic lifecycle:

1. **Permanent Institutional Memory**: When seniors graduate, their Trello boards or Google Drives are closed or deleted. CampusProjectHub preserves their completed projects in a 33-field searchable repository so future batches can learn from their architectures and documented hurdles.
2. **Prior-Art Discovery & Novelty Check**: Before students start coding, our similarity analysis checks proposed ideas against archived college capstones to prevent submitting identical duplicate projects year after year.
3. **Automated Academic Documentation**: Instead of manual formatting struggles, the platform generates IEEE 830-compliant proposal drafts with 15 canonical sections, exportable as valid DOCX and PDF documents.
4. **Senior-Junior Knowledge Network**: Juniors can view sanitized senior project dossiers and request guidance through a consent-based, privacy-masked mentorship gateway without leaking personal contact information.
5. **Stage-Gated Faculty Governance**: Faculty guides manage submissions through formal academic states (\`DRAFT\` ➔ \`SUBMITTED\` ➔ \`UNDER_REVIEW\` ➔ \`APPROVED\`) with immutable audit trails.

Commercial tools only track tasks; CampusProjectHub provides academic guidance and institutional continuity.

One question to consider: Which of these capabilities is most important for your college: the project repository, the AI Mentor, or the faculty approval workflow?`,
      suggestedFollowUps: [
        'Explain its modules',
        'What are its disadvantages?',
        'How can we implement the project repository?',
      ],
    }
  }

  // 0d. Disadvantages and Trade-offs Inquiry
  if (p.includes('disadvantages') || p.includes('drawbacks') || (p.includes('limitations') && p.includes('what are'))) {
    return {
      content: `Every software engineering architecture involves trade-offs. Here is an honest, critical assessment of the technical disadvantages and limitations of CampusProjectHub:

1. **The Cold-Start Repository Problem**: The repository and similarity engines deliver high value only when historical project data exists. If a department starts with an empty database, students receive fewer benchmark comparisons until faculty or admins seed previous batch records.
2. **AI Provider Latency and API Costs**: Using large cloud LLMs introduces latency into conversational streaming and ongoing API token expenses. Running local or quantized models requires GPU infrastructure that many colleges lack.
3. **Verification Overhead for User-Submitted Data**: If graduating seniors upload their own project metadata without faculty verification, unverified or low-quality code repositories could pollute the departmental archive.
4. **Faculty Adoption Resistance**: Academic faculty already have heavy grading workloads. If the submission and approval workflow feels too complex or rigid compared to a simple email or spreadsheet, faculty engagement drops.
5. **PII and Data Privacy Balancing**: Enabling junior-senior connections while strictly protecting student privacy (preventing phone number and personal email scraping) requires careful role-based access control and masking layers.

In your viva defense, admitting these limitations—and explaining your mitigation strategies (such as admin data seeding, caching, and privacy masking)—demonstrates mature engineering judgment.

Would you like to discuss how we mitigate the cold-start problem or how the privacy masking architecture works?`,
      suggestedFollowUps: [
        'How can we implement the project repository?',
        'Do we really need AI?',
        'Explain the architecture',
      ],
    }
  }

  // 0e. AI Necessity Inquiry
  if (p.includes('need ai') || p.includes('why use ai') || p.includes('is ai necessary')) {
    return {
      content: `To be completely honest as a software engineering mentor: **No, you do not strictly need AI for the baseline functionality of a project management system.**

A standard project management tool with task assignments, Kanban boards, and project search can be built entirely with deterministic web technologies: React, Node.js, Express, and a relational or document database. Standard full-text search handles repository queries reliably without any AI.

However, adding AI is justified when it solves problems that deterministic code cannot easily handle:

1. **Subjective Feature Feasibility Evaluation**: An AI Mentor can evaluate a student's proposed feature list (e.g. attempting real-time facial recognition and blockchain in 8 weeks) and provide an honest feasibility critique with trade-offs.
2. **Semantic Similarity & Research Gaps**: Beyond exact keyword matching, AI can recognize that "Smart Attendance with Face ID" and "Automated Biometric Classroom Check-in" tackle the exact same problem statement.
3. **Academic Proposal Drafting**: Transforming raw feature decisions into formal, 15-section IEEE 830 documentation saves students weeks of formatting friction while keeping academic structure consistent.

If you include AI, use it where it adds genuine pedagogical value—never add AI simply as a buzzword for marks, because examiners will probe whether a simple database query could have done the job.

Are you considering AI primarily for intelligent project search, idea feasibility evaluation, or automated proposal generation?`,
      suggestedFollowUps: [
        'Is this project suitable for a mini-project?',
        'Can we reduce the scope?',
        'Prepare a problem statement',
      ],
    }
  }

  // 0f. Scope Reduction Inquiry
  if (p.includes('reduce') && p.includes('scope')) {
    return {
      content: `Yes, reducing your scope is often the smartest engineering decision you can make for a college mini-project. Evaluators consistently award higher marks to a **clean, fully working core system** than to an ambitious project with multiple broken, half-implemented features.

Here is a practical framework to prune your scope down to a strong **Minimal Viable Capstone (MVC)**:

#### 1. Features to DEFER to "Future Work":
- **Real-Time Video/Audio Streaming (WebRTC)**: High networking complexity and server costs. Replace with asynchronous messaging or notes.
- **Blockchain Verification**: Almost never justified for a student project; standard database timestamps with audit logs are faster and realistic.
- **Automated Code Execution / Grading**: Requires complex sandboxing and security isolation.
- **Multi-Cloud Deployment**: Stick to a single free-tier provider (Vercel/Render/Railway).

#### 2. Features to KEEP in the Core Scope:
- **Role-Based Authentication**: Student and Faculty roles with protected routes.
- **Project & Task Workspace**: Creating a project, adding teammates, assigning tasks, and setting deadlines.
- **Academic Project Repository**: Browsing previous departmental projects with category filters.
- **Basic Milestone Submission**: Uploading project synopsis and status updates for guide review.

This core can be comfortably designed, coded, and tested in 4–6 weeks by a small student team.

Which specific feature in your current plan are you most concerned might be too time-consuming to build?`,
      suggestedFollowUps: [
        'Is this project suitable for a mini-project?',
        'How can we implement the project repository?',
        'Prepare a problem statement',
      ],
    }
  }

  // 0g. Problem Statement Formulation
  if (p.includes('problem statement')) {
    return {
      content: `### Academic Problem Statement Formulation

Here is a formal, IEEE-structured problem statement tailored for **CampusProjectHub** and academic project management systems:

---

#### 1. Context and Background
In undergraduate engineering institutions, capstone and semester mini-projects represent a cornerstone of practical technical education. However, academic project management workflows remain fragmented across disparate consumer tools (e.g. WhatsApp, Google Drive, Trello), leading to communication silos between students and faculty advisors.

#### 2. Core Problem Statement
Traditional academic project administration suffers from three chronic deficiencies:
1. **The Project Discovery Gap**: Graduating batch deliverables, architectures, and lessons learned are not preserved in a centralized searchable repository, causing successive cohorts to unknowingly repeat identical project ideas without technical advancement.
2. **Lack of Early Feasibility Assessment**: Students frequently propose unrealistic scopes or duplicate unviable architectures due to the absence of early technical critique before formal proposal submission.
3. **Fragmented Governance**: Faculty guides manage dozens of student teams without centralized milestone tracking, resulting in delayed blocker detection and inconsistent documentation standards.

#### 3. Impact
This fragmentation results in duplicated student effort, lost institutional knowledge, high faculty review overhead, and rushed last-minute submissions that fail university evaluation rubrics.

#### 4. Proposed Solution Objective
To design and implement a unified academic project platform that integrates student team collaboration, a living 33-field project repository with similarity analysis, an AI Mentor for feasibility evaluation, and automated IEEE 830 proposal generation.

---

Would you like to refine this problem statement for your specific department, or formulate the measurable project objectives next?`,
      suggestedFollowUps: [
        'Formulate the measurable project objectives',
        'What makes CampusProjectHub different?',
        'Can we reduce the scope?',
      ],
    }
  }

  // 0h. Repository Implementation
  if ((p.includes('implement') && p.includes('repository')) || p.includes('implement the project repository')) {
    return {
      content: `### Implementing the Academic Project Repository

Implementing the Academic Project Repository involves three core engineering layers: database architecture, search indexing, and asset management.

Here is the recommended technical approach:

1. **Database Schema (MongoDB & Mongoose)**:
   - Store projects in a structured collection with fields for \`title\`, \`department\`, \`academicYear\`, \`abstract\`, \`proposedSolution\`, \`features\`, \`technologyStack\`, and \`repositoryUrl\`.
   - Index high-cardinality query fields: compound indices on \`{ department: 1, academicYear: -1 }\`, multikey index on \`technologyStack.name\`, and text index on \`{ title: 'text', abstract: 'text' }\`.
2. **Search and Similarity Strategy**:
   - **Full-Text Discovery**: Use MongoDB \`$text\` search with \`$meta: "textScore"\` for fast keyword matching across project titles and abstracts.
   - **Academic Similarity Checking**: Implement tokenized Jaccard containment on normalized n-grams to detect thematic overlap against historical capstones without requiring expensive vector databases.
3. **Student Privacy & Contact Masking**:
   - In the API response serializer, mask student contact details (e.g. \`s****@college.edu\`, \`+91 98***-****\`) unless the senior explicitly accepts a guidance request via the consent gateway.
4. **Asset & Proposal Management**:
   - Store structured metadata in MongoDB and store large proposal PDFs, architecture diagrams, and demo screenshots in cloud object storage or static file grids.

One question to guide your implementation: Are you planning to use MongoDB or a relational database like PostgreSQL for storing your repository records?`,
      suggestedFollowUps: [
        'Explain the Three-Tier Architecture',
        'Do we really need AI for the repository?',
        'Prepare a problem statement',
      ],
    }
  }

  // 0i. Modules Explanation
  if (p.includes('explain its modules') || p.includes('explain the modules') || p.includes('what are its modules') || p.includes('16 modules')) {
    return {
      content: `CampusProjectHub is structured into 16 interconnected academic modules spanning the student and faculty lifecycle:

| # | Module Name | Target Role | Implementation Status | Core Purpose |
| :- | :--- | :--- | :--- | :--- |
| **1** | Student Project Management | Student | Implemented | Milestone tracking, stage gating, and capstone progress overview. |
| **2** | Task & Milestone Management | Student / Guide | Implemented | Phase deadlines, task assignment, and progress reporting. |
| **3** | Team Collaboration | Student Team | Implemented | Role allocation (Frontend, Backend, Research) and team activity feed. |
| **4** | Explore Projects | All Roles | Implemented | Departmental repository discovery with multi-parameter filtering. |
| **5** | Individual Project Details | All Roles | Implemented | Deep dossier view with screenshots, architecture, and masked contacts. |
| **6** | Academic Project Repository | All Roles | Implemented | 33-field Mongoose schema, seed benchmarks, and MongoDB persistence. |
| **7** | Senior-Junior Connection | Students / Alumni | Implemented | Dossier browsing and privacy-masked consent mentorship requests. |
| **8** | AI Project Mentor Workspace | Student | Implemented | Dedicated \`/ai-mentor\` full-page environment with streaming SSE. |
| **9** | Similarity Analysis Engine | Student / Guide | Implemented | Dual-stage token Jaccard containment and overlap scoring. |
| **10** | AI Feature Evaluation | Student | Implemented | 7-dimensional evaluation framework with viva question generation. |
| **11** | Project Scope Finalization | Student | Implemented | Student Accept/Reject/Modify controls producing frozen scope locks. |
| **12** | Academic Proposal Generator | Student | Implemented | 15 IEEE 830 sections with section-level AI refinement and diffs. |
| **13** | College Template Management | Faculty / Student | Implemented | Standard VTU / Autonomous university DOCX and PDF compliance. |
| **14** | Faculty Project Guidance | Faculty Guide | Implemented | Guide allocation, line-item feedback, and review queuing. |
| **15** | Submission & Approval Workflow | Student / Faculty | Implemented | Formal stage machine (\`DRAFT\` ➔ \`SUBMITTED\` ➔ \`APPROVED\`). |
| **16** | Admin Platform Management | Dept Admin | Implemented | Archive ingestion, user management, and immutable audit logs. |

For a student mini-project, you do not need all 16 modules—modules 1, 2, 4, 6, and 15 form the foundational core.

Which module would you like to explore in technical detail?`,
      suggestedFollowUps: [
        'How can we implement the project repository?',
        'Explain the architecture',
        'Can we reduce the scope?',
      ],
    }
  }

  // 0. Primary Reference Project Context: CampusProjectHub Architecture & Feasibility
  if (
    p.includes('campusprojecthub') ||
    p.includes('campus project hub') ||
    (p.includes('college project management') &&
      (p.includes('similar') || p.includes('evaluate') || p.includes('features') || p.includes('different')))
  ) {
    return {
      content: `### CampusProjectHub — Academic Architecture & Feasibility Audit

* **Primary Project Identified**: **CampusProjectHub** (AI-Powered Academic Project Management & Learning Platform)
* **Sample Repository Benchmark Cited**:
  - **Reference Record**: *Academic Project Management & Workflow Tracking Portal [Sample Historical Benchmark Data - For Academic Evaluation Demonstration]* (2023–24, Dept of Computer Science & Engineering)
  - **Provenance Disclosure**: *[Note: This is a realistic hypothetical record generated for academic evaluation demonstration of college project repositories. It does not represent an actual historical college project.]*

---

#### 1. Repository Overlap & Historical Gap Analysis
Traditional department project management systems were essentially **static CRUD portals** with basic tracking:
1. Basic student team registration forms and milestone date logs.
2. Binary faculty approve/reject buttons.
3. Unindexed PDF report uploads stored in flat server directories.

**What Makes CampusProjectHub Different**:
CampusProjectHub shifts the paradigm from **passive project bookkeeping** to an **active AI-assisted academic intelligence platform** combining 8 integrated capabilities:
1. **Academic Project Management**: Structured milestone tracking with stage gating.
2. **Student Team Collaboration**: Role allocation, shared task boards, and activity audit trails.
3. **College Project Discovery**: Multi-filter catalog search (department, technology, academic year) with student contact privacy masking.
4. **AI-Powered Project Similarity Analysis**: Token containment and semantic vector cosine matching (*Similarity != Plagiarism* guardrails).
5. **AI Feature Evaluation & Feasibility Assessment**: Pedagogical mentoring detecting scope creep and anticipated viva examiner questions.
6. **Academic Proposal Generation**: Automated problem statement, objectives, and methodology synthesis.
7. **College-Specific DOCX and PDF Templates**: Standardized academic document formatting (IEEE/VTU guidelines).
8. **Faculty Project Review & Approval**: Formal multi-state workflow (\`DRAFT\` ➔ \`SUBMITTED\` ➔ \`UNDER_REVIEW\` ➔ \`CHANGES_REQUESTED\` ➔ \`APPROVED\`).

---

#### 2. Feasibility & Implementation Constraints for a Student Mini-Project

When defending CampusProjectHub to an academic project review committee, examiners will scrutinize **Scope Feasibility**:

| Capability | High-Risk Trap (Scope Creep) | Recommended Mini-Project Implementation |
| :--- | :--- | :--- |
| **AI Similarity Engine** | Heavy remote vector databases requiring costly cloud GPUs | Lightweight character/token n-gram Jaccard containment with local embeddings fallback |
| **Proposal Templating** | Dynamic headless Chromium browser rendering (high memory/crash risk) | Deterministic programmatic templating using \`docx\` and \`pdfkit\` libraries |
| **Faculty Review Workflow** | Complex multi-tier college ERP hierarchy | Strict State Machine with immutable audit logging and role-based access control (RBAC) |
| **AI Project Mentor** | Generic third-party chat widget lacking context | Full-page dedicated workspace with streaming SSE and repository-grounded prompt injection |

---

#### 3. Key Viva Examiner Questions to Prepare:

> 1. *"How does your similarity engine distinguish between two completely different projects that merely share the same React and Python stack?"*
> **Your Defense**: Explain that your engine isolates \`RELATED_TECHNOLOGY_ONLY\` from \`SIMILAR_PROJECT_CONCEPT\`. Shared libraries or frameworks are filtered out from the conceptual similarity score to prevent false plagiarism flags.
>
> 2. *"How do you prevent students from viewing internal faculty rejection comments before official publication?"*
> **Your Defense**: Emphasize backend data masking at the controller layer: \`rejectionReason\` and internal review notes are stripped from public responses unless the requester's JWT or session role matches \`faculty\` or \`admin\`.

---

#### 4. Recommended Action Plan for Your Team:
1. **Milestone 1**: Lock down the Canonical Project Schema (33+ fields) and Mongoose repository indexes.
2. **Milestone 2**: Finalize the AI Project Mentor Workspace with Server-Sent Events (SSE) streaming and repository context injection.
3. **Milestone 3**: Implement deterministic DOCX/PDF proposal exports with college-specific cover sheets and reference citations.`,
      suggestedFollowUps: [
        'How do we design the database schema for the 8 core capabilities?',
        'How do we implement DOCX proposal generation without third-party cloud services?',
        'What are the security boundaries between Student and Faculty roles?',
      ],
      codeSnippet: {
        language: 'typescript',
        code: `// CampusProjectHub Core Capability Matrix
export interface CampusProjectHubManifest {
  capabilities: [
    'academic-project-management',
    'student-team-collaboration',
    'college-repository-discovery',
    'ai-similarity-analysis',
    'ai-feature-feasibility-evaluation',
    'academic-proposal-generation',
    'college-docx-pdf-templates',
    'faculty-review-approval'
  ]
}`,
      },
    }
  }

  // 1. Find Existing Projects / Repository Exploration
  if (p.includes('find existing') || p.includes('repository') || p.includes('previous projects') || p.includes('healthcare and machine learning')) {
    return {
      content: `### Academic Repository Analysis: Healthcare & ML Projects

Based on completed capstone projects in the **CampusProjectHub Academic Repository**, here are verified implementations and recommended patterns:

#### 1. Proven Reference Project: *AI Healthcare Prediction System*
* **Domain**: Clinical Decision Support / Supervised Learning
* **Dataset Used**: Cleveland Heart Disease + Pima Indians Diabetes Dataset
* **Core Pipeline**:
  1. Data Preprocessing: Imputation of zero values, StandardScaling, and SMOTE for class imbalance.
  2. Model Selection: Random Forest ensemble evaluated against XGBoost and SVM.
  3. Explainability: Integrated **SHAP (SHapley Additive exPlanations)** values so clinicians understand risk factors.
* **Key Academic Defense Tip**: Always explain *why* accuracy alone is insufficient for medical datasets—highlight **F1-Score** and **Recall (Sensitivity)** to prove you minimize false negatives.

#### 2. Architecture Comparison:
| Model / Tech | Best Academic Use Case | Examiner Red Flag |
| :--- | :--- | :--- |
| **Flask + Scikit-Learn** | Rapid proof-of-concept prototype | Inadequate for real-time batch queries |
| **FastAPI + ONNX Runtime** | Production-ready low-latency inference | High praise during technical viva |
| **Streamlit** | Acceptable for internal seminar | May lose marks if full-stack UI was required |

#### 3. Recommended Code Structure for Model Evaluation:
\`\`\`python
from sklearn.metrics import classification_report, roc_auc_score

def evaluate_clinical_model(model, X_test, y_test):
    predictions = model.predict(X_test)
    probs = model.predict_proba(X_test)[:, 1]
    
    print("--- Detailed Academic Performance Metrics ---")
    print(classification_report(y_test, predictions, target_names=["Low Risk", "High Risk"]))
    print(f"ROC-AUC Score: {roc_auc_score(y_test, probs):.4f}")
\`\`\`

Would you like me to inspect your team's proposed dataset or draft an abstract following standard IEEE formatting?`,
      suggestedFollowUps: [
        'How do we implement SHAP explainability in our frontend?',
        'Suggest 3 other top-rated projects in the repository',
        'Help draft an academic abstract for this project',
      ],
      codeSnippet: {
        language: 'python',
        code: `from sklearn.metrics import classification_report, roc_auc_score\n\ndef evaluate_clinical_model(model, X_test, y_test):\n    predictions = model.predict(X_test)\n    probs = model.predict_proba(X_test)[:, 1]\n    print(classification_report(y_test, predictions))\n    return roc_auc_score(y_test, probs)`,
      },
    }
  }

  // 2. Suggest Project Ideas / Capstone Ideation
  if (p.includes('suggest project') || p.includes('suggest 3') || p.includes('ideas') || p.includes('capstone')) {
    return {
      content: `### Curated Capstone Project Concepts (2025–2026 Academic Year)

Here are three high-impact project ideas designed to meet university evaluation rubrics with strong innovation and practical feasibility:

---

#### 💡 Idea 1: *Automated Academic Credential Verification via Merkle Trees*
* **Core Problem**: Manual verification of transcripts and certificates during university admissions and employer background checks is slow and vulnerable to forgery.
* **Technology Stack**: React, TypeScript, Node.js / Express, PostgreSQL, SHA-256 Merkle Proofs.
* **Innovation Factor**: Cryptographic verification without requiring expensive public blockchain gas fees.
* **Feasibility Score**: **9.2 / 10** (Complete in 10–12 weeks).
* **Viva High Point**: Clear demonstration of tree traversal and tamper detection.

---

#### 💡 Idea 2: *Edge-AI Classroom Engagement & Ambient Noise Analytics*
* **Core Problem**: Faculty lack quantitative metrics on student participation, audio acoustics, and lecture engagement in large lecture halls.
* **Technology Stack**: Python, MediaPipe Pose, YOLOv8, React Dashboard, SQLite/TimescaleDB.
* **Innovation Factor**: Real-time privacy-preserving edge analytics (no raw video stored, only numerical keypoints).
* **Feasibility Score**: **8.5 / 10** (Complete in 12–14 weeks).
* **Viva High Point**: Solving privacy and GDPR/FERPA concerns by discarding frames immediately after inference.

---

#### 💡 Idea 3: *Intelligent Campus Energy & Load Forecasting System*
* **Core Problem**: Academic institutions incur peak electricity penalties due to uncoordinated HVAC, lab equipment, and lighting schedules.
* **Technology Stack**: React, FastAPI, Prophet / LSTM, MQTT Broker, PostgreSQL.
* **Innovation Factor**: Time-series forecasting paired with actionable automated load-shedding recommendations.
* **Feasibility Score**: **8.8 / 10** (Complete in 10–12 weeks).

Which of these three directions aligns best with your team's departmental interests?`,
      suggestedFollowUps: [
        'Break down Idea 1 (Merkle Trees) into a 12-week roadmap',
        'What hardware sensors would Idea 3 (Energy Forecasting) need?',
        'Can we combine Idea 1 and Idea 2 for a broader scope?',
      ],
    }
  }

  // 3. Evaluate My Features / Scope Audit
  if (p.includes('evaluate') || p.includes('features') || p.includes('scope') || p.includes('campus management system')) {
    return {
      content: `### Honest Faculty Evaluation: Feature Scope Audit

Project Under Review: **Smart Campus Management System (Face Recognition, Timetable, Payments)**

#### 🚨 Scope Creep Risk Assessment: **HIGH (Score: 4.5/10 on focus)**
* **The Academic Problem**: You are attempting to bundle three completely independent multi-month capstone projects into one.
* **Examiner Mindset**: When examiners see a team attempting Face Recognition + Complex Constraint Scheduling + PCI-compliant Payments, their immediate reaction is: *"They used pre-made GitHub templates and understand none of them deeply."*

---

#### Recommended Scope Refinement (The 80/20 Rule):
1. **Core Pillar (70% Effort)**:
   * Keep **Automated Timetable Scheduling with Genetic Algorithms / Constraint Satisfaction (CSP)**. This has immense mathematical and algorithmic depth that faculty love to grade.
2. **Supporting Module (30% Effort)**:
   * Pair it with a **Role-Based Conflict Resolution Dashboard** (Student vs. Faculty clash detection).
3. **Drop or Mock**:
   * Drop live Face Recognition—replace it with a standard QR/RFID simulation.
   * Drop real Payment Gateways—use a sandbox Razorpay/Stripe test-key mock.

#### Anticipated Viva Examiner Traps:
* *"Explain your Genetic Algorithm's fitness function. What weights did you assign to teacher preferences vs. room capacity?"*
* *"How does your algorithm avoid local optima (premature convergence)?"*
* *"What is the computational complexity of your schedule matrix generation?"*

Would you like me to formulate the mathematical fitness function for your scheduling engine?`,
      suggestedFollowUps: [
        'Yes, write the mathematical fitness function for the scheduler',
        'How do we explain why we dropped Face Recognition in our report?',
        'Give us a project timeline for the refined timetable scope',
      ],
    }
  }

  // 4. Explain An Existing Project / Architecture Deep Dive
  if (p.includes('explain') || p.includes('architecture') || p.includes('data pipeline') || p.includes('disease prediction')) {
    return {
      content: `### Technical Deep Dive: AI Disease Prediction System Architecture

Here is the complete architectural blueprint and defense strategy for clinical decision support systems:

#### 1. End-to-End Data Pipeline Architecture:
\`\`\`
[ Raw Medical Data ]
        │
        ▼
[ Preprocessing Layer ] ──> Imputation (KNN/Median) + One-Hot Encoding
        │
        ▼
[ Feature Engineering ] ──> Correlation Matrix + Recursive Feature Elimination (RFE)
        │
        ▼
[ Model Pipeline ]      ──> Scaled Vector ──> Ensemble Classifier (Random Forest + XGBoost)
        │
        ▼
[ Explainability ]      ──> TreeSHAP Explainer (Local Feature Contribution)
        │
        ▼
[ API / Client UI ]     ──> FastAPI async endpoint ──> React TypeScript Dashboard
\`\`\`

#### 2. Model Defense Strategy During Viva:
* **Handling Class Imbalance**: If 95% of patients are healthy and 5% have heart disease, a naive model predicting "Healthy" achieves 95% accuracy while being practically useless.
  * **Your Answer**: *"We utilized Synthetic Minority Over-sampling Technique (SMOTE) combined with stratified 5-fold cross-validation to maintain real clinical distribution without data leakage."*
* **Clinical Interpretability**:
  * **Your Answer**: *"We did not deploy a black-box model. We integrated SHAP force plots to explain to the physician exactly which biomarkers (e.g. Troponin-T, ST-elevation) elevated the risk score."*

#### 3. API Contract Definition (FastAPI):
\`\`\`python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

class PatientVitals(BaseModel):
    age: int = Field(..., ge=18, le=110)
    systolic_bp: int = Field(..., ge=70, le=240)
    cholesterol: int = Field(..., ge=100, le=500)
    fasting_blood_sugar: bool

@app.post("/api/v1/predict-cardiac-risk")
async def predict_risk(data: PatientVitals):
    features = preprocess(data)
    risk_score = model.predict_proba(features)[0][1]
    shap_values = explainer.shap_values(features)
    return {
        "risk_percentage": round(risk_score * 100, 2),
        "risk_tier": "High" if risk_score > 0.65 else "Moderate" if risk_score > 0.35 else "Low",
        "primary_drivers": extract_top_drivers(shap_values)
    }
\`\`\`

Would you like me to generate sample ER diagrams or the formal IEEE bibliography citations?`,
      suggestedFollowUps: [
        'Generate sample ER diagram entities for patient medical records',
        'How do we handle multi-class disease prediction?',
        'Write the Project Abstract following IEEE guidelines',
      ],
      codeSnippet: {
        language: 'python',
        code: `@app.post("/api/v1/predict-cardiac-risk")\nasync def predict_risk(data: PatientVitals):\n    features = preprocess(data)\n    risk_score = model.predict_proba(features)[0][1]\n    return {"risk_percentage": round(risk_score * 100, 2)}`,
      },
    }
  }

  // General academic queries fallback
  return {
    content: `### Academic Mentorship Analysis

Regarding your inquiry: **"${prompt}"**

#### 1. Academic Guidance & Recommendation:
* In academic capstone evaluations, faculty committees prioritize **methodology transparency**, **reproducibility**, and **thorough testing documentation** above flashy visual animations.
* Ensure you document your system requirements with formal **Functional Requirements (FR)** and **Non-Functional Requirements (NFR)** adhering to IEEE 830 standards.

#### 2. Key Milestones for Your Project Dossier:
1. **Problem Formulation**: Cite at least 3 recent academic papers (2022–2025) establishing the gap.
2. **System Architecture**: Include high-level Level-0 and Level-1 Data Flow Diagrams (DFD) or UML Component Diagrams.
3. **Evaluation Protocol**: Quantify your outcomes with formal benchmark metrics (e.g., Latency, Throughput, Precision/Recall, or Usability System Usability Scale - SUS).

#### 3. Code Quality Standard:
\`\`\`typescript
// Standard academic error handling contract
export interface ProjectEvaluationResult<T> {
  success: boolean
  data?: T
  academicConfidenceScore: number // 0.0 to 1.0
  validationErrors?: string[]
}
\`\`\`

How would you like to proceed? We can deep dive into your architecture, formulate your viva defense responses, or structure your report chapters.`,
    suggestedFollowUps: [
      'Help me draft my IEEE Project Abstract',
      'What UML diagrams do examiners demand in Phase 1 review?',
      'How to conduct a literature survey with IEEE and ACM papers?',
    ],
  }
}

// Storage helpers
export function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch (err) {
    console.warn('Could not read conversations from localStorage, falling back to defaults', err)
  }
  return INITIAL_CONVERSATIONS
}

export function saveConversations(conversations: Conversation[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations))
  } catch (err) {
    console.warn('Could not save conversations to localStorage', err)
  }
}

export function loadSettings(): MentorSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) {
      return JSON.parse(raw)
    }
  } catch (err) {
    console.warn('Could not read settings from localStorage', err)
  }
  return DEFAULT_SETTINGS
}

export function saveSettings(settings: MentorSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch (err) {
    console.warn('Could not save settings to localStorage', err)
  }
}
