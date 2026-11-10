import { config } from '../../config/env.js'
import {
  IAIProvider,
  GenerateOptions,
  AIProviderResponse,
  StreamCallbacks,
} from './ai.types.js'

export const SYSTEM_MENTOR_PROMPT = `You are "CampusProjectHub AI Mentor — Your Honest Academic Project Guide."

Your core mission is to help university students build technically sound, methodologically rigorous, and realistic final-year and semester capstone projects.

Behavioral Guidelines:
1. Be educational, direct, constructive, and friendly like an experienced software engineering professor.
2. Do not blindly agree with student suggestions or validate flawed assumptions.
3. Critically analyze technical complexity, scope creep, and implementation feasibility.
4. When student queries are vague, ask ONE relevant, clarifying question at a time.
5. Preserve the context of the current project conversation across message turns.
6. Do NOT respond with generic scripts, guidance mode lists, or repeated self-introductions when the student introduces an idea or asks a technical question.
7. Address the student's actual question directly and immediately.
8. NEVER invent college project records or claim internal repository searches have occurred.
9. NEVER fabricate references, research papers, benchmark results, or implementation claims. If citing standards, reference verified real entities (e.g., IEEE 830, ACM Digital Library, OWASP Top 10, RFC 7519).
10. Support English, Kannada (ಕನ್ನಡ), and Hindi (हिन्दी) natively when the student communicates in those languages.
11. Format your responses with structured Markdown: use clear headings, concise bullet lists, Markdown tables for comparisons, and formatted code blocks with language indicators where appropriate.

12. PRIMARY PROJECT CONTEXT & BENCHMARKING:
The project being developed is CampusProjectHub — an AI-powered academic project management and learning platform designed for college students and faculty.
Its 8 core capabilities include:
1. Academic project management.
2. Student team collaboration.
3. College project repository and discovery.
4. AI-powered project similarity analysis.
5. AI feature evaluation and feasibility assessment.
6. Academic proposal generation.
7. College-specific DOCX and PDF proposal templates.
8. Faculty project review and approval.

When evaluating CampusProjectHub, evaluate its actual architecture and 8 capabilities rather than introducing unrelated examples.
When demonstrating repository intelligence, use realistic hypothetical records related to college project management platforms, clearly labelled as sample data (e.g. "[Sample Historical Benchmark Data - For Academic Evaluation Demonstration]"). Never represent hypothetical records as actual historical college projects.
Keep all advice aligned with mini-project objectives, realistic implementation constraints, and university evaluation criteria.`

/**
 * High-Fidelity Mock Provider for offline development, CI tests, and zero-cost local usage
 */
export class MockAcademicMentorProvider implements IAIProvider {
  name = 'mock'

  isAvailable(): boolean {
    return true
  }

  async generateResponse(options: GenerateOptions): Promise<AIProviderResponse> {
    const lastUserMsg = [...options.messages].reverse().find((m) => m.role === 'user')
    const prompt = lastUserMsg?.content || ''
    const content = this.craftAcademicResponse(prompt, options.systemPrompt)

    return {
      content,
      model: 'campusprojecthub-academic-v1-mock',
      provider: 'mock',
      tokensUsed: Math.ceil(content.length / 4),
    }
  }

  async streamResponse(options: GenerateOptions, callbacks: StreamCallbacks): Promise<void> {
    const lastUserMsg = [...options.messages].reverse().find((m) => m.role === 'user')
    const prompt = lastUserMsg?.content || ''
    const fullText = this.craftAcademicResponse(prompt, options.systemPrompt)

    // Token chunking simulation: stream word by word with slight realistic jitter
    const words = fullText.split(/(\s+)/)
    let accumulated = ''

    for (let i = 0; i < words.length; i++) {
      if (options.abortSignal?.aborted) {
        break
      }
      const token = words[i]
      accumulated += token
      callbacks.onToken(token)

      // Slight natural delay between words
      if (token.trim().length > 0) {
        await new Promise((r) => setTimeout(r, 20))
      }
    }

    callbacks.onComplete(accumulated, {
      model: 'campusprojecthub-academic-v1-mock',
      provider: 'mock',
      tokensUsed: Math.ceil(accumulated.length / 4),
    })
  }

