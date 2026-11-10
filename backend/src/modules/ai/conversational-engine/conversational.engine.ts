import {
  ConversationalTurnResult,
  IConversationContext,
  StudentIntent,
  ConversationMode,
} from './context.types.js'
import { contextManager } from './context.manager.js'
import { intentClassifier } from './intent.classifier.js'
import { PROGRESSIVE_SECTIONS } from './progressive.catalog.js'
import { repositorySearchService } from '../../repository/repository.search.service.js'
import { knowledgeService } from '../knowledge/knowledge.service.js'
import { IMessage } from '../message.model.js'

export class ConversationalEngine {
  /**
   * Main entrypoint to process a student turn and produce a rich, context-aware academic response
   */
  async processTurn(
    conversationId: string,
    ownerId: string,
    userPrompt: string,
    _history: IMessage[] = []
  ): Promise<ConversationalTurnResult> {
    // 1. Get and update conversation context
    const currentContext = await contextManager.getOrCreateContext(conversationId, ownerId)
    const extractedUpdates = contextManager.extractContextFromMessage(userPrompt, currentContext)
    let context = await contextManager.updateContext(conversationId, ownerId, extractedUpdates)

    // 2. Classify student intent
    const intent = intentClassifier.classifyIntent(userPrompt, context)

    // 3. Dispatch to appropriate handler
    let result: {
      markdown: string
      followUps: string[]
      stageUpdates: Partial<IConversationContext>
    }

    switch (intent) {
      case 'COMPARISON_INQUIRY':
        result = this.handleComparisonInquiry(userPrompt, context)
        break

      case 'FEATURE_EVALUATION':
        result = this.handleFeatureAdditionInquiry(userPrompt, context)
        break

      case 'CAMPUSPROJECTHUB_INTRO':
      case 'PROGRESSION_NEXT':
        result = this.handleProgressiveIntro(userPrompt, context, intent)
        break

      case 'PROJECT_DISCOVERY':
        result = await this.handleProjectDiscovery(userPrompt, context)
        break

      case 'PROJECT_SUITABILITY':
        result = this.handleProjectSuitability(userPrompt, context)
        break

      case 'DISADVANTAGES_INQUIRY':
        result = this.handleDisadvantagesInquiry(userPrompt, context)
        break

      case 'AI_NECESSITY_INQUIRY':
        result = this.handleAINecessityInquiry(userPrompt, context)
        break

      case 'SCOPE_REDUCTION':
        result = this.handleScopeReduction(userPrompt, context)
        break

      case 'DOCUMENTATION_INQUIRY':
        result = this.handleProblemStatement(userPrompt, context)
        break

      case 'TECHNICAL_EXPLANATION':
        result = this.handleTechnicalExplanation(userPrompt, context)
        break

      case 'SENIOR_CONNECTION_INQUIRY':
        result = this.handleSeniorConnectionInquiry(userPrompt, context)
        break

      case 'PROPOSAL_GENERATION_INQUIRY':
        result = this.handleProposalGenerationInquiry(userPrompt, context)
        break

      case 'COLLEGE_SCOPE_AFFIRMATION':
        result = this.handleCollegeScopeAffirmation(userPrompt, context)
        break

      case 'FACULTY_EXPLANATION':
        result = this.handleFacultyExplanation(userPrompt, context)
        break

      default:
        result = this.handleGeneralMentoring(userPrompt, context)
        break
    }

    // 4. Persist updated stage and return result
    const updatedContext = await contextManager.updateContext(conversationId, ownerId, {
      ...result.stageUpdates,
      lastTopicCovered: result.stageUpdates.lastTopicCovered || context.lastTopicCovered,
    })

    return {
      intent,
      mode: updatedContext.mode,
      responseMarkdown: result.markdown,
      suggestedFollowUps: result.followUps,
      updatedContext,
    }
  }

