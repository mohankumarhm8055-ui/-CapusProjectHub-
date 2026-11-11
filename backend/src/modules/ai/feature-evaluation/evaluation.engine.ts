import {
  FeatureClassification,
  IEvaluatedFeature,
  IProjectConstraints,
  OverallFeasibilityRating,
} from './evaluation.model.js'
import { CollectedProjectContext } from './context.engine.js'

export class EvaluationEngine {
  /**
   * Evaluates all proposed features across the 7 academic dimensions
   */
  evaluateProject(context: CollectedProjectContext): {
    evaluatedFeatures: IEvaluatedFeature[]
    overallFeasibility: {
      rating: OverallFeasibilityRating
      summary: string
      primaryBottlenecks: string[]
      recommendedReleaseScope: string
    }
  } {
    const evaluatedFeatures = context.proposedFeatures.map((featureName) =>
      this.evaluateFeature(featureName, context.constraints, context.proposedFeatures)
    )

    const overallFeasibility = this.computeOverallFeasibility(evaluatedFeatures, context.constraints)

    return {
      evaluatedFeatures,
      overallFeasibility,
    }
  }

  /**
   * Standalone evaluator for an individual proposed feature inquiry
   */
  evaluateSingleFeature(
    featureName: string,
    customConstraints?: Partial<IProjectConstraints>,
    projectContext?: { projectTitle?: string; existingFeatures?: string[] }
  ): IEvaluatedFeature {
    const defaultConstraints: IProjectConstraints = {
      teamSize: customConstraints?.teamSize || 3,
      technicalExperience: customConstraints?.technicalExperience || 'intermediate',
      developmentWeeks: customConstraints?.developmentWeeks || 12,
      semesterDeadline: customConstraints?.semesterDeadline || 'End of Semester',
      languagesAndFrameworks: customConstraints?.languagesAndFrameworks || ['TypeScript', 'React', 'Node.js'],
      hardwareResources: customConstraints?.hardwareResources || ['Standard PC / Laptop'],
      budget: customConstraints?.budget || 'Zero-cost open source tools',
      academicRequirements: customConstraints?.academicRequirements || 'Standard Capstone Rubric',
    }

    const allFeatures = projectContext?.existingFeatures || [featureName]
    return this.evaluateFeature(featureName, defaultConstraints, allFeatures)
  }