  private craftAcademicResponse(prompt: string, systemPrompt?: string): string {
    const p = prompt.toLowerCase()
    const sys = systemPrompt || ''

    // Grounded Conversational Engine Response injection
    if (sys.includes('[CONVERSATIONAL_ENGINE_RESPONSE]')) {
      const match = sys.match(/\[CONVERSATIONAL_ENGINE_RESPONSE\]\n([\s\S]+)$/)
      if (match && match[1] && match[1].trim().length > 0) {
        return match[1].trim()
      }
    }

    // Grounded Repository Context handling
    if (
      sys.includes('COLLEGE REPOSITORY INTELLIGENCE DETECTED') ||
      sys.includes('Verified Campus Repository Records Detected:')
    ) {
      const titleMatch =
        sys.match(/Matched Historical Record: "([^"]+)"/) ||
        sys.match(/Previous Project: "([^"]+)"/)
      const yearMatch = sys.match(/Academic Year: ([^\n]+)/)
      const deptMatch = sys.match(/Department: ([^\n]+)/)
      const projTitle = titleMatch ? titleMatch[1] : 'Smart Attendance Management System'
      const projMeta =
        yearMatch && deptMatch
          ? `${yearMatch[1].trim()}, Dept of ${deptMatch[1].trim()}`
          : '2024-2025, Dept of Computer Science & Engineering'
      const confMatch = sys.match(/\[Confirmed from Project Documentation: ([^\]]+)\]/)
      const isConfirmed = confMatch ? confMatch[1] : 'Yes'
      const missingMatch = sys.match(/\[Not Available in Documented Record: ([^\]]+)\]/)
      const missing = missingMatch ? missingMatch[1].trim() : 'None noted'

      return `### Campus Repository Records & Academic Grounding Analysis

* **Verified Repository Record Detected**:
  - **Previous Project**: **${projTitle}** (${projMeta})
  - **Source Attribution**: [Confirmed from Project Documentation: ${isConfirmed}]
  - **Documented Gaps in Record**: [Not Available in Documented Record: ${missing}]
  - **Integrity Notice**: In academic project evaluation, **similarity is not plagiarism**. However, your faculty evaluation panel requires clear evidence of technical advancement over previous cohorts.

#### Critical Architecture Critique:
Your proposed idea overlaps with the core problem statement and feature baseline of **${projTitle}**. Simply rebuilding an existing system with cosmetic UI changes will fail department defense criteria.

#### Key Question for Your Project Defense:
> *"Your proposed idea overlaps with its core functionality. What new capability or meaningful improvement are you planning?"*

To strengthen your capstone proposal, consider:
1. **Algorithmic Edge**: Benchmark your performance against the previous implementation's documented limitations.
2. **Architecture**: Implement enterprise-grade edge processing or privacy-preserving local execution.
3. **Formal Evaluation**: Propose quantitative empirical metrics to defend in your viva.`
    }

    // PRIMARY REFERENCE EVALUATION: CampusProjectHub
    if (
      p.includes('campusprojecthub') ||
      p.includes('campus project hub') ||
      (p.includes('college project management') &&
        (p.includes('similar') || p.includes('evaluate') || p.includes('features') || p.includes('different')))
    ) {
      // Check for specific Master Knowledge sub-queries first
      if (
        sys.includes('SENIOR-JUNIOR CONNECTION') ||
        ((p.includes('senior') || p.includes('junior')) && (p.includes('connect') || p.includes('mentorship') || p.includes('guidance') || p.includes('contact') || p.includes('privacy')))
      ) {
        return `### CampusProjectHub — Senior-Junior Knowledge Network & Mentorship Architecture

* **Core Principle**: Transform past capstone projects into permanent institutional mentorship assets rather than lost graduating artifacts.

---

#### 1. The Preserved Project Dossier
When seniors complete their capstone in CampusProjectHub, their repository submission preserves far more than a flat PDF:
* **System Architecture**: High-level block diagrams and dataflow specifications.
* **Source Repositories**: Grounded GitHub/GitLab links and active demo URLs.
* **Documented Hurdles & Solutions**: Real technical bottlenecks encountered (e.g. state management race conditions, database indexing bottlenecks) and how the team resolved them.
* **Future Enhancements**: Recommended follow-ups left explicitly for subsequent student batches.

#### 2. Consent-Based Mentorship Gateway
Juniors do not receive raw contact information. CampusProjectHub enforces a strict **Zero-Leakage Privacy Boundary**:
1. **Masked Public Identity**: Student emails and phone numbers are displayed with privacy masks (e.g., \`s****@college.edu\`, \`+91 98***-****\`).
2. **In-Platform Request Gateway**: Juniors submit a formal mentorship inquiry specifying their proposed project idea and technical questions.
3. **Voluntary Senior Opt-In**: The senior receives an in-platform notification and decides whether to accept guidance, keeping full control over their availability.

#### 3. Expected Viva Examiner Question on Senior Guidance:
> *"Does connecting juniors with previous seniors encourage code copying or academic plagiarism?"*
> **Your Defense**: Explain that CampusProjectHub decouples **conceptual guidance** from **code duplication**. The built-in similarity engine benchmarks the junior's submitted proposal against the senior's archived repository, actively verifying that the junior's work provides a genuine architectural progression rather than a verbatim clone.`
      }

      if (
        sys.includes('16 FUNCTIONAL MODULES') ||
        p.includes('16 modules') ||
        p.includes('functional modules') ||
        (p.includes('what modules') && p.includes('campusprojecthub'))
      ) {
        return `### CampusProjectHub — 16 Functional Modules Comprehensive Breakdown

CampusProjectHub is structured into 16 interconnected academic modules spanning the student and faculty lifecycle:

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

Every module is architected with strict boundary separation, role-based access control, and zero external proprietary lock-in.`
      }

      if (
        sys.includes('PROBLEM STATEMENT') ||
        ((p.includes('problem') || p.includes('why')) && (p.includes('solve') || p.includes('created') || p.includes('need') || p.includes('statement')))
      ) {
        return `### CampusProjectHub — Academic Problem Statement Analysis

CampusProjectHub was engineered to resolve the **8 chronic failure modes** of traditional college capstone management:

1. **The Project Discovery Gap**: Students cannot easily view past department projects, leading to uninformed topic selection.
2. **Repeated Project Ideas**: Identical projects (e.g. generic hospital or library management) recur every two years without advancing technical depth.
3. **Lost Project Knowledge**: Valuable capstone research, architecture diagrams, and lessons learned disappear into unindexed shelves or Google Drives upon graduation.
4. **Senior-Junior Communication Gap**: Juniors lack structured, privacy-preserving channels to consult alumni or seniors who solved similar engineering challenges.
5. **Tool Fragmentation & Disconnection**: Teams juggle WhatsApp groups, Google Docs, Trello boards, and email threads, scattering critical project artifacts.
6. **Team Coordination Breakdowns**: Lack of role clarity leads to unbalanced workloads, unresolved blockers, and last-minute panic before reviews.
7. **Limited Faculty Visibility**: Faculty guides struggle to monitor authentic progress across dozens of teams, discovering scope bloat or project stagnation only days before evaluations.
8. **Documentation Bottlenecks**: Students spend disproportionate time struggling with IEEE 830 formatting, cover pages, and citation structures rather than core engineering.

CampusProjectHub unifies all eight dimensions into an integrated, AI-guided academic ecosystem.`
      }

      if (
        sys.includes('SECURITY & PRIVACY') ||
        p.includes('security') || p.includes('privacy') || p.includes('masking') || p.includes('rbac')
      ) {
        return `### CampusProjectHub — Security, Privacy & Data Protection Architecture

CampusProjectHub enforces strict enterprise-grade security tailored to academic institution environments:

#### 1. Role-Based Access Control (RBAC) & Ownership Enforcement
* **Three Canonical Roles**: \`student\`, \`faculty\`, and \`admin\`.
* **Resource Ownership Guard**: Authenticated JWT credentials are cross-checked against document \`ownerId\`. Any attempt by a student to access, mutate, or delete another student's conversation, feature evaluation, or proposal draft returns HTTP \`403 Forbidden\`.

#### 2. Student Privacy & PII Contact Masking
* **Zero Leakage**: Student phone numbers and personal emails are never broadcast across public repository listings.
* **Transformation Mask**: Output sanitizers render emails as \`s****@college.edu\` and phone numbers as \`+91 98***-****\`.
* **Controlled Mentorship**: Junior requests pass through an in-platform messaging consent gate without exposing private contact credentials.

#### 3. Faculty Internal Critique Shielding
* Internal review notes, grading commentary, and rejected draft justifications are explicitly masked from unauthorized viewers until formal committee publication.

#### 4. Runtime Payload Validation
* Every incoming API request is strictly parsed through **Zod schemas** before reaching controller logic, eliminating NoSQL injection, prototype pollution, and malformed payloads.`
      }

      if (
        sys.includes('LIMITATIONS & ROADMAP') ||
        p.includes('limitation') || p.includes('boundary') || p.includes('drawback')
      ) {
        return `### CampusProjectHub — Architectural Limitations & Engineering Boundaries

In keeping with academic engineering honesty, CampusProjectHub explicitly defines its current system boundaries:

1. **AI Inference Modes**:
   - High-fidelity **deterministic mock engine** runs locally out-of-the-box with zero API keys or external expenses.
   - Cloud inference requires configuring a valid \`GEMINI_API_KEY\` in environment settings.
2. **Voice Mentorship Interface**:
   - The current workspace provides an active **visual waveform preview and audio synthesis simulation**.
   - Peer-to-peer full-duplex WebRTC voice mesh was evaluated and formally classified as \`UNNECESSARY\` for initial release to prevent semester scope creep.
3. **Template Customization**:
   - Standard VTU / Autonomous CSE templates with complete IEEE 830 sections are built-in.
   - A drag-and-drop custom college template designer is part of the Phase II roadmap (Task 6).
4. **In-Memory Fallback Persistence**:
   - Seamless dual-mode fallback enables instant local testing without MongoDB running.
   - In-memory fallback stores are ephemeral and will reset when the Node.js server process restarts.
5. **University ERP Integration**:
   - Direct two-way sync with proprietary university ERP/SIS systems is kept out-of-scope for the capstone to avoid brittle institutional firewall dependencies.`
      }

      return `### CampusProjectHub — Academic Architecture & Feasibility Audit

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
3. **Milestone 3**: Implement deterministic DOCX/PDF proposal exports with college-specific cover sheets and reference citations.`
    }

    // Multilingual handling: Kannada
    if (/[\u0C80-\u0CFF]/.test(prompt) || p.includes('kannada') || p.includes('ಕನ್ನಡ')) {
      return `### ಶೈಕ್ಷಣಿಕ ಯೋಜನಾ ಮಾರ್ಗದರ್ಶನ (Academic Project Guidance)

ನಮಸ್ಕಾರ! ನಿಮ್ಮ ಪ್ರಾಜೆಕ್ಟ್ ಕುರಿತಾದ ಪ್ರಶ್ನೆಗೆ ಧನ್ಯವಾದಗಳು.

* **ಗಮನಿಸಿ:** CampusProjectHub ರೆಪೊಸಿಟರಿ ಶೋಧನಾ ಬುದ್ಧಿಮತ್ತೆ (Repository Intelligence) ಪ್ರಸ್ತುತ ಅಭಿವೃದ್ಧಿ ಹಂತದಲ್ಲಿದೆ.
* **ತಾಂತ್ರಿಕ ವಿಶ್ಲೇಷಣೆ:** ನಿಮ್ಮ ಪ್ರಾಜೆಕ್ಟ್‌ನ ಮೂಲ ವಾಸ್ತುಶಿಲ್ಪವನ್ನು (Architecture) ಸ್ಪಷ್ಟವಾಗಿ ರೂಪಿಸಿಕೊಳ್ಳಿ. ಡೇಟಾಬೇಸ್ ವಿನ್ಯಾಸ ಮತ್ತು API ಭದ್ರತೆಗೆ ಮೊದಲ ಆದ್ಯತೆ ನೀಡಿ.
* **ವಿವಾ ತಯಾರಿ:** ನೀವು ಆಯ್ಕೆ ಮಾಡಿಕೊಂಡ ತಂತ್ರಜ್ಞಾನದ ಸಾಧಕ-ಬಾಧಕಗಳನ್ನು (Pros & Cons) ಪರೀಕ್ಷಕರಿಗೆ ವಿವರಿಸಲು ಸಿದ್ಧರಾಗಿರಿ.

ನಿಮ್ಮ ಯೋಜನೆಯಲ್ಲಿ ನೀವು ಯಾವ ನಿರ್ದಿಷ್ಟ ಮಾಡ್ಯೂಲ್ ಅನ್ನು ಮೊದಲು ಪ್ರಾರಂಭಿಸಲು ಯೋಜಿಸುತ್ತಿದ್ದೀರಿ?`
    }

    // Multilingual handling: Hindi
    if (/[\u0900-\u097F]/.test(prompt) || p.includes('hindi') || p.includes('हिंदी')) {
      return `### शैक्षणिक प्रोजेक्ट मार्गदर्शन (Academic Project Guidance)

नमस्ते! आपके प्रोजेक्ट से जुड़े प्रश्न का स्वागत है।

* **महत्वपूर्ण सूचना:** CampusProjectHub रिपॉजिटरी सर्च इंटेलिजेंस वर्तमान में विकास के चरण में है।
* **तकनीकी मूल्यांकन:** अपने प्रोजेक्ट के स्कोप को सीमित और स्पष्ट रखें। डेटाबेस सामान्यीकरण (Normalization) और एपीआई सुरक्षा (API Security) पर विशेष ध्यान दें।
* **वाइवा (Viva) रक्षा:** परीक्षकों के सामने यह स्पष्ट रूप से समझाएं कि आपने इस विशिष्ट टेक-स्टैक का चयन क्यों किया।

क्या आप अपने प्रोजेक्ट के सबसे चुनौतीपूर्ण मॉड्यूल के बारे में स्पष्ट कर सकते हैं?`
    }

    // Domain query: Feasibility / Feature Scope
    if (p.includes('evaluate') || p.includes('scope') || p.includes('feasibility') || p.includes('feature')) {
      return `### Academic Feature Scope & Feasibility Audit

* **Notice**: *CampusProjectHub academic repository search intelligence is currently in development. The following critique is based on university capstone evaluation rubrics.*

#### 1. Critical Scope Assessment
When evaluating this scope for a semester capstone, the primary risk is **Scope Creep**. Attempting to implement multiple unrelated complex systems (e.g. real-time biometric scanning + automated scheduling + financial payment processing) in a single student semester leads to superficial prototypes that fail faculty scrutiny.

#### 2. Architecture Recommendation
* **Core Focus (70% effort)**: Pick one high-value algorithmic challenge where you can demonstrate computational depth.
* **Supporting Layer (30% effort)**: Implement robust role-based access control (RBAC) and data persistence.
* **Simulate Non-Core Services**: Mock third-party APIs (such as SMS gateways or payment webhooks) rather than losing weeks to integration troubleshooting.

#### 3. Expected Examiner Question:
> *"What is the time complexity of your primary processing algorithm under peak concurrent loads?"*

What is the single most critical feature your team aims to complete for the first internal milestone?`
    }

    // Default Academic Guidance
    return `### CampusProjectHub AI Mentor — Your Honest Academic Project Guide

That is an important engineering question for your academic capstone project.

#### Core Software Engineering Recommendations:
1. **Requirements & Scope**: Distinguish essential core deliverables from decorative extensions. Keep initial milestones focused on verifiable functionality.
2. **Architecture**: Implement clear boundary separation between presentation, domain logic, and persistence layers.
3. **Evaluation Defensibility**: Prepare empirical metrics or unit tests to demonstrate technical correctness during faculty evaluations.

Would you like to explore how this fits into your overall project scope, or would you like to examine a concrete implementation pattern?`
  }
}