  /**
   * Handler for Mode A: Project Discovery
   */
  private async handleProjectDiscovery(
    prompt: string,
    context: IConversationContext
  ): Promise<{
    markdown: string
    followUps: string[]
    stageUpdates: Partial<IConversationContext>
  }> {
    const lower = prompt.toLowerCase()

    // 1. Check if user is asking about a project management system or introducing idea
    if (
      lower.includes('project management') ||
      lower.includes('campus project hub') ||
      lower.includes('campusprojecthub') ||
      lower.includes('student project tracker')
    ) {
      const markdown = `That's a good starting point for a mini-project. A project management system can help students organize their work, coordinate teams, assign tasks and track project progress.

However, project management systems already exist, so we should identify what makes your project different rather than simply building another task-management application. In most colleges, previous project reports, repositories, and development lessons are scattered across Google Drives or physical shelf archives, so students often do not know what projects their seniors have already developed.

For CampusProjectHub, there is an opportunity to go beyond ordinary project management:

- **Project Management**: Manage teams, tasks, milestones and deadlines.
- **Academic Project Repository**: Discover projects developed by previous batches.
- **Knowledge Sharing**: Help juniors learn from seniors' completed projects.
- **AI Project Mentor**: Evaluate project ideas, identify similar projects and recommend improvements.
- **Proposal Generation**: Convert finalized project ideas into academic proposals.

We should first understand your intended scope and then decide which features are realistic for your mini-project. Would you like me to walk you through the complete CampusProjectHub solution, or shall we first compare your specific project idea with existing college repository records?

One question to start: Are you planning to build this specifically for college students and faculty, where students can manage their academic projects and discover projects developed by previous batches?`

      return {
        markdown,
        followUps: [
          'Yes, specifically for college students and faculty',
          'Is this project suitable for a mini-project?',
          'What makes CampusProjectHub different?',
        ],
        stageUpdates: {
          mode: 'PROJECT_DISCOVERY',
          currentProjectIdea: 'College Project Management Platform',
          currentDiscussionStage: 'DISCOVERY_REFERENCE_INTRODUCED',
          topicsDiscussed: ['CampusProjectHub Reference Overview'],
        },
      }
    }

    // 2. Student introduced an idea: perform repository intelligence check
    const queryIdea = context.currentProjectIdea || prompt
    let matches: any[] = []
    try {
      matches = await repositorySearchService.compareStudentIdea(queryIdea, queryIdea, [], 'rvce-main')
    } catch {
      matches = []
    }

    if (matches.length > 0) {
      const top = matches[0]
      const missing =
        top.sourceAttribution.missingDetails.length > 0
          ? top.sourceAttribution.missingDetails.join(', ')
          : 'None noted'

      const documentedFeaturesList = top.project.features.length > 0
        ? top.project.features.map((f: string) => `  * ${f}`).join('\n')
        : '  * Core baseline functionality documented in department catalog.'

      const limitationsList = top.project.limitations && top.project.limitations.length > 0
        ? top.project.limitations.map((l: string) => `* **Documented Limitation**: ${l}`).join('\n')
        : '* No hardware or algorithmic bottlenecks were archived in the historical report abstract.'

      const unknownList = top.analysis?.missingOrUnknownInformation && top.analysis.missingOrUnknownInformation.length > 0
        ? top.analysis.missingOrUnknownInformation.map((u: string) => `* ${u}`).join('\n')
        : `* Not available in documented record: ${missing}\n* Public demonstration video is unarchived.`

      const opportunitiesList = top.analysis?.improvementOpportunities && top.analysis.improvementOpportunities.length > 0
        ? top.analysis.improvementOpportunities.map((o: string) => `* ${o}`).join('\n')
        : '* Introduce local/edge inference rather than cloud-dependent processing.\n* Benchmark against previous cohort results with empirical error metrics.'

      const sourceLink = `/explore-projects/${top.project.id}`
      const authors = (top.project.teamMembers || []).map((m: any) => ({
        studentId: m.studentId,
        name: m.name,
        role: m.role,
        isAvailableForMentoring: m.isAvailableForMentoring === true,
      }))
      const mentorStatusLines =
        authors.length > 0
          ? authors
              .map(
                (a: any) =>
                  `  * **${a.name}** (${a.role || 'Contributor'}) — ${
                    a.isAvailableForMentoring ? 'Accepting Mentees (Opted In)' : 'Not Opted In for Mentoring'
                  }`
              )
              .join('\n')
          : '  * No contributor mentorship opt-in status recorded.'

      const markdown = `I found related projects in the available academic repository. Let us compare their documented functionality with your idea.

* **Verified Repository Record Detected**:
### 1. Verified Repository Records (Facts)
* **Previous Project**: **${top.project.title}** (${top.project.academicYear}, Dept of ${top.project.department})
* **Repository Source Link**: [View Full Project Dossier](${sourceLink}) (\`${sourceLink}\`)
* **Source & Verification**: \`${top.sourceAttribution.sourceType}\` — **${top.sourceAttribution.verificationStatus}**
* **Documented Solution**: ${top.project.solution || top.project.proposedSolution || top.project.proposedSystem || top.project.abstract}
* **Documented Features**:
${documentedFeaturesList}
* **Technologies Used**: ${top.project.technologyStack.map((t: any) => t.name).join(', ')}
* **Similarity Classification**: \`${top.classification}\` (Confidence: ${Math.round(top.score * 100)}%)
* **Contributor Mentorship Status**:
${mentorStatusLines}

### 2. Documented Limitations & Hurdles
${limitationsList}

### 3. What Remains Unknown in the Repository Archive
${unknownList}

### 4. Opportunities for Meaningful Improvements (AI Guidance)
${opportunitiesList}

> **Academic Integrity & Similarity Limitations Notice**: In college capstone evaluation, **similarity is not plagiarism**. Automated similarity scoring compares documented abstracts, titles, and tech tags only—it cannot inspect unpublished source code or verify implementation quality. Having existing repository records proves your problem formulation is valid and provides a formal engineering benchmark to build upon.

### Follow-Up Question for Your Project Defense:
*"${top.academicCritique}"*

What specific new capability or algorithmic advancement are you planning to introduce to distinguish your project?`

      return {
        markdown,
        followUps: [
          'How can we make our implementation technically novel?',
          'What were the documented hurdles of the previous project?',
          'Can I connect with the authors for mentorship?',
        ],
        stageUpdates: {
          mode: 'PROJECT_DISCOVERY',
          currentDiscussionStage: 'DISCOVERY_OVERLAP_IDENTIFIED',
          matchedRepositoryProject: {
            projectId: top.project.id,
            sourceUrl: sourceLink,
            title: top.project.title,
            academicYear: top.project.academicYear,
            department: top.project.department,
            similarityClassification: top.classification,
            overlapScore: top.score,
            confirmedDetails: top.project.features.slice(0, 3),
            missingDetails: top.sourceAttribution.missingDetails,
            authors,
          },
          topicsDiscussed: [`Repository Comparison: ${top.project.title}`],
        },
      }
    }

    // 3. Novel idea without repository overlap
    const markdown = `### Project Ideation Assessment: "${queryIdea}"

* **Notice**: *CampusProjectHub repository search intelligence is active. Guidance is grounded in university capstone evaluation rubrics.*
* **Repository Status**: No direct conceptual overlap detected in your college's authorized repository. This gives your team a strong foundation for originality!
* **Category**: ${context.projectCategory || 'Software Engineering & Applied Systems'}
* **Team Experience Adapted**: ${context.technicalExperience.toUpperCase()} level

#### Recommended Next Steps for Your Capstone:
1. **Define Core Problem Statement**: Clearly articulate the exact real-world problem you are addressing according to IEEE 830 standards.
2. **Isolate Scope Creep**: Separate your must-have features (\`ESSENTIAL\`) from nice-to-have additions (\`OPTIONAL\`).
3. **Prepare for Viva Inquiry**: Be prepared to defend why you chose your specific technology stack.

What is the single most critical feature or algorithmic challenge your team plans to build first?`

    return {
      markdown,
      followUps: [
        'Help us define our core feature scope',
        'What tech stack would you recommend?',
        'Prepare potential viva questions for this idea',
      ],
      stageUpdates: {
        mode: 'PROJECT_DISCOVERY',
        currentDiscussionStage: 'DISCOVERY_NOVEL_CONCEPT',
        topicsDiscussed: [`Independent Project: ${queryIdea}`],
      },
    }
  }