  /**
   * Evaluates an individual feature using 7-dimensional criteria
   */
  evaluateFeature(
    name: string,
    constraints: IProjectConstraints,
    _allProposedFeatures: string[]
  ): IEvaluatedFeature {
    const n = name.toLowerCase().trim()
    const featureId = name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
    const isBeginner = constraints.technicalExperience === 'beginner'
    const isShortTime = constraints.developmentWeeks < 6
    const isLongTime = constraints.developmentWeeks >= 14

    // 1. Student Project Management
    if (n.includes('project management') || n.includes('milestone')) {
      return {
        featureId,
        name: 'Student Project Management',
        classification: 'ESSENTIAL',
        dimensions: {
          problemRelevance: {
            solvesRealProblem: true,
            rationale: 'Addresses the primary academic issue of unstructured capstone progress and lost deadline deliverables.',
          },
          userValue: {
            primaryBeneficiary: 'both',
            rationale: 'Provides transparent progress checklists for students and structured oversight for faculty advisors.',
          },
          originality: {
            contributionType: 'Core Domain Foundation',
            rationale: 'Standard capstone management requirement; sets the baseline upon which intelligent features operate.',
          },
          technicalFeasibility: {
            realisticForTeam: true,
            rationale: 'Well-understood relational/document data models with standard REST APIs.',
          },
          complexity: {
            level: 'LOW',
            rationale: 'Standard CRUD state management with stage gating.',
          },
          resourceRequirements: {
            requiredResources: ['Standard database', 'Express REST API'],
            rationale: 'Requires zero external paid APIs or specialized compute.',
          },
          timeSuitability: {
            fitsDeadline: true,
            estimatedWeeks: 2,
            rationale: 'Can easily be completed within initial sprint.',
          },
        },
        dependencies: [],
        potentialRisks: ['Over-engineering complex Gantt chart visualizations instead of simple milestone lists.'],
        recommendation: 'Prioritize as first foundational milestone. Keep task states straightforward (DRAFT, IN_PROGRESS, REVIEW, COMPLETED).',
        assumptions: ['Built using existing MongoDB schema.'],
      }
    }

    // 2. Team Collaboration
    if (n.includes('collaboration') || n.includes('team')) {
      return {
        featureId,
        name: 'Student Team Collaboration',
        classification: 'ESSENTIAL',
        dimensions: {
          problemRelevance: {
            solvesRealProblem: true,
            rationale: 'Eliminates asymmetric student contributions and lack of accountability in team projects.',
          },
          userValue: {
            primaryBeneficiary: 'student',
            rationale: 'Enables clear role assignment (e.g. Lead, ML Engineer, Frontend) and activity audit visibility.',
          },
          originality: {
            contributionType: 'Academic Collaboration',
            rationale: 'Tailored specifically to capstone team structures rather than enterprise corporate hierarchies.',
          },
          technicalFeasibility: {
            realisticForTeam: true,
            rationale: 'Directly supported by team schema and role-based permissions.',
          },
          complexity: {
            level: 'LOW',
            rationale: 'Straightforward team-member association with project records.',
          },
          resourceRequirements: {
            requiredResources: ['User authentication', 'Team entity in database'],
            rationale: 'Zero external service dependencies.',
          },
          timeSuitability: {
            fitsDeadline: true,
            estimatedWeeks: 2,
            rationale: 'Easily manageable in early development phases.',
          },
        },
        dependencies: ['Student Project Management'],
        potentialRisks: ['Scope creep from attempting real-time collaborative whiteboarding.'],
        recommendation: 'Include team roster, member roles, and task ownership. Avoid building heavy real-time chat protocols for initial release.',
        assumptions: ['Authentication already established.'],
      }
    }

    // 3. College Project Repository
    if (n.includes('repository') || n.includes('discovery')) {
      return {
        featureId,
        name: 'College Project Repository',
        classification: 'ESSENTIAL',
        dimensions: {
          problemRelevance: {
            solvesRealProblem: true,
            rationale: 'Solves the university problem of institutional amnesia where senior capstones disappear after graduation.',
          },
          userValue: {
            primaryBeneficiary: 'both',
            rationale: 'Juniors discover proven architectures; faculty assess historical department innovation.',
          },
          originality: {
            contributionType: 'Institutional Knowledge Base',
            rationale: 'Combines multi-faceted filters (department, academic year, tech stack) with privacy masking.',
          },
          technicalFeasibility: {
            realisticForTeam: true,
            rationale: 'Compound and text indexing in MongoDB provide fast query execution.',
          },
          complexity: {
            level: 'MEDIUM',
            rationale: 'Requires careful data modeling (33+ fields) and student contact masking security.',
          },
          resourceRequirements: {
            requiredResources: ['Database indexing', 'Sanitization middleware'],
            rationale: 'Standard database resources with zero external cost.',
          },
          timeSuitability: {
            fitsDeadline: true,
            estimatedWeeks: 3,
            rationale: 'Directly achievable within semester scope.',
          },
        },
        dependencies: [],
        potentialRisks: ['Leaking student personal contact information without proper masking.'],
        recommendation: 'Build as the primary knowledge store. Ensure private phone and email fields are stripped from public responses.',
        assumptions: ['Canonical project repository schema utilized.'],
      }
    }

    // 4. AI Project Similarity Detection
    if (n.includes('similarity') || n.includes('duplicate')) {
      const classification: FeatureClassification = isShortTime ? 'OPTIONAL' : 'RECOMMENDED'
      return {
        featureId,
        name: 'AI Project Similarity Detection',
        classification,
        dimensions: {
          problemRelevance: {
            solvesRealProblem: true,
            rationale: 'Prevents students from unwittingly submitting duplicate projects that duplicate previous years.',
          },
          userValue: {
            primaryBeneficiary: 'both',
            rationale: 'Protects students from viva rejection and saves faculty hours of manual duplicate checking.',
          },
          originality: {
            contributionType: 'Dual-Stage Integrity Intelligence',
            rationale: 'Distinguishes between shared technology and true conceptual duplication (Similarity != Plagiarism).',
          },
          technicalFeasibility: {
            realisticForTeam: !isBeginner,
            rationale: isBeginner
              ? 'Moderate challenge for beginners; feasible using token Jaccard containment.'
              : 'Highly feasible using token n-gram Jaccard matching with local vector cosine fallback.',
          },
          complexity: {
            level: isBeginner ? 'HIGH' : 'MEDIUM',
            rationale: 'Requires careful text tokenization, containment math, and edge-case handling.',
          },
          resourceRequirements: {
            requiredResources: ['Lightweight text processing', 'In-memory token analysis'],
            rationale: 'Can run 100% locally on CPU without paid vector cloud databases.',
          },
          timeSuitability: {
            fitsDeadline: !isShortTime,
            estimatedWeeks: isBeginner ? 4 : 3,
            rationale: 'Feasible in standard 12-week semester; challenging if under 6 weeks.',
          },
        },
        dependencies: ['College Project Repository'],
        potentialRisks: [
          'False plagiarism accusations if shared framework libraries are treated as conceptual duplicates.',
          'High latency if relying on remote cloud embeddings.',
        ],
        recommendation: 'Implement dual-stage containment: character/token Jaccard for title containment and isolated technology classification.',
        simplerAlternative: 'Deterministic keyword and department-indexed text search.',
        assumptions: ['Repository projects have problem statements available.'],
      }
    }

    // 5. AI Feature Evaluation
    if (n.includes('feature evaluation') || n.includes('feasibility')) {
      return {
        featureId,
        name: 'AI Feature Evaluation Engine',
        classification: 'RECOMMENDED',
        dimensions: {
          problemRelevance: {
            solvesRealProblem: true,
            rationale: 'Students consistently fall into scope-creep traps that cause unfinished prototypes at semester end.',
          },
          userValue: {
            primaryBeneficiary: 'student',
            rationale: 'Provides honest pedagogical feedback and viva defense preparation before committee reviews.',
          },
          originality: {
            contributionType: 'Pedagogical Mentorship Intelligence',
            rationale: 'Replaces generic chatbot advice with transparent 7-dimensional academic auditing.',
          },
          technicalFeasibility: {
            realisticForTeam: true,
            rationale: 'Deterministic rule validation paired with structured LLM explanations.',
          },
          complexity: {
            level: 'MEDIUM',
            rationale: 'Requires structured output validation, state persistence, and final scope generation.',
          },
          resourceRequirements: {
            requiredResources: ['AI Provider Adapter (Gemini / Mock)', 'MongoDB persistence'],
            rationale: 'Utilizes existing provider layer with zero additional infrastructure.',
          },
          timeSuitability: {
            fitsDeadline: true,
            estimatedWeeks: 3,
            rationale: 'Fits comfortably into middle-stage project sprints.',
          },
        },
        dependencies: ['Student Project Management'],
        potentialRisks: ['Overly rigid classification discouraging student exploration.'],
        recommendation: 'Keep student in full control with Accept, Reject, and Modify controls for every recommendation.',
        assumptions: ['Existing conversation and provider layer reused.'],
      }
    }

    // 6. Academic Proposal Generation
    if (n.includes('proposal generation') || n.includes('academic proposal')) {
      const classification: FeatureClassification = isShortTime ? 'OPTIONAL' : 'RECOMMENDED'
      return {
        featureId,
        name: 'Academic Proposal Generation',
        classification,
        dimensions: {
          problemRelevance: {
            solvesRealProblem: true,
            rationale: 'Students struggle with formal academic phrasing (IEEE 830 functional & non-functional requirements).',
          },
          userValue: {
            primaryBeneficiary: 'both',
            rationale: 'Transforms scattered student bullet points into structured academic project proposals.',
          },
          originality: {
            contributionType: 'Automated Academic Synthesis',
            rationale: 'Extracts validated scope, problem formulation, and objectives into standardized formats.',
          },
          technicalFeasibility: {
            realisticForTeam: true,
            rationale: 'Prompt engineering and schema aggregation over accepted feature decisions.',
          },
          complexity: {
            level: 'MEDIUM',
            rationale: 'Requires aggregating finalized scope, constraints, and milestones.',
          },
          resourceRequirements: {
            requiredResources: ['Structured AI generation', 'JSON-to-markdown synthesizer'],
            rationale: 'Standard computational requirements.',
          },
          timeSuitability: {
            fitsDeadline: !isShortTime,
            estimatedWeeks: 2,
            rationale: 'Manageable once final scope is established.',
          },
        },
        dependencies: ['AI Feature Evaluation Engine', 'Student Project Management'],
        potentialRisks: ['Hallucinated academic citations or fabricated research methodologies.'],
        recommendation: 'Ground all generated proposal sections strictly on user-accepted feature decisions and verified problem formulation.',
        simplerAlternative: 'Structured markdown preview with manual copy-to-clipboard.',
        assumptions: ['Final scope is generated before proposal drafting.'],
      }
    }

    // 7. College-Specific DOCX Templates
    if (n.includes('docx') || n.includes('template') || n.includes('pdf template')) {
      const classification: FeatureClassification = isLongTime ? 'RECOMMENDED' : 'OPTIONAL'
      return {
        featureId,
        name: 'College-Specific DOCX Proposal Templates',
        classification,
        dimensions: {
          problemRelevance: {
            solvesRealProblem: true,
            rationale: 'Colleges enforce strict typographical guidelines (margins, font hierarchies, cover sheet rubrics).',
          },
          userValue: {
            primaryBeneficiary: 'student',
            rationale: 'Saves days of tedious manual document formatting before thesis submission.',
          },
          originality: {
            contributionType: 'Institutional Customization',
            rationale: 'Applies college-specific headers, logos, and signatures programmatically.',
          },
          technicalFeasibility: {
            realisticForTeam: true,
            rationale: 'Feasible using Node.js docx library; avoids risky browser automation.',
          },
          complexity: {
            level: 'MEDIUM',
            rationale: 'Managing precise XML/DOCX styles and table layouts requires careful styling logic.',
          },
          resourceRequirements: {
            requiredResources: ['docx NPM library', 'Buffer streaming API'],
            rationale: 'Lightweight server-side library execution.',
          },
          timeSuitability: {
            fitsDeadline: isLongTime || !isShortTime,
            estimatedWeeks: 3,
            rationale: 'Best scheduled as an enhancement milestone after core scope is solidified.',
          },
        },
        dependencies: ['Academic Proposal Generation'],
        potentialRisks: ['Document corruption or formatting discrepancies across MS Word versions.'],
        recommendation: 'Implement in a secondary phase after proposal generation logic is verified. Use deterministic programmatic docx templates.',
        simplerAlternative: 'Clean Markdown export or standardized HTML print-to-PDF layout.',
        assumptions: ['College template schema defined.'],
      }
    }

    // 8. Faculty Review and Approval
    if (n.includes('faculty review') || n.includes('approval') || n.includes('rubric')) {
      return {
        featureId,
        name: 'Faculty Project Review & Approval Workflow',
        classification: 'ESSENTIAL',
        dimensions: {
          problemRelevance: {
            solvesRealProblem: true,
            rationale: 'Academic capstones are legally invalid without formal institutional faculty approvals.',
          },
          userValue: {
            primaryBeneficiary: 'faculty',
            rationale: 'Provides faculty review committee with Approve, Reject, and Request Changes workflow.',
          },
          originality: {
            contributionType: 'Institutional Governance',
            rationale: 'Integrates review decisions with immutable audit logs and change request revision loops.',
          },
          technicalFeasibility: {
            realisticForTeam: true,
            rationale: 'Standard state machine transitions backed by authentication middleware.',
          },
          complexity: {
            level: 'LOW',
            rationale: 'Clean enum status transitions and audit log entries.',
          },
          resourceRequirements: {
            requiredResources: ['Authentication middleware', 'Audit log repository'],
            rationale: 'Existing backend models already support this.',
          },
          timeSuitability: {
            fitsDeadline: true,
            estimatedWeeks: 2,
            rationale: 'Easily achievable within initial project phases.',
          },
        },
        dependencies: ['Student Project Management'],
        potentialRisks: ['Allowing students to inadvertently bypass faculty approval state checks.'],
        recommendation: 'Strictly enforce server-side role validation (req.user.role === faculty). Mask rejection notes from unprivileged users.',
        assumptions: ['Faculty accounts are designated in authentication system.'],
      }
    }

    // 9. Real-Time AI Voice Interaction
    if (n.includes('voice') || n.includes('webrtc') || n.includes('speech-to-text') || n.includes('audio')) {
      return {
        featureId,
        name: 'Real-Time AI Voice Interaction (WebRTC)',
        classification: 'UNNECESSARY',
        dimensions: {
          problemRelevance: {
            solvesRealProblem: false,
            rationale: 'Academic capstones require precise written code, tables, and architectures; speech audio introduces latency and transcription errors for code keywords.',
          },
          userValue: {
            primaryBeneficiary: 'student',
            rationale: 'Provides a flashy demo feature, but adds minimal pedagogical value compared to structured text critiques.',
          },
          originality: {
            contributionType: 'Novelty UI Feature',
            rationale: 'Adds high complexity without advancing core academic project management objectives.',
          },
          technicalFeasibility: {
            realisticForTeam: false,
            rationale: 'WebRTC audio streaming, TURN/STUN servers, and sub-second speech LLM pipelines exceed typical undergraduate semester capabilities.',
          },
          complexity: {
            level: 'CRITICAL',
            rationale: 'Disproportionately high failure risk during live project defense (mic permission errors, background noise, network packet loss).',
          },
          resourceRequirements: {
            requiredResources: ['Paid speech APIs', 'TURN servers', 'High-bandwidth infrastructure'],
            rationale: 'Requires paid third-party cloud speech services or dedicated GPU hardware.',
          },
          timeSuitability: {
            fitsDeadline: false,
            estimatedWeeks: 6,
            rationale: 'Would consume over 50% of the entire semester timeline, starving core academic capabilities.',
          },
        },
        dependencies: ['AI Project Mentor'],
        potentialRisks: [
          'Total demonstration failure during live faculty viva due to classroom microphone or ambient noise issues.',
          'High ongoing API costs for speech synthesis and transcription.',
        ],
        recommendation: 'Exclude from initial mini-project scope. This is a classic scope-creep trap that distracts from core academic management.',
        simplerAlternative: 'Voice Mode Preview modal with text simulation, or browser native Web Speech API toggle for input.',
        assumptions: ['Mini-project timeline and zero-budget constraint.'],
      }
    }

    // 10. Facial Recognition / Biometric Attendance
    if (
      n.includes('facial recognition') ||
      n.includes('face recognition') ||
      n.includes('biometric') ||
      n.includes('fingerprint') ||
      (n.includes('face') && n.includes('attendance'))
    ) {
      return {
        featureId,
        name: 'Facial Recognition Attendance System',
        classification: 'UNNECESSARY',
        dimensions: {
          problemRelevance: {
            solvesRealProblem: false,
            rationale: 'While attendance tracking is a valid academic objective, biometric face recognition introduces severe student privacy consent hurdles and lighting calibration dependencies.',
          },
          userValue: {
            primaryBeneficiary: 'both',
            rationale: 'Automates check-ins, but poses privacy concerns regarding storage of biometric vector embeddings on campus servers.',
          },
          originality: {
            contributionType: 'High-Friction Biometric Automation',
            rationale: 'Commonly attempted project idea with high failure rate due to lighting variations, occlusion, and spoofing vulnerabilities.',
          },
          technicalFeasibility: {
            realisticForTeam: !isBeginner,
            rationale: 'Requires camera hardware setup, dlib/OpenCV facial landmark alignment, anti-spoofing liveness detection, and fine-tuning embedding distance thresholds.',
          },
          complexity: {
            level: 'HIGH',
            rationale: 'High environmental fragility during live classroom or examination conditions.',
          },
          resourceRequirements: {
            requiredResources: ['High-resolution camera hardware', 'GPU/Accelerated inference runtime', 'Student biometric consent agreement'],
            rationale: 'Demands dedicated optical hardware and compliance with institutional student data privacy policies.',
          },
          timeSuitability: {
            fitsDeadline: !isShortTime,
            estimatedWeeks: 5,
            rationale: 'Consumes excessive engineering time troubleshooting camera lighting and false matches instead of core workflow business logic.',
          },
        },
        dependencies: ['Student Management Module'],
        potentialRisks: [
          'Ethical and institutional privacy non-compliance from storing facial feature vectors without institutional review board approval.',
          'False positives/negatives during live viva demonstrations in varying room ambient lighting.',
        ],
        recommendation: 'Classified as Unnecessary for initial scope. Replace high-risk biometric processing with a reliable, privacy-preserving cryptographic approach.',
        simplerAlternative: 'Dynamic rotating QR code attendance with geolocation bounds, or RFID/NFC smart student ID card scanning.',
        assumptions: ['Undergraduate semester project evaluated by faculty review panel on software reliability.'],
      }
    }

    // 11. Blockchain Ledger / Decentralized Smart Contracts
    if (n.includes('blockchain') || n.includes('smart contract') || n.includes('web3') || n.includes('crypto')) {
      return {
        featureId,
        name: 'Blockchain Ledger for Project Submissions',
        classification: 'UNNECESSARY',
        dimensions: {
          problemRelevance: {
            solvesRealProblem: false,
            rationale: 'An institutional college management system is governed by a trusted academic authority (college faculty and registrar), not an untrusted anonymous decentralized consensus.',
          },
          userValue: {
            primaryBeneficiary: 'student',
            rationale: 'Provides novelty branding, but adds transaction gas costs and immutable state complications when faculty request project corrections.',
          },
          originality: {
            contributionType: 'Buzzword Architecture Trap',
            rationale: 'Forces decentralized mechanics onto a fundamentally centralized institutional hierarchical workflow.',
          },
          technicalFeasibility: {
            realisticForTeam: false,
            rationale: 'Solidity contracts, testnets, gas estimation, and MetaMask wallet integration add high cognitive overhead with zero academic rubric benefit.',
          },
          complexity: {
            level: 'CRITICAL',
            rationale: 'Extreme complexity for zero functional gain; inability to update or patch rejected projects due to immutability.',
          },
          resourceRequirements: {
            requiredResources: ['Testnet faucets or Ethereum gas fees', 'Web3 RPC providers (Infura/Alchemy)', 'Crypto wallet browser extensions'],
            rationale: 'Forces students and evaluators to install external crypto extensions to test basic student features.',
          },
          timeSuitability: {
            fitsDeadline: false,
            estimatedWeeks: 6,
            rationale: 'Substantially delays the delivery of core project management features.',
          },
        },
        dependencies: ['Project Submission Service'],
        potentialRisks: [
          'Faculty evaluators refusing to install crypto wallets or fund gas fees during final grading.',
          'Immutable ledger prevents faculty from requesting changes or students from fixing submissions.',
        ],
        recommendation: 'Classified as Unnecessary. Institutional governance is better served by standard relational auditing with cryptographic SHA-256 document hashing.',
        simplerAlternative: 'MongoDB audit log collection with cryptographic SHA-256 checksums and digital faculty approval signatures.',
        assumptions: ['College institutional authority model.'],
      }
    }

    // Generic Fallback Feature Evaluator
    return {
      featureId,
      name,
      classification: isBeginner || isShortTime ? 'OPTIONAL' : 'RECOMMENDED',
      dimensions: {
        problemRelevance: {
          solvesRealProblem: true,
          rationale: `Proposed capability (${name}) addresses a supplementary student workflow requirement.`,
        },
        userValue: {
          primaryBeneficiary: 'both',
          rationale: 'Improves platform completeness and student satisfaction.',
        },
        originality: {
          contributionType: 'Incremental Enhancement',
          rationale: 'Extends baseline platform capabilities.',
        },
        technicalFeasibility: {
          realisticForTeam: !isBeginner,
          rationale: isBeginner
            ? 'May present unexpected technical integration hurdles for novice developers.'
            : 'Feasible with standard full-stack implementation.',
        },
        complexity: {
          level: isBeginner ? 'HIGH' : 'MEDIUM',
          rationale: 'Standard complexity relative to student team experience.',
        },
        resourceRequirements: {
          requiredResources: ['Standard development stack'],
          rationale: 'Fits within zero-cost development constraints.',
        },
        timeSuitability: {
          fitsDeadline: !isShortTime,
          estimatedWeeks: isBeginner ? 4 : 2.5,
          rationale: 'Manageable provided foundational milestones are completed on schedule.',
        },
      },
      dependencies: ['Student Project Management'],
      potentialRisks: ['Distraction from core essential milestones.'],
      recommendation: 'Implement only after Essential project management and repository capabilities are fully stabilized.',
      simplerAlternative: 'Basic manual interface or mock data service.',
      assumptions: ['Evaluated against general academic mini-project criteria.'],
    }
  }

