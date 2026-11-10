import { IConversationContext } from './context.types.js'
import { ProjectMatchResult } from '../../repository/repository.search.service.js'

export interface StructuredIdeaAnalysis {
  rawInput: string
  projectTitle: string
  projectDomain: string
  coreProblem: string
  targetUsers: string[]
  existingSituation: string
  proposedSolution: string
  mainFunctionality: string[]
  technicalApproach: string
  expectedOutcome: string
  possibleModules: string[]
  technicalComplexity: 'Low' | 'Medium' | 'High'
  complexityRationale: string
  potentialLimitations: string[]
  improvementAreas: string[]
  isIncompleteIdea: boolean
}

export type MentorFeatureClassification =
  | 'Essential'
  | 'Recommended'
  | 'Optional'
  | 'Risky'
  | 'Unnecessary'

export interface DynamicFeatureCritique {
  featureName: string
  classification: MentorFeatureClassification
  problemRelevance: string
  userBenefit: string
  contributionAndOriginality: string
  technicalFeasibility: string
  implementationComplexity: 'Low' | 'Medium' | 'High' | 'Very High'
  requiredSkillsAndResources: string[]
  estimatedDevelopmentTime: string
  dependencies: string[]
  maintenanceRequirements: string
  risks: string[]
  simplerAlternative?: string
  alreadyCoveredInMatchedProject?: string
  missingConstraintQuestion?: string
}

const KNOWN_TECH_WORDS = new Set([
  'react', 'typescript', 'javascript', 'node', 'nodejs', 'express', 'python',
  'flask', 'fastapi', 'django', 'mongodb', 'postgresql', 'mysql', 'sqlite',
  'redis', 'neo4j', 'docker', 'kubernetes', 'flutter', 'nextjs', 'next',
  'pytorch', 'tensorflow', 'scikit', 'sklearn', 'opencv', 'tailwind', 'aws',
  'firebase', 'graphql', 'webrtc', 'blockchain', 'solidity', 'iot', 'arduino',
  'raspberry', 'esp32', 'ai', 'ml', 'llm', 'nlp', 'rag',
])