  /**
   * Handler for Mode B: Progressive CampusProjectHub Introduction
   */
  private handleProgressiveIntro(
    prompt: string,
    context: IConversationContext,
    _intent: StudentIntent
  ): {
    markdown: string
    followUps: string[]
    stageUpdates: Partial<IConversationContext>
  } {
    const lower = prompt.toLowerCase()
    let targetIndex = context.introSectionIndex

    // Check if the student explicitly asked about a specific section
    if (lower.includes('problem statement') || lower.includes('problems solved') || lower.includes('why do we need')) {
      targetIndex = 1
    } else if (lower.includes('existing system') || lower.includes('traditional') || lower.includes('how colleges manage')) {
      targetIndex = 2
    } else if (lower.includes('proposed solution') || lower.includes('7 pillars') || lower.includes('pillars')) {
      targetIndex = 3
    } else if (lower.includes('objectives') || lower.includes('rubric')) {
      targetIndex = 4
    } else if (
      lower.includes('16 modules') ||
      lower.includes('functional modules') ||
      lower.includes('modules breakdown') ||
      lower.includes('explain its modules') ||
      lower.includes('explain the modules') ||
      lower.includes('what are its modules') ||
      lower.includes('explain modules')
    ) {
      targetIndex = 5
    } else if (lower.includes('repository') || lower.includes('similarity algorithm') || lower.includes('discovery')) {
      targetIndex = 6
    } else if (lower.includes('senior-junior') || lower.includes('senior junior') || lower.includes('mentorship')) {
      targetIndex = 7
    } else if (lower.includes('architecture') || lower.includes('3-tier') || lower.includes('three-tier')) {
      targetIndex = 8
    } else if (lower.includes('technology stack') || lower.includes('tech stack') || lower.includes('technologies')) {
      targetIndex = 9
    } else if (lower.includes('database') || lower.includes('schema') || lower.includes('mongodb')) {
      targetIndex = 10
    } else if (lower.includes('workflow') || lower.includes('lifecycle')) {
      targetIndex = 11
    } else if (lower.includes('advantages') || lower.includes('benefits') || lower.includes('value')) {
      targetIndex = 12
    } else if (lower.includes('limitations') || lower.includes('boundaries') || lower.includes('trade-offs')) {
      targetIndex = 13
    } else if (lower.includes('future') || lower.includes('roadmap') || lower.includes('enhancements')) {
      targetIndex = 14
    }

    // Clamp index
    if (targetIndex >= PROGRESSIVE_SECTIONS.length) {
      targetIndex = 0
    }

    const section = PROGRESSIVE_SECTIONS[targetIndex]
    const markdown = `${section.content}\n\n---\n\n> **Mentor Inquiry**: ${section.followUpPrompt}`

    const nextSection = PROGRESSIVE_SECTIONS[section.nextIndex]
    const followUps = [
      `Next: ${nextSection.title}`,
      'Compare CampusProjectHub with commercial tools like Trello',
      'Test my own project idea against the repository',
    ]

    return {
      markdown,
      followUps,
      stageUpdates: {
        mode: 'CAMPUSPROJECTHUB_INTRO',
        introSectionIndex: section.nextIndex,
        currentDiscussionStage: `INTRO_STEP_${section.index + 1}`,
        lastTopicCovered: section.key,
        topicsDiscussed: [section.title],
      },
    }
  }

  /**
   * Handler for Comparison Inquiries (Trello, Jira, Google Drive, WhatsApp)
   */
  private handleComparisonInquiry(
    prompt: string,
    _context: IConversationContext
  ): {
    markdown: string
    followUps: string[]
    stageUpdates: Partial<IConversationContext>
  } {
    const lower = prompt.toLowerCase()
    const targetTool = lower.includes('jira')
      ? 'Jira'
      : lower.includes('google drive')
      ? 'Google Drive / Spreadsheets'
      : lower.includes('whatsapp')
      ? 'WhatsApp Group Chats'
      : 'Trello'

    const markdown = `### CampusProjectHub vs. ${targetTool} — Academic Architecture Comparison

When reviewing student project tools, academic evaluators evaluate whether a tool supports the **full academic capstone lifecycle** rather than just general task management.

| Dimension | ${targetTool} | CampusProjectHub |
| :--- | :--- | :--- |
| **Primary Domain** | Generic commercial sprint boards / file storage | Tertiary engineering academic project lifecycle |
| **Institutional Memory** | Lost when project boards or drives are closed | Living 33-field project repository permanent archive [Implemented] |
| **Prior-Art Discovery** | Zero cross-cohort searchable archive | Multi-filter repository search (dept, year, tech) [Implemented] |
| **Plagiarism & Similarity** | None | Dual-stage token Jaccard containment [Implemented] |
| **Documentation Standards**| Manual document creation | Automated IEEE 830 proposal DOCX & PDF generation [Implemented] |
| **Faculty Governance** | Casual member comments | Stage-gated review machine (\`DRAFT\` ➔ \`APPROVED\`) with audit logs [Implemented] |
| **Senior-Junior Network** | Disconnected | Privacy-masked consent mentorship gateway [Implemented] |

#### Why Commercial Tools Fall Short for Academic Capstones:
1. **${targetTool} is purely a tracking mechanism**, not an educational guide. It cannot critique technical feasibility or warn teams about semester scope creep.
2. **No Institutional Continuity**: When seniors graduate, their ${targetTool} boards or drives disappear. Juniors never learn what challenges seniors faced or what architecture they built.
3. **No Rubric Compliance**: Autonomous university and VTU evaluation panels require formal milestone deliverables, cover pages, and guide sign-offs that generic tools cannot generate.

Would you like to see how CampusProjectHub structures its **15 IEEE 830 Proposal Sections**, or explore our **Faculty Review Workflow**?`

    return {
      markdown,
      followUps: [
        'How does the IEEE 830 Proposal Generator work?',
        'Explain the Faculty Review & Approval Workflow',
        'How does CampusProjectHub protect student privacy?',
      ],
      stageUpdates: {
        currentDiscussionStage: 'COMPARISON_ANALYSIS',
        topicsDiscussed: [`Tool Comparison: ${targetTool}`],
      },
    }
  }