  /**
   * Computes holistic project feasibility across all evaluated features
   */
  computeOverallFeasibility(
    features: IEvaluatedFeature[],
    constraints: IProjectConstraints
  ): {
    rating: OverallFeasibilityRating
    summary: string
    primaryBottlenecks: string[]
    recommendedReleaseScope: string
  } {
    const essentialCount = features.filter((f) => f.classification === 'ESSENTIAL').length
    const unnecessaryCount = features.filter((f) => f.classification === 'UNNECESSARY').length
    const criticalComplexityCount = features.filter((f) => f.dimensions.complexity.level === 'CRITICAL').length
    const totalWeeksNeeded = features
      .filter((f) => f.classification === 'ESSENTIAL' || f.classification === 'RECOMMENDED')
      .reduce((sum, f) => sum + f.dimensions.timeSuitability.estimatedWeeks, 0)

    const bottlenecks: string[] = []
    if (unnecessaryCount > 0) {
      bottlenecks.push('Presence of high-risk unnecessary features that introduce architectural complexity.')
    }
    if (criticalComplexityCount > 0) {
      bottlenecks.push('Critical complexity features exceeding undergraduate semester capability.')
    }
    if (totalWeeksNeeded > constraints.developmentWeeks * 1.3) {
      bottlenecks.push(`Total implementation workload (${totalWeeksNeeded} weeks) exceeds available development window (${constraints.developmentWeeks} weeks).`)
    }
    if (constraints.technicalExperience === 'beginner' && essentialCount + unnecessaryCount > 6) {
      bottlenecks.push('Team technical proficiency requires tighter scope focus.')
    }

    let rating: OverallFeasibilityRating = 'FEASIBLE_INITIAL'
    let summary = ''
    let recommendedReleaseScope = ''

    if (criticalComplexityCount > 0 || totalWeeksNeeded > constraints.developmentWeeks * 1.5) {
      if (constraints.developmentWeeks < 6 && constraints.technicalExperience === 'beginner') {
        rating = 'NOT_FEASIBLE'
        summary = 'The proposed scope is not currently feasible within the tight deadline and beginner experience level. Significant scope reduction is mandatory.'
        recommendedReleaseScope = 'Limit scope strictly to Student Project Management and static Repository Discovery.'
      } else {
        rating = 'FEASIBLE_REDUCED_SCOPE'
        summary = 'The overall project vision is strong, but contains high-risk components (such as real-time voice or complex external integrations) that should be removed from the initial mini-project.'
        recommendedReleaseScope = 'Deliver the 5 Core Capabilities: Project Management, Team Collaboration, Repository Discovery, Similarity Intelligence, and Faculty Review. Defer Real-Time Voice and DOCX Generation to Phase 2.'
      }
    } else if (unnecessaryCount > 0 || totalWeeksNeeded > constraints.developmentWeeks) {
      rating = 'FEASIBLE_REDUCED_SCOPE'
      summary = 'Feasible with reduced scope. Excluding the unnecessary feature(s) will allow your team to build a polished, defense-ready prototype on schedule.'
      recommendedReleaseScope = 'Focus on the Essential and Recommended features. Exclude Real-Time Voice WebRTC and defer complex custom document templating.'
    } else {
      rating = 'FEASIBLE_INITIAL'
      summary = 'Highly feasible for initial mini-project release. Core features align tightly with student team capabilities and semester timeline.'
      recommendedReleaseScope = 'Implement the Essential capabilities first, followed by AI Similarity and Faculty Review workflows.'
    }

    return {
      rating,
      summary,
      primaryBottlenecks: bottlenecks,
      recommendedReleaseScope,
    }
  }
}

export const evaluationEngine = new EvaluationEngine()
