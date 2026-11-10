import type {
  ExperienceLevel,
  IConversationContext,
} from '../conversational-engine/context.types.js'
import type {
  ExplanationStyle,
  IStudentLearningProfile,
  PreferredCommunicationLanguage,
} from './learningProfile.model.js'

export type DetectedLanguage = 'en' | 'kn' | 'hi'

export class AdaptiveTeachingEngine {
  /**
   * Detects English, Kannada (Unicode or romanized/requested), or Hindi (Devanagari or Hinglish/requested)
   */
  detectMessageLanguage(message: string): {
    detected: DetectedLanguage
    explicitSwitch?: PreferredCommunicationLanguage
    isMixedLanguage: boolean
  } {
    const lower = message.toLowerCase()

    // Explicit manual language switch requests
    if (
      /\b(?:in kannada|switch(?: language)? to kannada|kannada alli|kannadadalli)\b/i.test(lower) ||
      /ಕನ್ನಡದಲ್ಲಿ/.test(message)
    ) {
      return { detected: 'kn', explicitSwitch: 'kn', isMixedLanguage: /[a-z]/i.test(message) }
    }
    if (
      /\b(?:in hindi|switch(?: language)? to hindi|hindi mein|hindi me)\b/i.test(lower) ||
      /हिंदी में/.test(message)
    ) {
      return { detected: 'hi', explicitSwitch: 'hi', isMixedLanguage: /[a-z]/i.test(message) }
    }
    if (/\b(?:in english|switch(?: language)? to english|back to english)\b/i.test(lower)) {
      return { detected: 'en', explicitSwitch: 'en', isMixedLanguage: false }
    }

    // Unicode Kannada
    if (/[\u0C80-\u0CFF]/.test(message)) {
      return { detected: 'kn', isMixedLanguage: /[a-zA-Z]/.test(message) }
    }
    // Unicode Devanagari Hindi
    if (/[\u0900-\u097F]/.test(message)) {
      return { detected: 'hi', isMixedLanguage: /[a-zA-Z]/.test(message) }
    }

    // Romanized Hindi / Hinglish detection preserving English tech terms
    if (/\b(?:samjhao|kaise|kya hai|mujhe|batao|zaroori hai|hamara)\b/i.test(lower)) {
      return { detected: 'hi', isMixedLanguage: true }
    }
    // Romanized Kannada / Kanglish detection preserving English tech terms
    if (/\b(?:hege|yavaga|nanage|arthavagilla|madabahudu|beka)\b/i.test(lower)) {
      return { detected: 'kn', isMixedLanguage: true }
    }

    return { detected: 'en', isMixedLanguage: false }
  }

  /**
   * Resolves effective response language: explicit message switch -> non-English script -> profile preference -> English
   */
  resolveEffectiveLanguage(
    message: string,
    profile?: IStudentLearningProfile | null,
    context?: IConversationContext
  ): DetectedLanguage {
    const msgLang = this.detectMessageLanguage(message)
    if (msgLang.explicitSwitch && msgLang.explicitSwitch !== 'auto') {
      return msgLang.explicitSwitch
    }
    if (msgLang.detected !== 'en') {
      return msgLang.detected
    }

    const pref = context?.languagePreference || profile?.preferredLanguage
    if (pref === 'kn' || pref === 'hi' || pref === 'en') {
      return pref
    }
    return 'en'
  }

  /**
   * Resolves effective learning depth without ever assuming ability from grades/CGPA/department.
   */
  resolveLearningDepth(
    message: string,
    context: IConversationContext,
    profile?: IStudentLearningProfile | null
  ): ExperienceLevel {
    const lower = message.toLowerCase()
    if (
      /\b(?:simpler|explain simply|like i am a beginner|easier terms|less jargon|basic explanation)\b/i.test(
        lower
      )
    ) {
      return 'beginner'
    }
    if (
      /\b(?:deeper|more technical|in depth|advanced detail|under the hood|scalability and tradeoffs)\b/i.test(
        lower
      )
    ) {
      return 'advanced'
    }
    if (context.explicitlyProvidedConstraints?.includes('experience')) {
      return context.technicalExperience
    }
    return profile?.explanationLevel || context.technicalExperience || 'intermediate'
  }