  /**
   * Handler for Feature Addition & Feasibility Evaluation (e.g., AI task allocation)
   */
  private handleFeatureAdditionInquiry(
    prompt: string,
    context: IConversationContext
  ): {
    markdown: string
    followUps: string[]
    stageUpdates: Partial<IConversationContext>
  } {
    const lower = prompt.toLowerCase()
    const isTaskAllocation = lower.includes('task allocation') || lower.includes('assign tasks')
    const isVoice = lower.includes('voice') || lower.includes('webrtc')
    const isBlockchain = lower.includes('blockchain') || lower.includes('smart contract')
    const isFacialRecognition =
      lower.includes('facial recognition') ||
      lower.includes('face recognition') ||
      lower.includes('biometric') ||
      (lower.includes('face') && lower.includes('attendance'))

    if (isTaskAllocation) {
      const markdown = `### Feature Feasibility Evaluation: Automated AI Task Allocation

* **Proposed Feature**: Automated AI-Driven Team Task Allocation
* **Pedagogical Classification**: \`RECOMMENDED WITH PRAGMATIC CONSTRAINTS\`
* **Target Experience Level**: ${context.technicalExperience.toUpperCase()}

#### 1. Why the Idea is Attractive:
Automated assignment based on member skills (e.g. Frontend, Backend, ML) promises to reduce team coordination friction and prevent unbalanced workloads.

#### 2. Realistic Technical Hurdles for a Semester Project:
1. **The Cold-Start & Verification Problem**: In student teams, members self-report skill levels that rarely match real performance. An AI algorithm relying on subjective input will allocate critical path tasks incorrectly.
2. **Algorithmic Complexity**: A rigorous allocation engine requires a formal constraint satisfaction problem (CSP) solver (e.g. matching task dependencies, individual availability, and skill matrices). This easily consumes 4–6 weeks of development.
3. **Team Psychology**: In capstones, students prefer negotiating responsibilities mutually rather than having an algorithm assign tasks autonomously.

#### 3. Recommended Pragmatic Implementation:
Instead of autonomous algorithmic assignment:
* **Phase 1**: Implement **Skill-Tagged Task Boards** where tasks carry prerequisite tags (\`React\`, \`Node\`, \`Testing\`).
* **Phase 2**: Add a simple heuristic suggestion engine that flags if a single teammate is assigned more than 40% of the milestone points.

Would you like to formalize this recommendation into your project scope, or explore another feature?`

      return {
        markdown,
        followUps: [
          'Accept the heuristic suggestion approach',
          'Evaluate another feature idea',
          'Lock our finalized project scope',
        ],
        stageUpdates: {
          currentDiscussionStage: 'FEATURE_FEASIBILITY_ANALYSIS',
          proposedFeatures: ['Heuristic Task Workload Balancing'],
          topicsDiscussed: ['Feasibility: AI Task Allocation'],
        },
      }
    }

    if (isVoice) {
      const markdown = `### Feature Feasibility Evaluation: Full-Duplex WebRTC Voice Mentorship

* **Proposed Feature**: Real-Time WebRTC Voice Audio Interaction with AI Mentor
* **Pedagogical Classification**: \`UNNECESSARY FOR INITIAL CAPSTONE RELEASE\`

#### Technical Feasibility Critique:
1. **Infrastructure Costs & Latency**: Full-duplex WebRTC streaming requires STUN/TURN traversal servers, audio codec compression pipelines, and WebSocket duplex streaming.
2. **Scope Creep**: For a student project management platform, speech interaction does not improve project discoverability, IEEE proposal export, or faculty approval accuracy.
3. **Simpler Alternative [Implemented]**: Visual audio waveform simulation and browser SpeechSynthesis APIs satisfy the pedagogical preview without risking network timeout failures during faculty evaluation.

We recommend focusing development effort on repository similarity search and proposal generation.`

      return {
        markdown,
        followUps: [
          'Drop WebRTC voice and focus on core features',
          'Explain the IEEE 830 proposal generator',
          'Review the living repository schema',
        ],
        stageUpdates: {
          currentDiscussionStage: 'FEATURE_FEASIBILITY_ANALYSIS',
          rejectedRecommendations: ['Real-time WebRTC Voice Mesh'],
          topicsDiscussed: ['Feasibility: WebRTC Voice'],
        },
      }
    }

    if (isBlockchain) {
      const markdown = `### Feature Feasibility Evaluation: Blockchain Certificate Verification

* **Proposed Feature**: Blockchain-Based Academic Project Credential Verification
* **Pedagogical Classification**: \`UNNECESSARY COMPLEXITY\`

#### Technical Feasibility Critique:
1. **High Latency & Transaction Costs**: Deploying smart contracts on testnets (Ethereum/Sepolia) introduces unpredictable network fees and slow confirmation times during viva demonstrations.
2. **Misaligned Architecture**: Academic project governance is inherently **hierarchical and permissioned** (department guides and HoDs have sole signing authority). A decentralized consensus ledger offers no architectural advantage over cryptographically signed JWT hashes and immutable database audit logs.
3. **Simpler Alternative [Implemented]**: HMAC-SHA256 digital signatures with role-based faculty verification badges (\`FACULTY_APPROVED\`).`

      return {
        markdown,
        followUps: [
          'Use cryptographic audit logging instead',
          'Review the faculty review state machine',
          'Test my project idea against the repository',
        ],
        stageUpdates: {
          currentDiscussionStage: 'FEATURE_FEASIBILITY_ANALYSIS',
          rejectedRecommendations: ['Blockchain Ledger'],
          topicsDiscussed: ['Feasibility: Blockchain Verification'],
        },
      }
    }

    if (isFacialRecognition) {
      const markdown = `### Feature Feasibility Evaluation: Facial Recognition for Attendance Tracking

* **Proposed Feature**: Automated Facial Recognition Attendance System
* **Pedagogical Classification**: \`UNNECESSARY FOR INITIAL SCOPE (HIGH COMPLEXITY & PRIVACY RISK)\`

#### 7-Dimensional Feasibility Critique:
1. **Problem Relevance & Scope**: Attendance tracking is a standard problem, but biometric verification is usually over-engineering for a classroom capstone compared to cryptographic check-ins.
2. **Privacy, Ethics & Consent**: Storing student biometric embeddings on local servers introduces legal and institutional privacy challenges without explicit institutional review board (IRB) authorization.
3. **Hardware & Environmental Fragility**: Facial recognition pipelines (OpenCV / dlib / FaceNet) are notoriously sensitive to ambient classroom lighting, camera resolutions, angles, and head occlusion. A bad lighting condition during your live faculty viva can cause catastrophic demo failures.
4. **Development Time**: Model fine-tuning, distance threshold calibration, and anti-spoofing liveness checks consume 4–6 weeks, starving your core database and reporting architecture.
5. **Simpler Alternative [Recommended]**: **Dynamic rotating QR code attendance** with 15-second expiration intervals and Wi-Fi/geolocation bounds. It achieves reliable attendance tracking with zero biometric privacy risk in under 1 week of development.

#### Follow-up Question for Your Team:
What specific camera hardware and lighting setup are you planning to use during your classroom faculty evaluation?`

      return {
        markdown,
        followUps: [
          'Switch to dynamic QR code attendance instead',
          'Evaluate another feature for our project',
          'Lock our finalized project scope',
        ],
        stageUpdates: {
          currentDiscussionStage: 'FEATURE_FEASIBILITY_ANALYSIS',
          rejectedRecommendations: ['Biometric Face Recognition'],
          topicsDiscussed: ['Feasibility: Facial Recognition Attendance'],
        },
      }
    }

    // Generic feature evaluation
    return {
      markdown: `### Feature Scope & Feasibility Guidance

When evaluating any new capability for your capstone project, your faculty review panel will evaluate **three critical criteria**:

1. **Computational Depth**: Does this feature demonstrate software engineering rigor (algorithms, schema design, security) or is it just another UI button?
2. **Semester Feasibility**: Can your team build, test, and document this within your remaining timeline?
3. **Relevance to Problem Statement**: Does it solve a genuine academic problem or is it decorative scope creep?

What is the specific feature you are considering adding to your project?`,
      followUps: [
        'Can I add automated similarity checking?',
        'Can I add PDF export?',
        'How should we structure our team milestones?',
      ],
      stageUpdates: {
        currentDiscussionStage: 'FEATURE_FEASIBILITY_ANALYSIS',
        topicsDiscussed: ['General Feature Scoping'],
      },
    }
  }