const DOMAIN_PROFILES: Array<{
  keywords: string[]
  domain: string
  coreProblem: string
  targetUsers: string[]
  existingSituation: string
  mainFunctionality: string[]
  technicalApproach: string
  expectedOutcome: string
  possibleModules: string[]
  complexity: 'Low' | 'Medium' | 'High'
  complexityRationale: string
  potentialLimitations: string[]
  improvementAreas: string[]
}> = [
  {
    keywords: ['attendance', 'presence', 'roll call', 'check-in', 'checkin'],
    domain: 'Campus Administration & Smart Attendance',
    coreProblem:
      'Manual roll calls waste lecture time and allow proxy attendance, while hardware biometric scanners create queues and privacy concerns.',
    targetUsers: ['Students', 'Faculty Instructors', 'Department Attendance Coordinators'],
    existingSituation:
      'Instructors call names manually, circulate paper sheets, or rely on stationary biometric/RFID terminals.',
    mainFunctionality: [
      'Authenticated student check-in per class session',
      'Anti-proxy validation (expiring session tokens, geofence, or liveness checks)',
      'Faculty live roster override & attendance percentage alerts',
      'Exportable attendance registers per course and semester',
    ],
    technicalApproach:
      'Web/mobile check-in workflow with backend session validation, time-bound QR tokens or camera verification, and indexed session logs.',
    expectedOutcome:
      'Faster lecture startup (<1 minute check-in), verifiable audit logs, and automated low-attendance alerts (<75%).',
    possibleModules: [
      'Authentication & Role Roster',
      'Session Check-In Verification Engine',
      'Faculty Live Attendance & Exception Console',
      'Threshold Analytics & Alert Notifier',
    ],
    complexity: 'Medium',
    complexityRationale:
      'Time-bound QR/roster logic is straightforward, whereas live computer vision or BLE proximity adds hardware and lighting sensitivity.',
    potentialLimitations: [
      'Proxy check-ins via shared screenshots if QR codes do not rotate rapidly',
      'Classroom camera/lighting failures if relying solely on computer vision',
    ],
    improvementAreas: [
      'Rotating cryptographic QR tokens instead of fragile multi-face video feeds',
      'Offline-resilient check-in sync when classroom Wi-Fi fluctuates',
    ],
  },
  {
    keywords: ['healthcare', 'medical', 'disease', 'patient', 'clinical', 'hospital', 'diabetes', 'diagnosis'],
    domain: 'Healthcare Informatics',
    coreProblem:
      'Clinicians and primary clinics struggle with fragmented patient metrics and delayed early risk screening for chronic conditions.',
    targetUsers: ['Doctors & Nurses', 'Outpatient Clinics', 'Patients (via clinician portal)'],
    existingSituation:
      'Paper records or isolated lab spreadsheets delay triage and lack explainable risk prioritization.',
    mainFunctionality: [
      'Structured patient vital and lab parameter intake with validation',
      'ML risk classification with explainable feature weights',
      'Triage priority queue and downloadable referral summaries',
    ],
    technicalApproach:
      'Typed frontend clinical intake UI paired with a Python inference microservice (Scikit-learn) and anonymized longitudinal records.',
    expectedOutcome:
      'Transparent risk indicators with feature-importance explanations rather than opaque predictions.',
    possibleModules: [
      'Clinical Intake & Validation',
      'Prediction & Explainability Service',
      'Triage Queue & Patient History',
      'Anonymized Export & Audit Logging',
    ],
    complexity: 'High',
    complexityRationale:
      'Medical domains require strict dataset validation, false-negative error analysis, and privacy/anonymization discipline.',
    potentialLimitations: [
      'Public benchmark datasets may not reflect local hospital populations',
      'Clinical predictions are advisory only and cannot replace licensed medical diagnosis',
    ],
    improvementAreas: [
      'Calibration curves and false-negative sensitivity reporting in the UI',
      'Strict synthetic/anonymized data guardrails with clinician override notes',
    ],
  },
  {
    keywords: ['learning', 'course', 'quiz', 'lms', 'tutor', 'dropout', 'student performance', 'grade', 'marks'],
    domain: 'Educational Technology & Academic Analytics',
    coreProblem:
      'Generic learning portals treat every student identically and fail to spot struggling learners or prerequisite gaps early.',
    targetUsers: ['Undergraduate Students', 'Course Instructors', 'Academic Advisors'],
    existingSituation:
      'Static PDFs, scattered quiz forms, and end-semester grade sheets that flag failures too late for intervention.',
    mainFunctionality: [
      'Topic/prerequisite dependency mapping',
      'Adaptive assessments or continuous CIE risk flagging',
      'Actionable advisor alerts and targeted practice recommendations',
    ],
    technicalApproach:
      'Structured relational/graph prerequisite store + mastery scoring rules + instructor cohort analytics.',
    expectedOutcome:
      'Earlier academic intervention and measurable remediation paths for at-risk students.',
    possibleModules: [
      'Curriculum & Prerequisite Graph',
      'Assessment & Mastery Tracker',
      'Early-Warning Advisor Alerts',
      'Cohort Analytics Dashboard',
    ],
    complexity: 'Medium',
    complexityRationale:
      'Data modeling and rule-based prerequisite tracking are practical for a semester team; cold-start content authoring takes effort.',
    potentialLimitations: [
      'Small single-class datasets can overfit complex ML predictors',
      'Faculty need clear threshold explanations to trust risk alerts',
    ],
    improvementAreas: [
      'Interpretable risk drivers (missed labs, low quiz scores) alongside predictions',
      'Peer study or bridge module recommendations per weak prerequisite',
    ],
  },
  {
    keywords: ['waste', 'garbage', 'recycling', 'environment', 'sustainability', 'pollution', 'energy', 'solar', 'water', 'irrigation'],
    domain: 'Sustainability, Civic & Smart Resource Systems',
    coreProblem:
      'Inefficient resource monitoring, manual waste sorting, or uncalibrated scheduling causes preventable waste and delayed response.',
    targetUsers: ['Campus Facility Managers', 'Municipal / Building Operators', 'Residents / Students'],
    existingSituation:
      'Fixed schedules or manual inspection rounds without fill-level telemetry, fault tracking, or usage analytics.',
    mainFunctionality: [
      'Resource/bin status reporting or sensor telemetry ingestion',
      'Threshold alerts and optimized collection/routing schedules',
      'Transparency dashboard for usage and maintenance logs',
    ],
    technicalApproach:
      'REST ingestion API (or optional ESP32/MQTT simulation), time-series logging in MongoDB/PostgreSQL, and operational alert dashboard.',
    expectedOutcome:
      'Reduced operational wastage and verifiable response times for maintenance or collection.',
    possibleModules: [
      'Telemetry / Citizen Reporting Intake',
      'Threshold & Anomaly Alert Engine',
      'Route / Maintenance Scheduler',
      'Analytics & Historical Audit Log',
    ],
    complexity: 'Medium',
    complexityRationale:
      'Pure software/simulated telemetry fits one semester well; physical IoT sensors add hardware procurement and calibration risk.',
    potentialLimitations: [
      'Physical sensor hardware failures or network dead zones during live demos',
      'Requires realistic synthetic or benchmark telemetry if campus hardware is unavailable',
    ],
    improvementAreas: [
      'Support simulated sensor streams alongside real MQTT inputs for reliable viva testing',
      'Closed-loop verification showing before/after collection turnaround times',
    ],
  },
  {
    keywords: ['hostel', 'hostl', 'complaint', 'grievance', 'warden', 'maintenance ticket'],
    domain: 'Hostel & Campus Maintenance Grievance Management',
    coreProblem:
      'Students lack a transparent complaint workflow, causing lost paper slips, unverified resolution status, and slow hostel maintenance turnaround.',
    targetUsers: ['Hostel Residents / Students', 'Hostel Wardens', 'Facility Maintenance Staff'],
    existingSituation:
      'Physical logbooks, informal WhatsApp chats, or verbal complaints with no status timeline or photo proof.',
    mainFunctionality: [
      'Authenticated complaint submission with room/block tags and compressed photo upload',
      'Status lifecycle workflow (Submitted -> Assigned -> In Progress -> Verified Resolved)',
      'Warden triage dashboard with category SLA filters and overdue escalation flags',
      'Student confirmation before closing resolved maintenance tickets',
    ],
    technicalApproach:
      'Role-based Express/Node.js REST API, MongoDB ticket schema with status audit trail, and size-validated image attachment upload.',
    expectedOutcome:
      'Trackable maintenance accountability, faster warden triage, and verifiable repair completion history.',
    possibleModules: [
      'Student Authentication & Room Registry',
      'Complaint Intake & Photo Evidence Module',
      'Warden Triage & Assignment Dashboard',
      'SLA Tracking & Resolution Verification',
    ],
    complexity: 'Low',
    complexityRationale:
      'Focused CRUD + state transitions + role permissions is well-suited for beginner/intermediate teams within 4–8 weeks.',
    potentialLimitations: [
      'Large uncompressed phone photos can bloat storage without client/server size limits',
      'Notification delays if technicians do not update ticket status promptly',
    ],
    improvementAreas: [
      'Enforce server-side MIME/size validation plus student closure confirmation',
      'Add SLA breach analytics and recurring block-level issue heatmaps for wardens',
    ],
  },
  {
    keywords: ['parking', 'parked', 'vehicle slot'],
    domain: 'Smart Campus Parking & Vehicle Slot Management',
    coreProblem:
      'Unorganized gate entry and unknown zone availability create peak-hour congestion, unauthorized parking, and wasted search time on campus.',
    targetUsers: ['Commuting Students & Faculty', 'Campus Security Guards', 'Campus Transport Office'],
    existingSituation:
      'Manual paper stickers and physical gate checks without real-time bay occupancy tracking.',
    mainFunctionality: [
      'Real-time zone/slot occupancy registry for two-wheelers and four-wheelers',
      'Permit pass verification via student/staff QR pass at entry/exit',
      'Live gate occupancy dashboard and peak-hour usage reporting',
    ],
    technicalApproach:
      'REST API with atomic slot allocation counters, QR pass check-in/check-out logging, and role-based guard console.',
    expectedOutcome:
      'Faster gate clearance, clear remaining slot visibility before entering lots, and zero duplicate slot assignments.',
    possibleModules: [
      'Campus Vehicle Permit Registry',
      'Zone Occupancy & Atomic Slot Counter',
      'Security Gate QR Scan Console',
      'Utilization Analytics & Peak Alerts',
    ],
    complexity: 'Medium',
    complexityRationale:
      'Software slot ledger and QR check-in/out are reliable in 8 weeks; hardware boom-barriers or ALPR cameras raise hardware risk.',
    potentialLimitations: [
      'Occupancy accuracy depends on consistent exit logging at campus gates',
      'Camera ANPR models struggle under glare, rain, or dusty number plates',
    ],
    improvementAreas: [
      'Compare software QR gate check-in against simulated/low-cost IoT ultrasonic bay occupancy',
      'Include atomic capacity locks and reserve overflow zone policies',
    ],
  },
  {
    keywords: ['project management', 'workflow tracking', 'task allocation', 'progress prediction', 'capstone tracker'],
    domain: 'Academic Project Management & Knowledge Workflow',
    coreProblem:
      'Academic teams and faculty struggle with scattered milestone tracking, uneven workload distribution, late risk visibility, and lost cohort knowledge between batches.',
    targetUsers: ['Student Project Teams', 'Faculty Guides & Evaluators', 'Department Coordinators'],
    existingSituation:
      'Static spreadsheets, email submissions, and basic milestone checklists without intelligent workload balancing or early delay risk detection.',
    mainFunctionality: [
      'Student team registration, project scope logging, and role-based permissions',
      'Task allocation and milestone submission workflow with guide sign-off',
      'Progress tracking analytics, overdue milestone risk flags, and searchable repository records',
    ],
    technicalApproach:
      'Modular TypeScript/Node.js REST API, MongoDB schema for teams/tasks/milestones, plus rule-weighted or historical velocity scoring modules.',
    expectedOutcome:
      'Transparent task ownership, earlier visibility into stalled milestones, and preserved institutional knowledge across batches.',
    possibleModules: [
      'Team & Project Registry',
      'Task Allocation & Workload Balancer',
      'Milestone Progress & Risk Tracker',
      'Faculty Review & Historical Archive',
    ],
    complexity: 'Medium',
    complexityRationale:
      'Core workflow and heuristic scheduling/risk rules are reliably buildable in 8–10 weeks; pure supervised ML predictors require multi-semester historical task datasets.',
    potentialLimitations: [
      'Cold-start lack of labeled multi-year student sprint logs for ML prediction models',
      'Automated assignments still require manual student lead/faculty override for edge cases',
    ],
    improvementAreas: [
      'Start with skill/load weighted task allocation rules before training any supervised ML ranker',
      'Compute explainable delay risk indices from missed checkpoints instead of opaque black-box predictions',
    ],
  },
  {
    keywords: ['event', 'auditorium', 'hall', 'booking', 'schedule', 'timetable', 'queue', 'library'],
    domain: 'Campus Operations & Resource Scheduling',
    coreProblem:
      'Manual paper requests or spreadsheets cause double bookings, opaque wait queues, and slow multi-level administrative approvals.',
    targetUsers: ['Students & Club Coordinators', 'Faculty Advisors', 'Facility / Estate Administrators'],
    existingSituation:
      'Paper forms, email chains, and manual registers with no real-time conflict detection.',
    mainFunctionality: [
      'Real-time availability calendar and atomic conflict prevention',
      'Stage-gated administrative approval workflow',
      'QR passes or queue notifications for participants',
    ],
    technicalApproach:
      'Transactional interval-overlap checks, RBAC approval state machine, and audit logs.',
    expectedOutcome:
      'Zero double-bookings, transparent approval timelines, and searchable usage history.',
    possibleModules: [
      'Resource Catalog & Availability Rules',
      'Conflict-Free Reservation & Locking Engine',
      'Multi-Role Approval Workflow',
      'Notifications & Usage Reports',
    ],
    complexity: 'Medium',
    complexityRationale:
      'Interval overlap checks and state machines are high-rigor and reliably achievable within an 8–12 week semester.',
    potentialLimitations: [
      'Handling last-minute emergency cancellations or priority overrides cleanly',
    ],
    improvementAreas: [
      'Atomic conflict locking with automated waitlist promotion on cancellation',
    ],
  },
  {
    keywords: ['ecommerce', 'e-commerce', 'shopping', 'cart', 'inventory', 'store', 'marketplace', 'order', 'payment'],
    domain: 'E-Commerce & High-Concurrency Inventory Systems',
    coreProblem:
      'Concurrent checkout traffic without atomic locking causes overselling, negative inventory counts, and inconsistent order states.',
    targetUsers: ['Customers / Students', 'Sellers / Campus Store Managers', 'System Administrators'],
    existingSituation:
      'Naive read-then-write stock updates that fail under concurrent requests.',
    mainFunctionality: [
      'Product catalog, cart reservation with TTL, and atomic stock updates',
      'Idempotent checkout / simulated payment confirmation',
      'Order history and seller inventory alerts',
    ],
    technicalApproach:
      'Optimistic concurrency versioning or Redis/atomic database transactions + k6/autocannon load tests.',
    expectedOutcome:
      'Zero negative stock under simulated concurrency benchmarks.',
    possibleModules: [
      'Catalog & Search',
      'Atomic Cart & TTL Lock Manager',
      'Order State Machine & Idempotency',
      'Seller Inventory & Concurrency Benchmark Suite',
    ],
    complexity: 'Medium',
    complexityRationale:
      'A plain CRUD shop lacks depth; adding and benchmarking real concurrency locks provides strong engineering rigor.',
    potentialLimitations: [
      'Real payment gateways should be sandboxed/simulated for academic projects to avoid compliance liability',
    ],
    improvementAreas: [
      'Automated concurrency stress tests proving zero oversell under parallel requests',
    ],
  },
]