  /**
   * Formats technical explanation adapted cleanly to Beginner / Intermediate / Advanced without sacrificing accuracy.
   */
  buildConceptExplanation(
    topicPrompt: string,
    level: ExperienceLevel,
    language: DetectedLanguage,
    context: IConversationContext,
    style: ExplanationStyle = 'step_by_step'
  ): string {
    const lower = topicPrompt.toLowerCase()
    const isSemanticSearch =
      lower.includes('semantic search') ||
      lower.includes('embedding') ||
      lower.includes('cosine similarity') ||
      lower.includes('vector search')
    const isJwtOrAuth =
      lower.includes('jwt') ||
      lower.includes('authentication') ||
      lower.includes('rbac') ||
      lower.includes('session')
    const isIndexingOrDb =
      lower.includes('index') ||
      lower.includes('mongodb') ||
      lower.includes('database') ||
      lower.includes('schema')

    // Special follow-up: "How can I use it in my project repository?"
    if (
      (lower.includes('how can i use it') ||
        lower.includes('use it in my project') ||
        lower.includes('use this in our project') ||
        lower.includes('apply it to my project') ||
        lower.includes('in my project repository')) &&
      (context.lastTopicCovered?.toLowerCase().includes('semantic') ||
        lower.includes('semantic') ||
        lower.includes('repository'))
    ) {
      return this.wrapWithLanguageFraming(
        this.renderRepositoryApplicationGuide(level, context),
        language,
        level
      )
    }

    // Special follow-up: "Is it necessary for my mini-project?"
    if (
      (lower.includes('is it necessary') ||
        lower.includes('do i need it') ||
        lower.includes('necessary for my mini')) &&
      context.lastTopicCovered
    ) {
      return this.wrapWithLanguageFraming(
        this.renderConceptNecessityAssessment(context.lastTopicCovered, level, context),
        language,
        level
      )
    }

    let body = ''
    if (isSemanticSearch) {
      body = this.renderSemanticSearchExplanation(level, style)
    } else if (isJwtOrAuth) {
      body = this.renderAuthExplanation(level)
    } else if (isIndexingOrDb) {
      body = this.renderDatabaseIndexingExplanation(level)
    } else {
      body = this.renderGeneralTechnicalConcept(topicPrompt, level, context)
    }

    return this.wrapWithLanguageFraming(body, language, level)
  }