  /**
   * Handler for Technical Inquiries
   */
  private handleTechnicalExplanation(
    prompt: string,
    _context: IConversationContext
  ): {
    markdown: string
    followUps: string[]
    stageUpdates: Partial<IConversationContext>
  } {
    const lower = prompt.toLowerCase()

    if (
      (lower.includes('implement') && lower.includes('repository')) ||
      lower.includes('implement the project repository') ||
      lower.includes('implement project repository') ||
      lower.includes('how can we implement the project repository')
    ) {
      const markdown = `### Implementing the Academic Project Repository

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

*Source Attribution: Verified from \`docs/ai-mentor/knowledge/09-project-repository.md\` [Implemented]*

One question to guide your implementation: Are you planning to use MongoDB or a relational database like PostgreSQL for storing your repository records?`

      return {
        markdown,
        followUps: [
          'Explain the Three-Tier Architecture',
          'Do we really need AI for the repository?',
          'Prepare a problem statement',
        ],
        stageUpdates: {
          currentDiscussionStage: 'REPOSITORY_IMPLEMENTATION_DISCUSSION',
          topicsDiscussed: ['Repository Implementation'],
        },
      }
    }

    let topicDoc = '14-system-architecture.md'

    if (lower.includes('similarity') || lower.includes('jaccard')) {
      topicDoc = '09-project-repository.md'
    } else if (lower.includes('sse') || lower.includes('stream')) {
      topicDoc = '11-ai-project-mentor.md'
    } else if (lower.includes('database') || lower.includes('schema') || lower.includes('mongo')) {
      topicDoc = '15-database-architecture.md'
    } else if (lower.includes('docx') || lower.includes('pdf')) {
      topicDoc = '13-proposal-generation.md'
    }

    const docContent = knowledgeService.readKnowledgeDoc(topicDoc) || ''
    const summary = docContent.split('\n\n').slice(0, 4).join('\n\n')

    const markdown = `### Technical Architecture Deep Dive

${summary}

*Source Attribution: Verified from \`docs/ai-mentor/knowledge/${topicDoc}\` [Implemented]*

One question on your architecture: Are you planning to deploy the frontend and backend as a unified monorepo, or as separate decoupled services?`

    return {
      markdown,
      followUps: [
        'Show the schema and API contract',
        'How does this integrate with the frontend?',
        'What are the failure modes to watch out for?',
      ],
      stageUpdates: {
        currentDiscussionStage: 'TECHNICAL_DEEP_DIVE',
        topicsDiscussed: [`Technical: ${topicDoc}`],
      },
    }
  }