export class IdeaAnalyzer {
  /**
   * Detects when a student provides ONLY technology names rather than an application concept
   */
  isTechnologyOnlyInput(input: string): { isTechOnly: boolean; detectedTechs: string[] } {
    const cleaned = input
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 0)

    if (cleaned.length === 0 || cleaned.length > 8) {
      return { isTechOnly: false, detectedTechs: [] }
    }

    const filler = new Set([
      'using', 'with', 'and', 'or', 'stack', 'tech', 'technology', 'technologies',
      'project', 'idea', 'based', 'in', 'on', 'build', 'want', 'to', 'use', 'my', 'is',
    ])

    const meaningful = cleaned.filter((w) => !filler.has(w))
    if (meaningful.length === 0) {
      return { isTechOnly: false, detectedTechs: [] }
    }

    const techMatches = meaningful.filter((w) => KNOWN_TECH_WORDS.has(w))
    const allMeaningfulAreTech = techMatches.length === meaningful.length && techMatches.length >= 1

    return {
      isTechOnly: allMeaningfulAreTech,
      detectedTechs: techMatches.map((t) => t.charAt(0).toUpperCase() + t.slice(1)),
    }
  }

  /**
   * Extracts a clean title phrase from messy or partial student input
   */
  extractCleanTitle(rawInput: string): string {
    let title = rawInput.trim()
    title = title.replace(/^(?:hi|hello|hey|actually|okay|so|well)[,\s]+/i, '')
    title = title.replace(/^(?:instead of|rather than|forget about|switch(?:ing)? from)\s+[^,.!?]+[,.]?\s*/i, '')
    title = title.replace(
      /^(?:i(?:'m| am)\s+new to (?:coding|programming)(?:\s+and)?\s+|we(?:'re| are)\s+(?:a team of \d+\s+(?:students?\s+)?)?(?:with \d+\s+weeks?\s+)?)?/i,
      ''
    )
    title = title.replace(
      /^(?:switch to|let(?:'s| us)\s+(?:switch to|build|create|develop)|let me (?:build|create|develop|make)|i have (?:an?\s+)?(?:project\s+|mini-project\s+)?idea(?:\s+(?:for|about))?|i want to (?:develop|build|create|make|improve)|(?:and\s+)?want to (?:develop|build|create|make)|we are (?:a team of \d+ )?(?:with \d+\s+weeks?\s+)?(?:developing|building|creating|planning(?: a| an| to build)?)|my (?:project )?idea is|our (?:project )?idea is|planning (?:to build|a|an)|working on|what about building|can i build|new (?:project )?idea:?)\s+(?:an?|the)?\s*/i,
      ''
    )
    title = title.replace(/^(?:for|about)\s+/i, '').trim()
    // Strip trailing conversational questions from title (e.g. ", is this too hard for me?" / ", how to start?")
    title = title
      .replace(/[,?.!]+\s*(?:is this too hard.*|is it feasible.*|how (?:do i |to )?start.*|what (?:previous|gaps|features).*)$/i, '')
      .trim()
    const firstSentence = title.split(/[.!?\n]/)[0].trim()
    if (firstSentence.length >= 4 && firstSentence.length <= 100) {
      return firstSentence.charAt(0).toUpperCase() + firstSentence.slice(1)
    }
    return title.slice(0, 90).trim() || rawInput.trim()
  }

  /**
   * Extracts base idea title, explicit proposed improvements/features, and mentioned technologies
   * from natural student sentences (e.g., "Academic Project Management System with AI-based task allocation and progress prediction").
   */
  extractProposedImprovements(rawInput: string): {
    baseIdea: string
    improvements: string[]
    technologies: string[]
  } {
    const cleaned = rawInput.trim().replace(/[.!?]+$/, '')
    const technologies: string[] = []
    for (const token of cleaned.toLowerCase().split(/[^a-z0-9.+]+/)) {
      if (token !== 'ai' && token !== 'ml' && KNOWN_TECH_WORDS.has(token)) {
        const pretty = token.charAt(0).toUpperCase() + token.slice(1)
        if (!technologies.includes(pretty)) technologies.push(pretty)
      }
    }

    const withMatch = cleaned.match(
      /^(.*?)\b(?:with|adding|featuring|including|plus|having|extending it with)\s+(.+)$/i
    )
    if (!withMatch) {
      return {
        baseIdea: this.extractCleanTitle(rawInput),
        improvements: [],
        technologies,
      }
    }

    const rawBase = withMatch[1].trim()
    let featureClause = withMatch[2]
      .replace(/\b(?:using|built in|in react|in python|for \d+ weeks|within \d+ weeks)\b.*$/i, '')
      .trim()

    const parts = featureClause
      .split(/\s*(?:,|\band\b|&|\+)\s*/i)
      .map((p) => p.replace(/^(?:a|an|the)\s+/i, '').trim())
      .filter((p) => p.length >= 4 && !/^(?:more|etc|features?)$/i.test(p))

    const improvements = Array.from(
      new Set(parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)))
    )

    return {
      baseIdea: this.extractCleanTitle(rawBase || rawInput),
      improvements,
      technologies,
    }
  }

  /**
   * Produces a 12-dimension academic analysis from complete, rough, or short-title inputs
   */
  analyzeIdea(
    rawInput: string,
    context: IConversationContext
  ): StructuredIdeaAnalysis {
    const lower = rawInput.toLowerCase()
    const projectTitle = this.extractCleanTitle(rawInput)
    const matchedProfile = DOMAIN_PROFILES.find((prof) =>
      prof.keywords.some((kw) => lower.includes(kw))
    )

    const mentionedStack = context.preferredTechnologies.length > 0
      ? context.preferredTechnologies
      : []

    const wordCount = rawInput.trim().split(/\s+/).length
    const isIncompleteIdea = wordCount <= 12 || !lower.includes('because') && !lower.includes('problem')

    if (matchedProfile) {
      const stackText =
        mentionedStack.length > 0
          ? `${matchedProfile.technicalApproach} Tailored around your stated stack (${mentionedStack.join(', ')}).`
          : matchedProfile.technicalApproach

      return {
        rawInput,
        projectTitle,
        projectDomain: matchedProfile.domain,
        coreProblem: matchedProfile.coreProblem,
        targetUsers: matchedProfile.targetUsers,
        existingSituation: matchedProfile.existingSituation,
        proposedSolution: `A focused "${projectTitle}" application solving ${matchedProfile.coreProblem.charAt(0).toLowerCase()}${matchedProfile.coreProblem.slice(1)}`,
        mainFunctionality: matchedProfile.mainFunctionality,
        technicalApproach: stackText,
        expectedOutcome: matchedProfile.expectedOutcome,
        possibleModules: matchedProfile.possibleModules,
        technicalComplexity: matchedProfile.complexity,
        complexityRationale: matchedProfile.complexityRationale,
        potentialLimitations: matchedProfile.potentialLimitations,
        improvementAreas: matchedProfile.improvementAreas,
        isIncompleteIdea,
      }
    }

    // Generic, adaptable analysis for novel or uncommon domains without empty buzzwords
    const stackText =
      mentionedStack.length > 0
        ? `Modular frontend-backend web architecture using ${mentionedStack.join(', ')} with structured validation and role-based access control.`
        : 'Modular client-server web architecture (React/TypeScript frontend, REST API backend, indexed database with schema validation).'

    return {
      rawInput,
      projectTitle,
      projectDomain: context.projectCategory || 'Applied Software Engineering & Information Systems',
      coreProblem: `Manual coordination, fragmented records, or lack of automated verification around "${projectTitle}".`,
      targetUsers: ['Primary End Users / Beneficiaries', 'Operational Staff / Reviewers', 'System Administrators'],
      existingSituation: 'Currently handled through manual workflows, spreadsheets, or disconnected general-purpose messaging tools.',
      proposedSolution: `A dedicated software system for "${projectTitle}" with structured workflows, persistent records, and domain validation.`,
      mainFunctionality: [
        'Role-based user onboarding and access permissions',
        `Core "${projectTitle}" workflow creation, state tracking, and search`,
        'Audit history, reporting, and exception handling',
      ],
      technicalApproach: stackText,
      expectedOutcome: 'Measurable reduction in manual coordination errors, faster turnaround, and verifiable audit trails.',
      possibleModules: [
        'Authentication & Role Governance',
        `Core "${projectTitle}" Workflow Engine`,
        'Search, Filtering & Reporting',
        'Admin Oversight & Audit Logging',
      ],
      technicalComplexity: 'Medium',
      complexityRationale:
        'Achievable in a single academic semester when scoped to 1 core workflow rather than broad secondary add-ons.',
      potentialLimitations: [
        'Cold-start data availability if realistic test records are not seeded',
        'Scope creep if secondary analytics or AI add-ons are added before core workflows work',
      ],
      improvementAreas: [
        'Include reproducible performance/accuracy benchmarks in final evaluation',
        'Define clear non-functional constraints (latency, privacy masking, validation)',
      ],
      isIncompleteIdea,
    }
  }

  /**
   * 9-criterion honest evaluation of ANY proposed feature in conversation, cross-checking repository overlap & constraints
   */
  evaluateFeatureInConversation(
    featureQuery: string,
    context: IConversationContext,
    matchedProject?: ProjectMatchResult | null
  ): DynamicFeatureCritique {
    const lower = featureQuery.toLowerCase()
    const teamSize = context.teamSize
    const exp = context.technicalExperience
    const weeks = context.developmentWeeks

    // Determine whether the active repository match already implements this feature
    let alreadyCoveredInMatchedProject: string | undefined
    if (matchedProject) {
      const genericFeatureWords = new Set([
        'want', 'also', 'with', 'add', 'include', 'system', 'feature', 'using',
        'project', 'based', 'automatic', 'management', 'student', 'smart', 'module',
      ])
      const featureTerms = lower
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 3 && !genericFeatureWords.has(w))

      // Predictive/AI features require matching AI/predictive evidence in prior record, not static checklists
      const proposesAiOrPredictive = /\b(ai|ml|predict|prediction|allocation|recommender|offline|rotating)\b/i.test(lower)
      const hitFeature = matchedProject.project.features.find((docFeat) => {
        const docLower = docFeat.toLowerCase()
        if (proposesAiOrPredictive && !/\b(ai|ml|predict|allocation|offline|rotating|liveness|facenet|recommender)\b/i.test(docLower)) {
          return false
        }
        const matchCount = featureTerms.filter((term) => docLower.includes(term)).length
        return matchCount >= 2 || (featureTerms.length === 1 && matchCount === 1)
      })
      const abstractText = `${matchedProject.project.title} ${matchedProject.project.abstract}`.toLowerCase()
      const hitAbstract =
        !proposesAiOrPredictive &&
        featureTerms.filter((term) => abstractText.includes(term)).length >= 2

      if (hitFeature) {
        alreadyCoveredInMatchedProject = `The matched project "${matchedProject.project.title}" (${matchedProject.project.academicYear}) already documents this capability: "${hitFeature}".`
      } else if (hitAbstract) {
        alreadyCoveredInMatchedProject = `The matched project "${matchedProject.project.title}" (${matchedProject.project.academicYear}) already covers closely related functionality in its documented abstract.`
      }
    }

    // Identify the most important missing constraint if not explicitly given
    let missingConstraintQuestion: string | undefined
    const provided = new Set(context.explicitlyProvidedConstraints || [])
    if (!context.teamSize && !provided.has('teamSize')) {
      missingConstraintQuestion = 'Before locking this feature in, how many members are in your team and how many weeks do you have left?'
    } else if (!context.developmentWeeks && !provided.has('developmentWeeks')) {
      missingConstraintQuestion = 'How many development weeks remain before your final project submission?'
    } else if (!provided.has('experience')) {
      missingConstraintQuestion = 'How comfortable is your team with the core stack right now (beginner, intermediate, or experienced)?'
    }

    const tightDeadline = typeof weeks === 'number' && weeks <= 6
    const soloOrSmall = typeof teamSize === 'number' && teamSize <= 2

    // Pattern 1: Unnecessary / misaligned AI chatbot add-on
    if (lower.includes('chatbot') || (lower.includes('ai chat') && !context.currentProjectIdea?.toLowerCase().includes('mentor'))) {
      return {
        featureName: 'AI Chatbot Assistant',
        classification: 'Unnecessary',
        problemRelevance:
          'Adding a conversational chatbot does not solve the core operational problem of your primary system (users usually need a 2-click form or filter, not a chat prompt).',
        userBenefit:
          'Marginal for day-to-day workflows; most users abandon chatbots when direct buttons or searchable tables are faster.',
        contributionAndOriginality:
          'Evaluators often view bolt-on chatbots as superficial "AI wrapper" complexity unless natural language reasoning is central to the problem.',
        technicalFeasibility:
          'Requires external LLM API keys, prompt-injection safeguards, latency handling, and fallback UX.',
        implementationComplexity: 'High',
        requiredSkillsAndResources: ['LLM API integration or local inference', 'Prompt guardrails', 'API budget/rate limiting'],
        estimatedDevelopmentTime: '2–3 weeks (plus ongoing prompt tuning)',
        dependencies: ['External LLM provider or local GPU', 'Core domain data APIs'],
        maintenanceRequirements: 'Continuous prompt/model updates and API quota monitoring.',
        risks: [
          'Hallucinated answers misdirecting users on institutional policies or records',
          'Examiner challenge: "Why did this screen need an LLM instead of a normal search/help FAQ?"',
        ],
        simplerAlternative:
          'Use structured search filters, contextual tooltips, or a deterministic FAQ drawer — reserving AI strictly for tasks that require genuine reasoning.',
        alreadyCoveredInMatchedProject,
        missingConstraintQuestion,
      }
    }

    // Pattern 1b: AI-based Task Allocation (Rule/Skill Heuristic Recommended vs Heavy ML Cold-Start)
    if (lower.includes('task allocation') || lower.includes('task assignment') || lower.includes('workload distribution')) {
      return {
        featureName: this.extractCleanTitle(featureQuery),
        classification: 'Recommended',
        problemRelevance:
          'Addresses uneven team participation and guesswork when assigning tasks manually across a 2–4 student capstone group.',
        userBenefit:
          'Balances workload across team members and speeds up initial sprint planning based on declared skills and open tasks.',
        contributionAndOriginality: alreadyCoveredInMatchedProject
          ? 'Enhances static manual task lists by adding algorithmic skill/workload scoring.'
          : 'Meaningful functional addition when paired with a deterministic scoring heuristic and evaluation benchmark.',
        technicalFeasibility:
          exp === 'beginner' || tightDeadline
            ? 'Build first as a deterministic skill-tag + open-task-count heuristic (~1–2 weeks); avoid training custom neural models without historical logs.'
            : 'Feasible as a weighted skill-match + capacity-balance scoring algorithm with manual team-lead/faculty override.',
        implementationComplexity: 'Medium',
        requiredSkillsAndResources: [
          'Backend scoring service (Node.js/TypeScript or Python)',
          'Student skill profiles + task difficulty/effort weights in MongoDB',
          'Historical or seeded sample project tasks for evaluation',
        ],
        estimatedDevelopmentTime: '1.5–2.5 weeks',
        dependencies: ['Core Team & Task Registry', 'Member skill tags and task status schema'],
        maintenanceRequirements: 'Periodic weight calibration and audit log for manual reassignments.',
        risks: [
          'Cold-start problem: historical task completion logs rarely exist at project start to train supervised ML',
          'Blind auto-assignment can frustrate teammates if manual override is missing',
        ],
        simplerAlternative:
          'Rule-weighted bipartite matcher (skill match % minus active task count) with 1-click accept/reassign before attempting ML.',
        alreadyCoveredInMatchedProject,
        missingConstraintQuestion,
      }
    }

    // Pattern 1c: Automatic Project Progress / Delay Prediction
    if (lower.includes('progress prediction') || lower.includes('predict progress') || lower.includes('delay prediction')) {
      return {
        featureName: this.extractCleanTitle(featureQuery),
        classification: tightDeadline ? 'Optional' : 'Recommended',
        problemRelevance:
          'Surfaces behind-schedule risks earlier than end-semester review meetings when milestone tasks stall.',
        userBenefit:
          'Gives students and faculty guides an early warning flag showing which deliverables threaten the deadline.',
        contributionAndOriginality: alreadyCoveredInMatchedProject
          ? 'Upgrades passive percentage counters into predictive schedule-risk alerts.'
          : 'Strong technical enhancement if grounded in explainable milestone velocity metrics rather than unverified percentages.',
        technicalFeasibility:
          'Feasible using weighted milestone completion rate + deadline slip heuristic/regression; deep learning prediction is impractical without multi-year logged project histories.',
        implementationComplexity: 'Medium',
        requiredSkillsAndResources: [
          'Time-stamped task & milestone completion history',
          'Schedule-burnout / weighted velocity formula (or scikit-learn linear/logistic risk model on synthetic/benchmark logs)',
        ],
        estimatedDevelopmentTime: '1.5–3 weeks',
        dependencies: ['Milestone deadlines & weekly task status timestamps'],
        maintenanceRequirements: 'Keep risk threshold weights transparent so faculty guides understand why a team is flagged at risk.',
        risks: [
          'Forecasting accuracy degrades if students bulk-update task statuses right before reviews',
          'Missing multi-batch ground-truth training data makes black-box ML claims hard to defend in viva',
        ],
        simplerAlternative:
          'Explainable rule-based velocity & deadline-slip risk indicator (On Track / At Risk / Delayed) computed from planned vs. completed milestone ratios.',
        alreadyCoveredInMatchedProject,
        missingConstraintQuestion,
      }
    }

    // Pattern 2: Facial recognition / biometric attendance
    if (
      lower.includes('facial recognition') ||
      lower.includes('face recognition') ||
      lower.includes('biometric') ||
      (lower.includes('face') && lower.includes('attendance'))
    ) {
      return {
        featureName: 'Facial Recognition & Automatic Attendance',
        classification: tightDeadline || soloOrSmall ? 'Unnecessary' : 'Optional',
        problemRelevance:
          'Directly targets automated classroom check-in, though biometric processing introduces heavy privacy and hardware fragility compared to cryptographic check-ins.',
        userBenefit:
          'Reduces manual roll-call time when lighting and camera angles cooperate, but creates false-rejection friction otherwise.',
        contributionAndOriginality: alreadyCoveredInMatchedProject
          ? 'Low originality unless you introduce a verified technical improvement over the existing cohort.'
          : 'Moderate — widely attempted in engineering capstones; needs anti-spoofing and quantitative evaluation to stand out.',
        technicalFeasibility:
          tightDeadline || exp === 'beginner'
            ? 'Risky for your current constraints due to OpenCV/FaceNet calibration, EAR liveness checks, and camera lighting sensitivity.'
            : 'Feasible with dedicated ML effort, provided you have controlled camera hardware and consented test data.',
        implementationComplexity: 'Very High',
        requiredSkillsAndResources: ['Python, OpenCV / FaceNet / dlib', 'Dedicated camera/webcam hardware', 'Consented test dataset'],
        estimatedDevelopmentTime: '4–6 weeks including lighting calibration & anti-spoofing',
        dependencies: ['Student face-embedding enrollment database', 'Consistent classroom camera feed'],
        maintenanceRequirements: 'Re-enrollment workflows, lighting threshold tuning, and strict biometric PII governance.',
        risks: [
          'Live viva failure under poor projector/classroom lighting',
          'Biometric privacy compliance if student facial embeddings are stored without consent',
        ],
        simplerAlternative:
          'Rotating time-bound QR code check-in (15-second token expiry + faculty live roster verification), buildable in ~1 week with zero biometric risk.',
        alreadyCoveredInMatchedProject,
        missingConstraintQuestion,
      }
    }

    // Pattern 3: Real-time WebRTC voice/video
    if (lower.includes('webrtc') || lower.includes('video call') || lower.includes('real-time voice')) {
      return {
        featureName: 'Real-Time WebRTC Voice / Video Streaming',
        classification: tightDeadline || exp === 'beginner' ? 'Risky' : 'Unnecessary',
        problemRelevance: 'Rarely essential for core academic record tracking, discovery, or structured workflows.',
        userBenefit: 'Convenience only; asynchronous messaging or external meeting links cover rare live discussions.',
        contributionAndOriginality: 'Adds networking boilerplate rather than domain innovation.',
        technicalFeasibility: 'Low cost-benefit for a semester team without dedicated STUN/TURN infrastructure.',
        implementationComplexity: 'Very High',
        requiredSkillsAndResources: ['WebRTC signaling server', 'STUN/TURN relay infrastructure', 'Cross-browser NAT traversal testing'],
        estimatedDevelopmentTime: '4–6 weeks',
        dependencies: ['WebSockets signaling', 'Media permissions across networks'],
        maintenanceRequirements: 'Relay server upkeep and frequent browser WebRTC compatibility fixes.',
        risks: ['College campus NAT/firewall blocking peer connections during live demo'],
        simplerAlternative: 'Asynchronous in-app chat messaging plus optional external meeting link field.',
        alreadyCoveredInMatchedProject,
        missingConstraintQuestion,
      }
    }

    // Pattern 4: Blockchain / Smart Contracts
    if (lower.includes('blockchain') || lower.includes('smart contract') || lower.includes('web3')) {
      return {
        featureName: 'Blockchain / Smart Contract Ledger',
        classification: tightDeadline || exp === 'beginner' ? 'Risky' : 'Unnecessary',
        problemRelevance:
          'Institutional workflows have clear central trust authorities (college faculty/admin); decentralized consensus adds latency without solving a trustless problem.',
        userBenefit: 'Slows down user actions with wallet popups/gas confirmation delays.',
        contributionAndOriginality: 'Often flagged by examiners as unnecessary hype unless multi-institution trustless verification is genuinely required.',
        technicalFeasibility: 'High setup overhead for Solidity, testnets, and wallet key recovery.',
        implementationComplexity: 'High',
        requiredSkillsAndResources: ['Solidity / Hardhat', 'Testnet RPC & gas management'],
        estimatedDevelopmentTime: '3–5 weeks',
        dependencies: ['Wallet integration', 'Immutable schema design'],
        maintenanceRequirements: 'Contract immutability makes bug fixes slow and costly.',
        risks: ['Testnet faucet failures or RPC timeouts during live faculty demonstration'],
        simplerAlternative: 'Append-only MongoDB audit logs with cryptographic SHA-256 verification hashes and RBAC.',
        alreadyCoveredInMatchedProject,
        missingConstraintQuestion,
      }
    }

    // Pattern 5: Unrealistic sweeping claims ("build everything / global scale / full AI operating system")
    if (
      lower.includes('autonomous everything') ||
      lower.includes('operating system') ||
      lower.includes('replace all') ||
      (tightDeadline && (lower.includes('multi-cloud') || lower.includes('microservices') || lower.includes('federated')))
    ) {
      return {
        featureName: this.extractCleanTitle(featureQuery),
        classification: 'Unnecessary',
        problemRelevance: 'Severely misaligned with realistic single-semester academic scope.',
        userBenefit: 'Over-scoped architecture delays working user-facing features.',
        contributionAndOriginality: 'Superficial breadth usually scores lower in academic evaluations than a reliable vertical slice.',
        technicalFeasibility: 'Unrealistic within your available semester timeframe and team capacity.',
        implementationComplexity: 'Very High',
        requiredSkillsAndResources: ['Distributed systems / systems programming expertise', 'Extended multi-semester timeline'],
        estimatedDevelopmentTime: '12+ weeks beyond typical mini-project schedules',
        dependencies: ['Heavy infrastructure automation'],
        maintenanceRequirements: 'High operational complexity across distributed components.',
        risks: ['Incomplete, non-working prototype at semester evaluation'],
        simplerAlternative: 'Build a focused modular monolith solving one measurable problem cleanly first.',
        alreadyCoveredInMatchedProject,
        missingConstraintQuestion,
      }
    }

    // General adaptive feature evaluation (e.g. notifications, analytics dashboard, QR check-in, export, GPS)
    const isRecommendedCore =
      lower.includes('qr') ||
      lower.includes('notification') ||
      lower.includes('alert') ||
      lower.includes('export') ||
      lower.includes('pdf') ||
      lower.includes('search') ||
      lower.includes('dashboard') ||
      lower.includes('analytics') ||
      lower.includes('rbac') ||
      lower.includes('authentication')

    const cleanName = this.extractCleanTitle(featureQuery)
    return {
      featureName: cleanName,
      classification: isRecommendedCore ? 'Recommended' : 'Optional',
      problemRelevance: isRecommendedCore
        ? `Directly strengthens visibility, usability, or accountability for "${context.currentProjectIdea || 'your core project'}".`
        : `Supports secondary convenience in "${context.currentProjectIdea || 'your project'}", but verify that core workflows work end-to-end first.`,
      userBenefit: 'Improves day-to-day clarity for primary users once core CRUD/domain logic is reliable.',
      contributionAndOriginality: alreadyCoveredInMatchedProject
        ? 'Overlaps with prior work unless customized with measurable improvements.'
        : 'Practical supporting capability; differentiation will come from how reliably it integrates with your primary workflow.',
      technicalFeasibility:
        tightDeadline && !isRecommendedCore
          ? `Can slip your ${weeks}-week schedule if built before core deliverables.`
          : `Realistic for a ${teamSize || 2}-to-4 person ${exp} team using standard web APIs.`,
      implementationComplexity: isRecommendedCore ? 'Low' : 'Medium',
      requiredSkillsAndResources: ['Frontend React components', 'Backend REST endpoint & MongoDB schema field'],
      estimatedDevelopmentTime: isRecommendedCore ? '3–5 days' : '1–2 weeks',
      dependencies: ['Core domain data model and authenticated user roles'],
      maintenanceRequirements: 'Minimal ongoing maintenance once unit and integration tests cover edge cases.',
      risks: [
        'Polishing secondary dashboards or widgets before completing core validation logic',
      ],
      simplerAlternative: isRecommendedCore
        ? undefined
        : 'Defer to Milestone 3 (or implement a lightweight CSV/summary view first) until core functionality passes tests.',
      alreadyCoveredInMatchedProject,
      missingConstraintQuestion,
    }
  }
}

export const ideaAnalyzer = new IdeaAnalyzer()