  private renderSemanticSearchExplanation(level: ExperienceLevel, style: ExplanationStyle): string {
    if (level === 'beginner') {
      return `### Understanding Semantic Search (Beginner Step-by-Step Guide)

**1. Why Normal Keyword Search Misses Things**
Normal keyword matching checks whether the exact same words appear. If a senior wrote *"Classroom Attendance via Face Camera"* and you search *"Roll-Call Presence Portal"*, keyword search finds zero shared words even though both solve the same classroom problem.

**2. How Semantic Search Works in 3 Simple Steps**
1. **Turn Text Into Number Lists (\`Embeddings\`)**: An \`embedding\` is simply a fixed list of numbers representing the meaning of a sentence. Related sentences get nearby numbers, like coordinates on a map.
2. **Compare Angles (\`Cosine Similarity\`)**: Instead of comparing letters, the system measures how close two coordinate lists point toward each other (from \`0\` meaning unrelated to \`1\` meaning nearly identical meaning).
3. **Rank & Verify (\`Retrieval\`)**: The backend sorts stored projects by closeness and shows the top matches—**never treating similarity as plagiarism**.

**Simple Concrete Example:**
- Idea A: *"Predict student dropout early"* ➔ vector near \`[0.82, 0.45, 0.10]\`
- Record B: *"Identify at-risk learners before exams"* ➔ vector near \`[0.80, 0.48, 0.12]\`
- Record C: *"Hostel laundry tracker"* ➔ vector near \`[0.05, 0.12, 0.91]\` (far away)

${style === 'concise' ? '' : '**Takeaway:** Semantic search compares *meaning coordinates*, not just exact spelling.\n'}Would you like to see how to use this inside your own project repository, or ask if you actually need it for your mini-project?`
    }

    if (level === 'intermediate') {
      return `### Semantic Search & Retrieval Architecture (Intermediate Level)

CampusProjectHub combines **lexical matching** with **deterministic/vector semantic retrieval** so differently worded abstracts still surface prior work accurately:

1. **Token Normalization & Concept Expansion**:
   - Strips generic stopwords and normalizes suffixes (\`predicting\` ➔ \`predict\`), then expands domain concept families (e.g., \`attendance\` ➔ \`presence\`, \`biometric\`, \`rollcall\`).
2. **Vector Representation (\`Embeddings\` + \`Cosine Similarity\`)**:
   - \`RepositorySearchService.generateVectorEmbedding()\` maps unigrams and bigrams into a normalized 128-dimensional vector, then evaluates cosine distance \`(A · B) / (||A|| ||B||)\` against cached \`project.embedding\` arrays.
3. **Hybrid Scoring Trade-offs**:
   - Pure vector cosine similarity can over-score generic filler words or shared tech stacks (\`React\`, \`MongoDB\`). Combining keyword overlap, domain synonyms, and multi-token feature checks separates conceptual overlap from implementation-only overlap.

**Practical Note:** Pre-compute and store \`embedding\` on save in MongoDB rather than regenerating all project embeddings on every search request.

Would you like to see how to integrate this pattern in your repository, or evaluate whether it is worth the effort for your timeline?`
    }

    return `### Semantic Retrieval Internals & Architectural Trade-Offs (Advanced Level)

Designing academic prior-art retrieval requires balancing **recall**, **precision on shared boilerplates**, and **query complexity**:

1. **Sparse vs. Dense Retrieval**:
   - **Sparse lexical + BM25 / MongoDB \`$text\`**: \`O(postings)\` lookup via inverted indexes, high precision for exact framework/error terms, fails on zero-token paraphrases.
   - **Dense neural embeddings + Cosine / Dot-Product**: Captures cross-term semantics in \`R^d\`, but exact k-NN scans scale \`O(N · d)\` linearly unless indexed via **HNSW** or **IVF-Flat** approximate nearest neighbors (e.g., \`pgvector\` / Atlas Vector Search).
2. **Failure Modes in Academic Corpora**:
   - **Template Pollution**: Boilerplate words (\`dashboard\`, \`React\`, \`automated\`) cluster unrelated abstracts together; fix via stopword pruning, stack-token exclusion, and field-weighted scoring (\`problemStatement\` > \`technologyStack\`).
   - **Multi-Signal Calibration**: Separate \`RELATED_TECHNOLOGY_ONLY\` from \`SIMILAR_PROJECT_CONCEPT\` deterministically instead of trusting raw vector thresholds blindly.
3. **Security & Cache Invalidation**:
   - Enforce \`reviewStatus: 'APPROVED'\` pre-filtering *before* ranking so private drafts never leak through vector neighbor scores, and recompute embeddings atomically on project approval updates.

Would you like to examine how to wire this cleanly into your data layer, or compare exact vs approximate indexing trade-offs for your dataset size?`
  }