  /**
   * Handler for Senior-Junior Connection & Contributor Mentorship Inquiries
   */
  private handleSeniorConnectionInquiry(
    _prompt: string,
    context: IConversationContext
  ): {
    markdown: string
    followUps: string[]
    stageUpdates: Partial<IConversationContext>
  } {
    const projectTitle = context.matchedRepositoryProject?.title || 'CampusProjectHub'
    const isCPH = projectTitle.toLowerCase().includes('campusprojecthub')
    const matchedAuthors = context.matchedRepositoryProject?.authors

    const contributorText =
      matchedAuthors && matchedAuthors.length > 0
        ? matchedAuthors
            .map(
              (a) =>
                `* **${a.name}** (${a.role || 'Contributor'}) — ${
                  a.isAvailableForMentoring ? '🟢 *Available for Mentoring (Opted In)*' : '⚪ *Not Accepting Mentees*'
                }`
            )
            .join('\n')
        : isCPH
        ? `* **Alex Chen** (Lead System Architect, 2025 Batch) — 🟢 *Available for Mentoring*\n* **Priya Patel** (Core AI & Similarity Engineer, 2025 Batch) — 🟢 *Available for Mentoring*\n* **Marcus Vance** (Robotics Contributor) — ⚪ *Currently Unavailable*`
        : `* **Project Lead & Core Team** (${context.matchedRepositoryProject?.department || 'Engineering'}, ${context.matchedRepositoryProject?.academicYear || 'Verified Capstone'})`

    const markdown = `### 🤝 Senior-Junior Connection & Contributor Mentorship

You asked about connecting with the team behind **${projectTitle}** via our Senior-Junior network.

Here is how mentorship and knowledge sharing works within CampusProjectHub:

#### 1. Identified Project Contributors
${contributorText}

#### 2. Academic Etiquette & Guidelines
Connecting with senior alumni and previous project creators is an invaluable learning opportunity, but it requires professional academic respect:
* **Do your homework first**: Review the project abstract, system architecture, and tech stack in the repository before reaching out.
* **Specify a concrete purpose**: Seniors are far more responsive when you state exactly what you need help with (e.g. *Understanding Architecture*, *Overcoming a Specific Tech Stack Hurdle*, or *Discussing a Project Extension*).
* **Keep it concise**: Clearly state your background, what you have already tried, and 1–2 specific questions.

#### 3. Structured Request Draft (You can copy this into your request):
> **Selected Purpose:** *Understanding Architecture & Discussion of Extension*  
> **Note:**  
> *"Hello! I am a junior student exploring your ${projectTitle} project on CampusProjectHub. We are planning to build upon your work for our upcoming capstone. I reviewed your architecture and have two specific questions regarding your database schema and scaling choices. Would you be open to sharing guidance on how you approached the repository indexing? Thank you for your time!"*

#### 4. Strict Zero-Leakage Privacy & Contact Masking Policy
> 🔒 **Privacy Protection (Masked Contact Details):**  
> To protect student privacy, personal email addresses and phone numbers are **strictly masked and never disclosed publicly or by the AI Mentor** (Zero-Leakage standard).  
> Additionally, I **cannot send connection requests on your behalf**.

#### 5. How to Send Your Request:
1. Navigate to the project page in **Explore Projects** (or open the **Project Contributors** panel).
2. Look for the 🟢 **Accepting Mentees** badge on the contributor's card.
3. Click the **"Request Guidance"** button.
4. Select your **Learning Purpose**, paste your note, and submit! Once the senior accepts, a secure in-app messaging channel will open automatically in your **My Connections** workspace.`

    return {
      markdown,
      followUps: [
        'How do I send a connection request from the project page?',
        'What are the 6 states of a connection request?',
        'Can I continue exploring CampusProjectHub architecture?',
      ],
      stageUpdates: {
        currentDiscussionStage: 'SENIOR_MENTORSHIP_GUIDANCE',
        topicsDiscussed: [...(context.topicsDiscussed || []), 'Senior-Junior Mentorship Guidance'],
      },
    }
  }

  /**
   * Handler for Proposal Generation Inquiry
   */
  private handleProposalGenerationInquiry(
    _prompt: string,
    context: IConversationContext
  ): {
    markdown: string
    followUps: string[]
    stageUpdates: Partial<IConversationContext>
  } {
    const projectTitle =
      context.currentProjectIdea ||
      'CampusProjectHub: AI-Powered Academic Project Management Platform'

    const markdown = `I can help you prepare a comprehensive, defense-ready **Academic Project Proposal** formatted to standard institutional guidelines (such as IEEE 830).

### What I will compile for "${projectTitle}":
1. **Standard 15 Canonical Sections**: Title, Abstract, Introduction, Problem Statement, Existing System, Proposed System, Objectives, Scope, Features & Modules, System Architecture, Technology Stack, Proposed Methodology, Expected Outcomes, Timeline & Milestones, and Verified References.
2. **Pedagogical Scope Alignment**: Your proposal directly incorporates your accepted deliverables, milestone roadmap, and explicit defense rationales for excluded features.
3. **Editable Proposal Workspace**: You will be able to edit individual sections, use AI to refine academic tone or clarify technical specs, add custom modules, or reorder sections without re-generating the entire document.
4. **Institutional Export**: Export directly to formatted **DOCX** (OpenXML with tables and page numbers) or **PDF** (PDFKit with clean margins and headers).

> ℹ️ **Academic Integrity Notice**: References must come from real supplied literature (e.g. IEEE 830, ACM, textbooks). Fabricating citations or unverified performance measurements is strictly prohibited.

Would you like me to open the proposal workspace now to review and refine your 15 proposal sections?`

    return {
      markdown,
      followUps: [
        'Open Proposal Workspace',
        'Review current scope completeness first',
        'Check Proposal Readiness criteria',
      ],
      stageUpdates: {
        lastTopicCovered: 'Academic Proposal Generation Guidance',
        topicsDiscussed: [
          ...(context.topicsDiscussed || []),
          'Academic Proposal Generation',
        ],
      },
    }
  }

  /**
   * Handler for Project Suitability Inquiry
   */
  private handleProjectSuitability(
    _prompt: string,
    _context: IConversationContext
  ): {
    markdown: string
    followUps: string[]
    stageUpdates: Partial<IConversationContext>
  } {
    const markdown = `Yes, a project management platform can be a very suitable academic mini-project, provided you carefully define your scope to match a single-semester timeline.

When faculty evaluators review a mini-project, they look for three primary criteria:
1. **Clear Problem Formulation**: Solving a specific workflow challenge (such as academic team collaboration and milestone submission) rather than a toy replica.
2. **Technical Soundness**: Proper relational or document data modeling, role-based authentication, and milestone tracking.
3. **Execution Realism**: A feature set that a student team can comfortably complete, test, and defend within 8 to 12 weeks.

The most common mistake students make is trying to build a full commercial clone like Jira or Asana with real-time video, third-party integrations, and automated billing. That leads to superficial prototypes that fail faculty scrutiny.

Instead, a focused academic MVP featuring **team workspaces, task assignments, milestone submissions, and a basic project archive** is both manageable and academically defensible.

One question to help calibrate: What is your team size and how many weeks do you have before your first project evaluation?`

    return {
      markdown,
      followUps: [
        'Can we reduce the scope to an MVP?',
        'Do we really need AI for this mini-project?',
        'Prepare a problem statement for our mini-project',
      ],
      stageUpdates: {
        currentDiscussionStage: 'PROJECT_SUITABILITY_ASSESSMENT',
        topicsDiscussed: ['Project Suitability Assessment'],
      },
    }
  }