/**
 * Google Gemini Provider Adapter
 */
export class GeminiAIProvider implements IAIProvider {
  name = 'gemini'
  private apiKey: string
  private model: string

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || config.GEMINI_API_KEY || ''
    this.model = model || config.GEMINI_MODEL || 'gemini-1.5-flash'
  }

  isAvailable(): boolean {
    return !!this.apiKey && this.apiKey.length > 5
  }

  async generateResponse(options: GenerateOptions): Promise<AIProviderResponse> {
    if (!this.isAvailable()) {
      throw new Error('Gemini API key is not configured on the backend.')
    }

    const contents = options.messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [{ text: options.systemPrompt || SYSTEM_MENTOR_PROMPT }],
        },
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxTokens ?? 2048,
        },
      }),
      signal: options.abortSignal,
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Gemini API error (${res.status}): ${errText}`)
    }

    const data: any = await res.json()
    const content =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      'No response generated by the Gemini model.'

    return {
      content,
      model: this.model,
      provider: 'gemini',
      tokensUsed: data.usageMetadata?.totalTokenCount,
    }
  }

  async streamResponse(options: GenerateOptions, callbacks: StreamCallbacks): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Gemini API key is not configured on the backend.')
    }

    const contents = options.messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:streamGenerateContent?alt=sse&key=${this.apiKey}`

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [{ text: options.systemPrompt || SYSTEM_MENTOR_PROMPT }],
        },
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxTokens ?? 2048,
        },
      }),
      signal: options.abortSignal,
    })

    if (!res.ok || !res.body) {
      const errText = await res.text()
      throw new Error(`Gemini Stream error (${res.status}): ${errText}`)
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let accumulated = ''
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.substring(6).trim()
            if (jsonStr) {
              try {
                const parsed = JSON.parse(jsonStr)
                const textChunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text
                if (textChunk) {
                  accumulated += textChunk
                  callbacks.onToken(textChunk)
                }
              } catch (_) {}
            }
          }
        }
      }

      callbacks.onComplete(accumulated, {
        model: this.model,
        provider: 'gemini',
      })
    } catch (err: any) {
      callbacks.onError(err)
    }
  }
}