  private renderAuthExplanation(level: ExperienceLevel): string {
    if (level === 'beginner') {
      return `### How \`JWT\` Authentication & \`RBAC\` Work (Beginner Guide)

1. **Login (\`Authentication\`)**: You send your email and password over \`HTTPS\`. The server verifies the \`scrypt\` hashed password (never plain text!).
2. **Digital Pass (\`JWT\` + Server Session)**: The server gives you a signed \`Bearer\` token—like a stamped college ID card that expires automatically.
3. **Permissions (\`RBAC\`)**: Every protected \`REST API\` route checks who you are on the **server** and checks your role (\`student\`, \`faculty\`, \`admin\`) before returning data—never trusting headers like \`X-User-Role\` sent by a browser.

Which part would you like explained step by step: password hashing or route protection?`
    }
    if (level === 'intermediate') {
      return `### Stateful \`JWT\` + Session Revocation & \`RBAC\` Architecture (Intermediate)

- **Password Storage**: One-way \`crypto.scrypt\` with random per-user salt and \`timingSafeEqual\` verification.
- **Session-Backed Bearer \`JWT\`**: Embedding a unique \`jti\` inside the signed token lets \`authenticate\` middleware verify both signature integrity and an active MongoDB \`AuthSession\` record, making \`POST /api/auth/logout\` revoke access immediately.
- **Role Guards**: Middleware \`requireRole(...)\` enforces role boundaries server-side after fetching verified identity from the session store.

Would you like to review schema indexes for session TTL cleanup or CSRF/rate-limiting trade-offs?`
    }
    return `### Authentication & Authorization Hardening Trade-Offs (Advanced)

- **Stateless \`JWT\` vs. Session-Revocable \`JWT\`**: Pure stateless tokens cannot be revoked prior to \`exp\` without an allowlist/denylist. Storing \`jti\` + \`expiresAt\` with a MongoDB TTL index yields \`O(1)\` revocation checks at one indexed lookup cost per request.
- **Identity Spoofing Prevention**: Strictly bind \`ownerId\` in queries directly to verified \`req.user.id\`, rejecting client-supplied identity headers (\`X-Student-Id\`) and guarding horizontal privilege escalation (IDOR) at repository boundaries.
- **Timing & Rate Controls**: Constant-time hash comparison plus per-IP rate limiting on \`/login\` and \`/register\` mitigates brute-force enumeration.

Which threat vector or scaling bottleneck in auth are you designing against?`
  }

  private renderDatabaseIndexingExplanation(level: ExperienceLevel): string {
    if (level === 'beginner') {
      return `### Database Indexing Explained Simply (Beginner Guide)

Without an index, \`MongoDB\` reads every document one by one (like flipping through a whole textbook to find one word). An **index** is like the alphabetical index at the back of the book—\`MongoDB\` jumps directly to matching records using keys such as \`{ collegeId: 1, department: 1 }\`.

What collection or query in your project feels slowest or hardest to structure right now?`
    }
    if (level === 'intermediate') {
      return `### MongoDB Schema Design & Compound Indexing (Intermediate)

- **Equality-Sort-Range (ESR) Rule**: Put equality fields first (\`collegeId\`, \`reviewStatus\`), sort fields next (\`lastMessageAt: -1\`), and range filters last.
- **Text Indexes vs Application Search**: \`MongoDB\` weighted text indexes accelerate keyword queries, while normalized arrays cleanly index tags and \`technologyStack.name\`.
- **Write Trade-Off**: Each index speeds up reads while slightly slowing \`insert\`/\`update\`; avoid indexing low-cardinality flags alone.

Which query patterns are most frequent in your application?`
    }
    return `### Storage Engine Indexing & Concurrency Trade-Offs (Advanced)

- **WiredTiger B-Tree Pressure**: Excess compound indexes inflate working-set RAM and write amplification; monitor \`totalDocsExamined / nReturned\` via \`explain('executionStats')\`.
- **Atomic Updates**: Use conditional \`findOneAndUpdate\` with version predicates (\`__v\`) or \`$inc\`/\`$gte\` stock predicates instead of read-modify-write cycles to prevent lost updates under concurrency.

Would you like to optimize a specific collection's read/write ratio or concurrency lock path?`
  }