  /**
   * Handler for Turn 2: College Scope Affirmation & Differentiation Strategy
   */
  private handleCollegeScopeAffirmation(
    _prompt: string,
    _context: IConversationContext
  ): {
    markdown: string
    followUps: string[]
    stageUpdates: Partial<IConversationContext>
  } {
    const markdown = `Focusing specifically on an academic institution—college students and faculty guides—is a strong strategic decision. Academic project workflows differ fundamentally from corporate software development.

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

Between the student project workflow and the previous-batch project repository, which part do you see as your primary focus for this semester?`

    return {
      markdown,
      followUps: [
        'What are the disadvantages?',
        'How can we implement the project repository?',
        'Can we reduce the scope?',
      ],
      stageUpdates: {
        mode: 'PROJECT_DISCOVERY',
        currentDiscussionStage: 'SCOPE_AND_DIFFERENTIATION_ANALYZED',
        topicsDiscussed: [
          'College Workflow vs Enterprise Tools',
          'Academic Milestone Gating',
          'Mini-Project Scoping Boundaries',
        ],
      },
    }
  }

  /**
   * Handler for Disadvantages & Technical Trade-offs Inquiry
   */
  private handleDisadvantagesInquiry(
    _prompt: string,
    _context: IConversationContext
  ): {
    markdown: string
    followUps: string[]
    stageUpdates: Partial<IConversationContext>
  } {
    const markdown = `Every software engineering architecture involves trade-offs. Here is an honest, critical assessment of the technical disadvantages and limitations of CampusProjectHub:

1. **The Cold-Start Repository Problem**: The repository and similarity engines deliver high value only when historical project data exists. If a department starts with an empty database, students receive fewer benchmark comparisons until faculty or admins seed previous batch records.
2. **AI Provider Latency and API Costs**: Using large cloud LLMs introduces latency into conversational streaming and ongoing API token expenses. Running local or quantized models requires GPU infrastructure that many colleges lack.
3. **Verification Overhead for User-Submitted Data**: If graduating seniors upload their own project metadata without faculty verification, unverified or low-quality code repositories could pollute the departmental archive.
4. **Faculty Adoption Resistance**: Academic faculty already have heavy grading workloads. If the submission and approval workflow feels too complex or rigid compared to a simple email or spreadsheet, faculty engagement drops.
5. **PII and Data Privacy Balancing**: Enabling junior-senior connections while strictly protecting student privacy (preventing phone number and personal email scraping) requires careful role-based access control and masking layers.

In your viva defense, admitting these limitations—and explaining your mitigation strategies (such as admin data seeding, caching, and privacy masking)—demonstrates mature engineering judgment.

Would you like to discuss how we mitigate the cold-start problem or how the privacy masking architecture works?`

    return {
      markdown,
      followUps: [
        'How can we implement the project repository?',
        'Do we really need AI?',
        'Explain the architecture',
      ],
      stageUpdates: {
        currentDiscussionStage: 'DISADVANTAGES_AND_LIMITATIONS_ANALYSIS',
        topicsDiscussed: ['Technical Trade-offs & Limitations'],
      },
    }
  }

  /**
   * Handler for AI Necessity Inquiry
   */
  private handleAINecessityInquiry(
    _prompt: string,
    _context: IConversationContext
  ): {
    markdown: string
    followUps: string[]
    stageUpdates: Partial<IConversationContext>
  } {
    const markdown = `To be completely honest as a software engineering mentor: **No, you do not strictly need AI for the baseline functionality of a project management system.**

A standard project management tool with task assignments, Kanban boards, and project search can be built entirely with deterministic web technologies: React, Node.js, Express, and a relational or document database. Standard full-text search handles repository queries reliably without any AI.

However, adding AI is justified when it solves problems that deterministic code cannot easily handle:

1. **Subjective Feature Feasibility Evaluation**: An AI Mentor can evaluate a student's proposed feature list (e.g. attempting real-time facial recognition and blockchain in 8 weeks) and provide an honest feasibility critique with trade-offs.
2. **Semantic Similarity & Research Gaps**: Beyond exact keyword matching, AI can recognize that "Smart Attendance with Face ID" and "Automated Biometric Classroom Check-in" tackle the exact same problem statement.
3. **Academic Proposal Drafting**: Transforming raw feature decisions into formal, 15-section IEEE 830 documentation saves students weeks of formatting friction while keeping academic structure consistent.

If you include AI, use it where it adds genuine pedagogical value—never add AI simply as a buzzword for marks, because examiners will probe whether a simple database query could have done the job.

Are you considering AI primarily for intelligent project search, idea feasibility evaluation, or automated proposal generation?`

    return {
      markdown,
      followUps: [
        'Is this project suitable for a mini-project?',
        'Can we reduce the scope?',
        'Prepare a problem statement',
      ],
      stageUpdates: {
        currentDiscussionStage: 'AI_NECESSITY_ASSESSMENT',
        topicsDiscussed: ['AI Necessity & Justification'],
      },
    }
  }

  /**
   * Handler for Scope Reduction Inquiry
   */
  private handleScopeReduction(
    _prompt: string,
    _context: IConversationContext
  ): {
    markdown: string
    followUps: string[]
    stageUpdates: Partial<IConversationContext>
  } {
    const markdown = `Yes, reducing your scope is often the smartest engineering decision you can make for a college mini-project. Evaluators consistently award higher marks to a **clean, fully working core system** than to an ambitious project with multiple broken, half-implemented features.

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

Which specific feature in your current plan are you most concerned might be too time-consuming to build?`

    return {
      markdown,
      followUps: [
        'Is this project suitable for a mini-project?',
        'How can we implement the project repository?',
        'Prepare a problem statement',
      ],
      stageUpdates: {
        currentDiscussionStage: 'SCOPE_REDUCTION_PLANNING',
        topicsDiscussed: ['Scope Reduction & MVP Definition'],
      },
    }
  }