/**
 * OpenAI Provider Adapter
 */
export class OpenAIProvider implements IAIProvider {
  name = 'openai'
  private apiKey: string
  private model: string

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || config.OPENAI_API_KEY || ''
    this.model = model || config.OPENAI_MODEL || 'gpt-4o-mini'
  }

  isAvailable(): boolean {
    return !!this.apiKey && this.apiKey.length > 5
  }

  async generateResponse(options: GenerateOptions): Promise<AIProviderResponse> {
    if (!this.isAvailable()) {
      throw new Error('OpenAI API key is not configured on the backend.')
    }

    const messages = [
      { role: 'system', content: options.systemPrompt || SYSTEM_MENTOR_PROMPT },
      ...options.messages.map((m) => ({ role: m.role, content: m.content })),
    ]

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2048,
      }),
      signal: options.abortSignal,
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`OpenAI API error (${res.status}): ${errText}`)
    }

    const data: any = await res.json()
    const content = data.choices?.[0]?.message?.content || ''

    return {
      content,
      model: this.model,
      provider: 'openai',
      tokensUsed: data.usage?.total_tokens,
    }
  }

  async streamResponse(options: GenerateOptions, callbacks: StreamCallbacks): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('OpenAI API key is not configured on the backend.')
    }

    const messages = [
      { role: 'system', content: options.systemPrompt || SYSTEM_MENTOR_PROMPT },
      ...options.messages.map((m) => ({ role: m.role, content: m.content })),
    ]

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2048,
        stream: true,
      }),
      signal: options.abortSignal,
    })

    if (!res.ok || !res.body) {
      const errText = await res.text()
      throw new Error(`OpenAI Stream error (${res.status}): ${errText}`)
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let accumulated = ''
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.substring(6).trim()
            if (dataStr === '[DONE]') break
            try {
              const parsed = JSON.parse(dataStr)
              const token = parsed.choices?.[0]?.delta?.content
              if (token) {
                accumulated += token
                callbacks.onToken(token)
              }
            } catch (_) {}
          }
        }
      }

      callbacks.onComplete(accumulated, {
        model: this.model,
        provider: 'openai',
      })
    } catch (err: any) {
      callbacks.onError(err)
    }
  }
}

/**
 * Provider Resolver Factory
 */
export function getAIProvider(): IAIProvider {
  const chosen = config.AI_PROVIDER

  if (chosen === 'gemini') {
    const gemini = new GeminiAIProvider()
    if (gemini.isAvailable()) return gemini
    console.warn('[AI Provider] AI_PROVIDER=gemini chosen, but GEMINI_API_KEY is missing. Falling back to MockAcademicMentorProvider.')
  } else if (chosen === 'openai') {
    const openai = new OpenAIProvider()
    if (openai.isAvailable()) return openai
    console.warn('[AI Provider] AI_PROVIDER=openai chosen, but OPENAI_API_KEY is missing. Falling back to MockAcademicMentorProvider.')
  }

  return new MockAcademicMentorProvider()
}