  private renderGeneralTechnicalConcept(
    prompt: string,
    level: ExperienceLevel,
    context: IConversationContext
  ): string {
    const cleanTopic = prompt.replace(/^(?:i don't understand|explain|what is|how does)\s+/i, '').replace(/\?+$/, '').trim()
    if (level === 'beginner') {
      return `### Breaking Down "${cleanTopic}" (Beginner Explanation)

- **What It Does Simply**: Break **"${cleanTopic}"** into three basic parts: **(1) Input** (what user/data enters), **(2) Processing Rule** (the step-by-step logic your \`backend\` runs), and **(3) Verified Output** (what is saved in \`MongoDB\` and shown in \`React\`).
- **How to Practice Safely**: Start with one tiny working example with hardcoded sample data before connecting external \`API\`s or complex libraries.
${context.currentProjectIdea ? `- **Link to Your Project**: Inside **${context.currentProjectIdea}**, keep this rule focused on your core user workflow first.\n` : ''}
Would you like a concrete code-level walkthrough of the first step, or a simpler real-world analogy?`
    }
    if (level === 'intermediate') {
      return `### Technical Breakdown: "${cleanTopic}" (Intermediate)

- **Architecture Role**: Separate responsibilities into client validation (\`React\`), controller/service boundaries (\`Express\` + \`Zod\`), and indexed persistence (\`MongoDB\`).
- **Practical Trade-Offs**: Prioritize deterministic behavior, clear error states, and automated integration tests before adding asynchronous queues or third-party dependencies.
${context.currentProjectIdea ? `- **Project Alignment**: In **${context.currentProjectIdea}**, map this directly to one module boundary.\n` : ''}
Which layer—API contract, database schema, or edge-case testing—should we inspect next?`
    }
    return `### Deep Architecture Analysis: "${cleanTopic}" (Advanced)

- **Design Dimensions**: Evaluate latency vs. consistency invariants, failure isolation (timeouts/retries/idempotency), horizontal scaling bottlenecks, and authorization boundaries at the service boundary.
- **Optimization Strategy**: Measure baseline \`p95\` latency and data-access complexity before introducing caching layers or distributed components.

Which specific bottleneck (throughput, consistency guarantees, or security surface) matters most in your architecture?`
  }

  private renderRepositoryApplicationGuide(
    level: ExperienceLevel,
    context: IConversationContext
  ): string {
    const targetProject = context.currentProjectIdea || 'your CampusProjectHub-style project repository'
    if (level === 'beginner') {
      return `### How to Use Search & Similarity in Your Project Repository (Beginner Steps)

For **${targetProject}**, implement it cleanly in 3 small steps:
1. Store each project's \`title\`, \`problemStatement\`, \`features\`, and \`technologyStack\` cleanly in \`MongoDB\`.
2. Build a \`compareStudentIdea\` function in the \`backend\` that removes common filler words and compares meaningful words between a student's pitch and saved projects.
3. Show matching titles and links cleanly—and explain *why* they matched instead of showing a fake percentage.

Do you want to build the simple keyword check first for Milestone 1?`
    }
    if (level === 'intermediate') {
      return `### Applying Semantic Retrieval in Your Project Repository (Intermediate)

In **${targetProject}** (mirroring CampusProjectHub's \`RepositorySearchService\` architecture):
1. Pre-compute normalized \`embedding\` vectors on \`APPROVED\` records in \`MongoDB\`.
2. Filter only accessible approved records first (masking private contacts & rejection notes).
3. Run hybrid \`compareStudentIdea\` combining domain synonyms, multi-token feature overlap, and \`computeCosineSimilarity\`, separating conceptual matches from \`RELATED_TECHNOLOGY_ONLY\`.

Would you like to map out the \`POST /api/repository/compare\` request/response schema next?`
    }
    return `### Integrating Retrieval Into Your Repository Pipeline (Advanced)

For **${targetProject}**:
1. Partition indexing by \`{ collegeId: 1, reviewStatus: 'APPROVED' }\` so privacy filtering precedes candidate scoring.
2. Separate sparse BM25/synonym signals from dense embeddings so shared framework tokens (\`React\`, \`MongoDB\`) are excluded from conceptual distance.
3. Cache normalized embeddings and return field-level attribution (\`titleSimilarity\`, \`conceptSimilarity\`, \`missingDetails\`) so downstream mentor prompts remain strictly grounded.

Which retrieval bottleneck—cold-start synonyms, domain-term weighting, or pre-filtered ANN scaling—do you want to tune next?`
  }

  private renderConceptNecessityAssessment(
    topic: string,
    level: ExperienceLevel,
    context: IConversationContext
  ): string {
    const tightTimeline = context.developmentWeeks !== undefined && context.developmentWeeks <= 8
    const beginnerTight = level === 'beginner' || tightTimeline

    return `### Is "${topic}" Actually Necessary for Your Mini-Project?

- **Honest Verdict**: **${beginnerTight ? 'Optional / Not Essential for MVP' : 'Useful Only After Core Workflow Works'}**
- **Why**: Standard \`MongoDB\` text indexes + stopword-filtered keyword search handle 80% of basic repository lookup needs reliably in 1–2 days, with zero embedding maintenance.
- **When Semantic / Embedding Retrieval Is Worth Adding**: Only when students routinely search using different synonyms (e.g., *"biometric portal"* vs *"attendance camera"*) **and** your \`teamSize\` / \`${context.developmentWeeks || 'semester'}\`-week timeline already has CRUD, auth, and tests complete.
- **Simpler Alternative**: Start with indexed keyword + synonym-map lookup first; add vector cosine ranking as a bounded Enhancement once core milestones pass.

Should we lock the simpler deterministic search for Milestone 1, or keep hybrid similarity as an explicit core goal?`
  }

  /**
   * Adapts English/Kannada/Hindi presentation while strictly preserving English technical & API terms.
   */
  wrapWithLanguageFraming(
    englishBody: string,
    language: DetectedLanguage,
    level: ExperienceLevel
  ): string {
    if (language === 'kn') {
      return `### ಕನ್ನಡ ಮಾರ್ಗದರ್ಶನ (Kannada Academic Guidance — Level: ${level})
ಗಮನಿಸಿ: ನಿಖರತೆಗಾಗಿ \`React\`, \`MongoDB\`, \`JWT\`, \`REST API\`, \`Node.js\` ಮುಂತಾದ ತಾಂತ್ರಿಕ ಪದಗಳನ್ನು ಮೂಲ ಇಂಗ್ಲಿಷ್ ರೂಪದಲ್ಲೇ ಉಳಿಸಲಾಗಿದೆ.

**ಸಂಕ್ಷಿಪ್ತ ಸಾರಾಂಶ (Kannada Summary):** ನಿಮ್ಮ ಪ್ರಾಜೆಕ್ಟ್ ಹಂತ ಮತ್ತು ಕಲಿಕೆಯ ಮಟ್ಟಕ್ಕೆ (\`${level}\`) ಅನುಗುಣವಾಗಿ ಕೆಳಗಿನ ಸ್ಪಷ್ಟ ಹಂತಗಳನ್ನು ಅನುಸರಿಸಿ — ಅನಗತ್ಯ ಜಟಿಲತೆಯನ್ನು ತಪ್ಪಿಸಿ ಮತ್ತು ಮೊದಲು ಮೂಲ \`core workflow\` ಪೂರ್ಣಗೊಳಿಸಿ.

---

${englishBody}`
    }

    if (language === 'hi') {
      return `### हिंदी अकादमिक मार्गदर्शन (Hindi Academic Guidance — Level: ${level})
नोट: तकनीकी सटीकता के लिए \`React\`, \`MongoDB\`, \`JWT\`, \`REST API\`, \`Node.js\` जैसे प्रोग्रामिंग और फ्रेमवर्क शब्दों को मूल रूप में रखा गया है।

**मुख्य सारांश (Hindi Summary):** आपके प्रोजेक्ट की समय-सीमा और सीखने के स्तर (\`${level}\`) के अनुसार नीचे दिए गए चरणों का पालन करें — अनावश्यक जटिलता से बचें और पहले मुख्य \`core workflow\` को पूरा करें।

---

${englishBody}`
    }

    return englishBody
  }
}

export const adaptiveTeachingEngine = new AdaptiveTeachingEngine()