  /**
   * Handler for Problem Statement Formulation
   */
  private handleProblemStatement(
    _prompt: string,
    _context: IConversationContext
  ): {
    markdown: string
    followUps: string[]
    stageUpdates: Partial<IConversationContext>
  } {
    const markdown = `### Academic Problem Statement Formulation

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

Would you like to refine this problem statement for your specific department, or formulate the measurable project objectives next?`

    return {
      markdown,
      followUps: [
        'Formulate the measurable project objectives',
        'What makes CampusProjectHub different?',
        'Can we reduce the scope?',
      ],
      stageUpdates: {
        currentDiscussionStage: 'PROBLEM_STATEMENT_FORMULATION',
        topicsDiscussed: ['Problem Statement Formulation'],
      },
    }
  }

  /**
   * Handler for Explaining Project to Faculty Guide (Viva Defense Pitch)
   */
  private handleFacultyExplanation(
    _prompt: string,
    _context: IConversationContext
  ): {
    markdown: string
    followUps: string[]
    stageUpdates: Partial<IConversationContext>
  } {
    const markdown = `### Explaining CampusProjectHub to Your Faculty Guide: 3-Minute Academic Defense Pitch

When presenting CampusProjectHub to your project guide or department evaluation committee, emphasize **academic software engineering principles, institutional continuity, and faculty governance** rather than treating it like a standard commercial task board.

Here is a structured, step-by-step presentation framework:

#### 1. The Core Academic Problem (The "Why")
Start by addressing the systemic problems that every faculty guide observes year after year:
> *"Respected guide, in our department, past project deliverables, architectures, and lessons learned are scattered across Google Drives or physical library shelves. Every academic year, incoming batches unknowingly propose identical project ideas with zero technical advancement. Furthermore, team coordination is fragmented across WhatsApp and Google Docs, leaving guides with high overhead tracking student milestone authenticity."*

#### 2. The CampusProjectHub Solution (The "What")
Explain the 4 interconnected pillars:
1. **Living Departmental Repository**: A permanent 33-field archive of verified capstones, featuring **dual-stage token Jaccard similarity analysis** that detects duplicate project scopes early.
2. **Pedagogical AI Project Mentor**: An interactive guide that provides honest feasibility critiques on scope creep (e.g. warning against building unviable blockchain or biometric modules in a single semester).
3. **Formal Faculty Governance & Stage-Gating**: An explicit review state machine (\`DRAFT\` ➔ \`SUBMITTED\` ➔ \`CHANGES_REQUESTED\` ➔ \`APPROVED\`) with immutable audit logging. **Crucially: The AI acts solely as an advisor; the human faculty guide holds ultimate academic approval authority.**
4. **Automated IEEE 830 Proposal Generation**: Compiling accepted deliverables into standardized 15-section DOCX and PDF formats for formal department submission.

#### 3. Technical Rigor & Architecture (The "How")
- **Three-Tier Architecture**: React 19 + TypeScript 5.7 frontend, Node.js + Express backend with Zod validation, and MongoDB/Mongoose persistence with embedded in-memory failover.
- **Privacy & Security**: Zero-leakage contact masking (\`s****@college.edu\`) and consent-based mentorship channels protecting student PII.
- **Audio Engineering**: 24kHz wideband neural voice synthesis for accessible mentorship interaction.

#### 4. Differentiation from Commercial Tools
Anticipate the inevitable examiner question (*"Why not just use Trello or Jira?"*):
> *"Trello and Jira are designed for corporate agile sprints. They have zero institutional memory across graduating batches, no IEEE 830 documentation generators, no project similarity checking, and no stage-gated faculty review rubrics."*

#### 5. Suggested Talking Points for Your Viva:
- **Phase 1 Deliverable**: Repository indexing with verified department project benchmarks.
- **Phase 2 Deliverable**: Team workspace, milestone submission pipeline, and AI feasibility evaluation.
- **Phase 3 Deliverable**: Guide review dashboard and IEEE proposal export.`

    return {
      markdown,
      followUps: [
        'Prepare a problem statement',
        'Explain the system architecture',
        'What are its disadvantages?',
      ],
      stageUpdates: {
        currentDiscussionStage: 'FACULTY_DEFENSE_EXPLANATION',
        topicsDiscussed: ['Faculty Presentation & Defense Guidance'],
      },
    }
  }

  /**
   * Handler for General Academic Mentoring
   */
  private handleGeneralMentoring(
    prompt: string,
    _context: IConversationContext
  ): {
    markdown: string
    followUps: string[]
    stageUpdates: Partial<IConversationContext>
  } {
    const trimmed = (prompt || '').trim()
    const lower = trimmed.toLowerCase()

    if (!trimmed || lower === 'hi' || lower === 'hello' || lower.startsWith('hey')) {
      const markdown = `Hello! I am your **CampusProjectHub AI Mentor — Your Honest Academic Project Guide**.

I am here to guide your team through planning, evaluating, and defending your academic project.

How can I help you today? You can:
- **Share a project idea**: We can evaluate its feasibility and identify what will make it unique.
- **Explore CampusProjectHub**: Ask about our 16 modules, architecture, or repository intelligence.
- **Evaluate features**: Check whether specific features fit into a realistic semester scope.
- **Prepare documentation**: Formulate your problem statement, objectives, or proposal.`

      return {
        markdown,
        followUps: [
          'I have a mini-project idea about a project management system',
          'What makes CampusProjectHub different?',
          'Explain the architecture',
        ],
        stageUpdates: {
          currentDiscussionStage: 'GREETING',
          topicsDiscussed: ['General Greeting'],
        },
      }
    }

    const markdown = `That is an interesting question regarding your academic project.

When approaching this from a software engineering perspective:
1. **Identify the Core Requirement**: Distinguish between the functional requirement (what the user actually accomplishes) and the implementation mechanism (the specific library or database).
2. **Assess Complexity**: Ensure the solution does not introduce excessive dependencies or infrastructure requirements beyond your team's available semester timeline.
3. **Academic Evaluation Alignment**: University evaluation committees assess your understanding of design choices, trade-offs, and empirical results.

Would you like to explore how this fits into your overall project scope, or would you like to examine a concrete implementation pattern?`

    return {
      markdown,
      followUps: [
        'How does this fit into our project scope?',
        'Show an implementation example',
        'What makes CampusProjectHub different?',
      ],
      stageUpdates: {
        currentDiscussionStage: 'MENTORING_DISCUSSION',
        topicsDiscussed: ['Technical Mentoring'],
      },
    }
  }
}

export const conversationalEngine = new ConversationalEngine()
