import { ProjectRepository, IProject } from './project.model.js'

export type SimilarityClassification =
  | 'EXACT_OR_NEAR_EXACT_TITLE'
  | 'SIMILAR_PROJECT_CONCEPT'
  | 'SIMILAR_FEATURE_SET'
  | 'RELATED_TECHNOLOGY_ONLY'
  | 'INDEPENDENT_WORK'

export type AcademicSimilarityLabel =
  | 'Exact or near duplicate'
  | 'Highly related project'
  | 'Partially related project'
  | 'Conceptually related project'
  | 'No sufficiently similar project found'

export interface ProjectMatchResult {
  project: IProject
  score: number // 0.0 to 1.0 (internal ranking signal; never presented as plagiarism/originality score in prose)
  classification: SimilarityClassification
  academicClassification: AcademicSimilarityLabel
  classificationReason: string
  matchedDimensions: {
    titleSimilarity: number
    conceptSimilarity: number
    matchingFeatures: string[]
    matchingTechnologies: string[]
  }
  dimensionComparison: {
    problemAddressed: string
    targetUsers: string
    proposedSolution: string
    functionalFeatures: string
    technicalImplementation: string
    expectedOutcomes: string
  }
  academicCritique: string
  sourceAttribution: {
    sourceType: string
    verificationStatus: string
    confirmedFromDocumentation: boolean
    missingDetails: string[]
  }
  analysis: {
    problemAddressed: string
    documentedSolution: string
    documentedFeatures: string[]
    technologiesUsed: string[]
    similaritiesWithIdea: string[]
    differencesWithIdea: string[]
    missingOrUnknownInformation: string[]
    improvementOpportunities: string[]
  }
}

export interface SearchFilters {
  query?: string
  department?: string
  academicYear?: string
  technology?: string
  category?: string
  sourceType?: string
  verificationStatus?: string
  collegeId?: string
  page?: number
  limit?: number
  naturalLanguage?: boolean
}

export interface PaginatedProjectsResult {
  projects: IProject[]
  totalCount: number
  currentPage: number
  totalPages: number
  hasMore: boolean
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'your', 'our',
  'are', 'using', 'based', 'system', 'platform', 'application', 'app', 'tool',
  'portal', 'web', 'mobile', 'software', 'smart', 'intelligent', 'automated',
  'management', 'tracking', 'want', 'build', 'create', 'develop', 'developing',
  'project', 'idea', 'students', 'student', 'college', 'academic', 'solution',
  'something', 'early', 'realtime', 'real', 'time', 'notification', 'notifications',
  'alert', 'alerts', 'analytics', 'dashboard', 'reporting', 'report', 'workflow', 'module', 'feature',
])

const CONCEPT_SYNONYMS: Record<string, string[]> = {
  attendance: ['presence', 'rollcall', 'checkin', 'checkins', 'biometric', 'face', 'facial', 'classroom', 'rfid', 'qr'],
  healthcare: ['medical', 'clinical', 'health', 'disease', 'diagnosis', 'diagnostic', 'patient', 'triage', 'chronic', 'diabetes', 'cardiac'],
  learning: ['course', 'lms', 'education', 'syllabus', 'quiz', 'adaptive', 'curriculum', 'recommender', 'tutor', 'prerequisite'],
  dropout: ['dropouts', 'retention', 'performance', 'grades', 'gpa', 'warning', 'marks', 'counseling', 'cie', 'predict', 'predicting', 'prediction', 'probation'],
  event: ['auditorium', 'hall', 'venue', 'booking', 'scheduling', 'schedule', 'conflict', 'ticketing', 'club'],
  ecommerce: ['ecommerce', 'checkout', 'cart', 'flash', 'concurrency', 'payment', 'marketplace', 'overselling'],
  capstone: ['thesis', 'miniproject', 'repository', 'archive', 'proposal', 'mentor', 'submission', 'faculty'],
}

function normalizeStem(word: string): string {
  if (word.length <= 4) return word
  return word.replace(/(ies)$/i, 'y').replace(/(ing|ed|es|s)$/i, '')
}

function tokenizeNormalized(text: string): string[] {
  if (!text) return []
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
    .map((w) => normalizeStem(w))
}

function expandConceptTokens(text: string): Set<string> {
  const base = tokenizeNormalized(text)
  const expanded = new Set<string>(base)

  for (const token of base) {
    for (const [conceptRoot, synonyms] of Object.entries(CONCEPT_SYNONYMS)) {
      if (token === conceptRoot || synonyms.includes(token)) {
        expanded.add(conceptRoot)
        for (const syn of synonyms) {
          expanded.add(syn)
        }
      }
    }
  }
  return expanded
}

function diceBigramSimilarity(a: string, b: string): number {
  if (a === b) return 1
  if (a.length < 4 || b.length < 4) return 0
  const getBigrams = (s: string) => {
    const out = new Set<string>()
    for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2))
    return out
  }
  const biA = getBigrams(a)
  const biB = getBigrams(b)
  let shared = 0
  for (const bg of biA) if (biB.has(bg)) shared++
  return (2 * shared) / (biA.size + biB.size)
}

function computeTokenSetOverlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let hits = 0
  for (const token of a) {
    if (b.has(token)) {
      hits += 1
    } else if (token.length >= 4) {
      // Tolerate minor spelling typos (e.g. "attendnce" vs "attendance", "dropot" vs "dropout")
      for (const bTok of b) {
        if (Math.abs(token.length - bTok.length) <= 2 && diceBigramSimilarity(token, bTok) >= 0.68) {
          hits += 0.9
          break
        }
      }
    }
  }
  const union = new Set([...a, ...b]).size
  const jaccard = hits / union
  const containment = Math.max(hits / a.size, hits / b.size)
  return Math.max(jaccard, containment * 0.85)
}

export class RepositorySearchService {
  /**
   * Deterministic 128-dimensional character & n-gram embedding vector
   */
  generateVectorEmbedding(text: string): number[] {
    const dim = 128
    const vec = new Array(dim).fill(0)
    const clean = text.toLowerCase().replace(/[^\w\s]/g, ' ')
    const tokens = clean.split(/\s+/).filter((t) => t.length > 2)

    for (const token of tokens) {
      let hash = 0
      for (let i = 0; i < token.length; i++) {
        hash = (hash << 5) - hash + token.charCodeAt(i)
        hash |= 0
      }
      const idx = Math.abs(hash) % dim
      vec[idx] += 1
    }

    for (let i = 0; i < tokens.length - 1; i++) {
      const bigram = `${tokens[i]}_${tokens[i + 1]}`
      let hash = 0
      for (let j = 0; j < bigram.length; j++) {
        hash = (hash << 5) - hash + bigram.charCodeAt(j)
        hash |= 0
      }
      const idx = Math.abs(hash) % dim
      vec[idx] += 1.5
    }

    const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0))
    if (norm === 0) return vec
    return vec.map((v) => Math.round((v / norm) * 1000) / 1000)
  }

  /**
   * Cosine similarity between two vectors (-1.0 to 1.0)
   */
  computeCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0
    let dot = 0
    let normA = 0
    let normB = 0
    const len = Math.min(vecA.length, vecB.length)
    for (let i = 0; i < len; i++) {
      dot += vecA[i] * vecB[i]
      normA += vecA[i] * vecA[i]
      normB += vecB[i] * vecB[i]
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB)
    return denom === 0 ? 0 : Math.max(0, dot / denom)
  }

  /**
   * Search repository with filters, natural language parsing, and vector similarity ranking
   */
  async searchProjects(filters: SearchFilters): Promise<IProject[]> {
    const paginated = await this.searchProjectsPaginated(filters)
    return paginated.projects
  }

  /**
   * Paginated search repository with multi-dimensional filtering & ranking
   */
  async searchProjectsPaginated(filters: SearchFilters): Promise<PaginatedProjectsResult> {
    const all = await ProjectRepository.getAllAccessible(filters.collegeId)

    let parsedKeywords: string[] = []
    let detectedTech: string | undefined = filters.technology
    let detectedDept: string | undefined = filters.department
    const rawQuery = (filters.query || '').trim()

    if (rawQuery.length > 0) {
      const qLower = rawQuery.toLowerCase()
      if (qLower.includes('machine learning') || qLower.includes('ml')) {
        detectedTech = detectedTech || 'Machine Learning'
      }
      if (qLower.includes('react') && qLower.includes('mongodb')) {
        detectedTech = detectedTech || 'React'
      }
      if (qLower.includes('iot') || qLower.includes('internet of things')) {
        detectedTech = detectedTech || 'IoT'
      }
      if (qLower.includes('computer science')) {
        detectedDept = detectedDept || 'Computer Science'
      }

      const queryStop = new Set([
        'what', 'projects', 'project', 'have', 'seniors', 'developed', 'using',
        'previous', 'related', 'to', 'that', 'solve', 'show', 'tell', 'me', 'about',
        'with', 'and', 'the', 'for', 'in', 'our', 'college',
      ])
      parsedKeywords = qLower
        .split(/[^\w]+/)
        .filter((w) => w.length > 2 && !queryStop.has(w))
    }

    const queryVector = rawQuery ? this.generateVectorEmbedding(rawQuery) : null

    const matched = all.filter((p) => {
      if (detectedDept && detectedDept !== 'All' && detectedDept !== 'All Departments') {
        const norm = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/\s+/g, ' ').trim()
        const target = norm(detectedDept)
        const actual = norm(p.department)
        if (!actual.includes(target) && !target.includes(actual)) {
          return false
        }
      }

      if (filters.academicYear && filters.academicYear !== 'All' && filters.academicYear !== 'All Years') {
        if (!p.academicYear.includes(filters.academicYear)) {
          return false
        }
      }

      if (filters.technology && filters.technology !== 'All') {
        const targetTech = filters.technology.toLowerCase().trim()
        const hasTech = p.technologyStack.some((t) => t.name.toLowerCase().includes(targetTech))
        if (!hasTech) {
          return false
        }
      }

      if (filters.category && filters.category !== 'All' && filters.category !== 'All Projects') {
        if (p.category && p.category !== filters.category) {
          return false
        }
      }

      if (filters.sourceType && filters.sourceType !== 'All') {
        if (p.sourceType !== filters.sourceType) {
          return false
        }
      }

      if (filters.verificationStatus && filters.verificationStatus !== 'All') {
        if (p.verificationStatus !== filters.verificationStatus) {
          return false
        }
      }

      if (rawQuery.length > 0) {
        const q = rawQuery.toLowerCase()
        const inTitle = p.title.toLowerCase().includes(q)
        const inAbstract = p.abstract.toLowerCase().includes(q)
        const inProblem = p.problemStatement.toLowerCase().includes(q)
        const inSolution = (p.solution || p.proposedSolution || '').toLowerCase().includes(q)
        const inFeatures = p.features.some((f) => f.toLowerCase().includes(q))
        const inModules = p.modules.some(
          (m) => m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q)
        )
        const inTech = p.technologyStack.some((t) => t.name.toLowerCase().includes(q))

        if (inTitle || inAbstract || inProblem || inSolution || inFeatures || inModules || inTech) {
          return true
        }

        if (q.includes('machine learning') || q.includes('ml')) {
          const isMl =
            p.abstract.toLowerCase().includes('machine learning') ||
            p.problemStatement.toLowerCase().includes('machine learning') ||
            p.technologyStack.some((t) =>
              ['scikit-learn', 'tensorflow', 'pytorch', 'python'].includes(t.name.toLowerCase())
            )
          if (isMl) return true
        }
        if (q.includes('attendance')) {
          if (p.title.toLowerCase().includes('attendance') || p.abstract.toLowerCase().includes('attendance')) {
            return true
          }
        }
        if (q.includes('iot')) {
          if (
            p.title.toLowerCase().includes('iot') ||
            p.technologyStack.some((t) =>
              ['lorawan', 'mqtt', 'arduino', 'raspberry pi', 'esp32'].includes(t.name.toLowerCase())
            )
          ) {
            return true
          }
        }

        if (parsedKeywords.length > 0) {
          const matchCount = parsedKeywords.filter(
            (kw) =>
              p.title.toLowerCase().includes(kw) ||
              p.abstract.toLowerCase().includes(kw) ||
              p.problemStatement.toLowerCase().includes(kw) ||
              p.features.some((f) => f.toLowerCase().includes(kw)) ||
              p.technologyStack.some((t) => t.name.toLowerCase().includes(kw))
          ).length

          if (matchCount >= 1) return true
        }

        if (queryVector) {
          const projText = `${p.title} ${p.abstract} ${p.problemStatement} ${p.technologyStack
            .map((t) => t.name)
            .join(' ')}`
          const projVec =
            p.embedding && p.embedding.length > 0 ? p.embedding : this.generateVectorEmbedding(projText)
          const sim = this.computeCosineSimilarity(queryVector, projVec)
          if (sim >= 0.25) return true
        }

        return false
      }

      return true
    })

    const ranked = matched.sort((a, b) => {
      if (!rawQuery) return 0
      const q = rawQuery.toLowerCase()
      const aTitleMatch = a.title.toLowerCase().includes(q) ? 10 : 0
      const bTitleMatch = b.title.toLowerCase().includes(q) ? 10 : 0
      return bTitleMatch - aTitleMatch
    })

    const page = Math.max(1, filters.page || 1)
    const limit = Math.max(1, filters.limit || 50)
    const totalCount = ranked.length
    const totalPages = Math.ceil(totalCount / limit) || 1
    const startIndex = (page - 1) * limit
    const paginatedItems = ranked.slice(startIndex, startIndex + limit)

    return {
      projects: paginatedItems,
      totalCount,
      currentPage: page,
      totalPages,
      hasMore: page < totalPages,
    }
  }

  /**
   * Multi-signal AI similarity comparison across all accessible repository projects
   */
  async compareStudentIdea(
    proposedTitle: string,
    proposedDescription: string,
    proposedTechStack: string[] = [],
    collegeId?: string,
    extraSignals?: {
      features?: string[]
      targetUsers?: string[]
      expectedOutcome?: string
      domain?: string
    }
  ): Promise<ProjectMatchResult[]> {
    const accessibleProjects = await ProjectRepository.getAllAccessible(collegeId)
    const results: ProjectMatchResult[] = []

    const combinedStudentText = [
      proposedTitle,
      proposedDescription,
      extraSignals?.domain || '',
      (extraSignals?.features || []).join(' '),
      (extraSignals?.targetUsers || []).join(' '),
      extraSignals?.expectedOutcome || '',
    ]
      .filter(Boolean)
      .join(' ')

    const studentTitleCore = new Set(tokenizeNormalized(proposedTitle))
    const studentCoreTokens = new Set(tokenizeNormalized(combinedStudentText))
    const studentExpanded = expandConceptTokens(combinedStudentText)
    const studentVec = this.generateVectorEmbedding(combinedStudentText)

    for (const project of accessibleProjects) {
      const titleSim = this.computeStringSimilarity(proposedTitle, project.title)
      const projectFullText = [
        project.title,
        project.problemStatement,
        project.abstract,
        project.proposedSolution || project.solution || project.proposedSystem || '',
        project.category || '',
        project.scope || '',
        project.objectives.join(' '),
        project.features.join(' '),
        project.modules.map((m) => `${m.name} ${m.description}`).join(' '),
      ]
        .filter(Boolean)
        .join(' ')

      const rawConceptSim = this.computeStringSimilarity(
        tokenizeNormalized(combinedStudentText)
          .filter((w) => !proposedTechStack.some((pt) => pt.toLowerCase().includes(w)))
          .join(' '),
        tokenizeNormalized(projectFullText)
          .filter((w) => !project.technologyStack.some((pt) => pt.name.toLowerCase().includes(w)))
          .join(' ')
      )

      // Multi-signal concept overlap using stopwords-stripped & domain-synonym signals
      const projTitleTokens = new Set(tokenizeNormalized(project.title))
      const projCoreTokens = new Set(tokenizeNormalized(projectFullText))
      const projExpanded = expandConceptTokens(
        `${project.title} ${project.problemStatement} ${project.abstract}`
      )

      const directTitleCoreOverlap = computeTokenSetOverlap(studentTitleCore, projTitleTokens)
      const directCoreOverlap = computeTokenSetOverlap(studentCoreTokens, projCoreTokens)
      const expandedSemanticOverlap = computeTokenSetOverlap(studentExpanded, projExpanded)

      const projVec =
        project.embedding && project.embedding.length > 0
          ? project.embedding
          : this.generateVectorEmbedding(projectFullText)
      const vectorSim = this.computeCosineSimilarity(studentVec, projVec)

      const conceptSim = Math.max(
        rawConceptSim,
        directTitleCoreOverlap * 0.9,
        directCoreOverlap * 0.92,
        expandedSemanticOverlap * 0.78,
        vectorSim * 0.72
      )

      // Match technologies separately (shared tech != duplicate concept!)
      const matchingTech = project.technologyStack
        .filter((t) =>
          proposedTechStack.some((pt) => pt.toLowerCase().trim() === t.name.toLowerCase().trim())
        )
        .map((t) => t.name)

      // Match functional features and modules strictly using filtered meaningful domain tokens
      const uniqueDescWords = Array.from(new Set(tokenizeNormalized(combinedStudentText))).filter(
        (w) => w.length >= 4
      )
      const matchingFeatures = project.features.filter((f) => {
        const fTokens = tokenizeNormalized(f)
        if (fTokens.length === 0) return false
        const overlapCount = fTokens.filter((ft) => uniqueDescWords.includes(ft)).length
        return overlapCount >= 2 || (fTokens.length === 1 && overlapCount === 1)
      })
      const matchingModules = project.modules.filter((m) => {
        const mTokens = tokenizeNormalized(`${m.name} ${m.description}`)
        const overlapCount = mTokens.filter((mt) => uniqueDescWords.includes(mt)).length
        return overlapCount >= 2
      })

      // Strong exact/title/concept classification vs tech-only isolation
      const normPropTitle = proposedTitle.toLowerCase().replace(/[^\w\s]/g, '').trim()
      const normProjTitle = project.title.toLowerCase().replace(/[^\w\s]/g, '').trim()
      const exactTitlePhrase =
        normPropTitle.length >= 6 &&
        normProjTitle.length >= 6 &&
        (normPropTitle === normProjTitle ||
          normProjTitle.includes(normPropTitle) ||
          normPropTitle.includes(normProjTitle))

      let classification: SimilarityClassification = 'INDEPENDENT_WORK'
      let academicClassification: AcademicSimilarityLabel = 'No sufficiently similar project found'
      let compositeScore = 0
      let classificationReason = ''

      const meaningfulConceptMatch =
        directTitleCoreOverlap >= 0.35 ||
        directCoreOverlap >= 0.25 ||
        expandedSemanticOverlap >= 0.4 ||
        rawConceptSim >= 0.35

      const sharedDomainBigram = [
        'project management',
        'workflow tracking',
        'complaint tracking',
        'vehicle slot',
      ].find(
        (bg) =>
          normPropTitle.includes(bg) &&
          `${normProjTitle} ${(project.abstract || '').toLowerCase()}`.includes(bg)
      )

      if (exactTitlePhrase || titleSim >= 0.75 || directTitleCoreOverlap >= 0.75) {
        classification = 'EXACT_OR_NEAR_EXACT_TITLE'
        academicClassification = 'Exact or near duplicate'
        compositeScore = 0.95
        classificationReason = `Both the title and core topic closely match "${project.title}" (${project.academicYear}).`
      } else if (
        sharedDomainBigram ||
        (meaningfulConceptMatch &&
          (conceptSim >= 0.35 || (directTitleCoreOverlap >= 0.35 && directCoreOverlap >= 0.2)))
      ) {
        classification = 'SIMILAR_PROJECT_CONCEPT'
        academicClassification =
          sharedDomainBigram || conceptSim >= 0.55 ? 'Highly related project' : 'Conceptually related project'
        compositeScore = Math.max(sharedDomainBigram ? 0.88 : 0.65, conceptSim)
        classificationReason = `Both projects target a closely aligned problem domain and core solution workflow (${project.problemStatement.slice(0, 140)}${project.problemStatement.length > 140 ? '...' : ''}).`
      } else if (matchingFeatures.length >= 2) {
        classification = 'SIMILAR_FEATURE_SET'
        academicClassification = 'Partially related project'
        compositeScore = 0.5
        classificationReason = `Several functional features overlap (${matchingFeatures.slice(0, 3).join(', ')}), even though the overall framing differs.`
      } else if (matchingTech.length >= 2 && !meaningfulConceptMatch) {
        classification = 'RELATED_TECHNOLOGY_ONLY'
        academicClassification = 'No sufficiently similar project found'
        compositeScore = 0.3
        classificationReason = `Only implementation technologies overlap (${matchingTech.join(', ')}); the problem domain, target users, and functional concept are distinct.`
      } else {
        compositeScore = Math.max(titleSim, conceptSim * 0.5)
      }

      // Check documented gaps accurately (never guess)
      const missingDetails: string[] = []
      if (!project.batch) missingDetails.push('Batch/cohort label')
      if (!project.semester) missingDetails.push('Semester metadata')
      if (!project.architecture?.diagramUrl) missingDetails.push('Architecture diagram')
      if (project.reportDocuments.length === 0) missingDetails.push('Full project report PDF')
      if (project.screenshots.length === 0) missingDetails.push('Application screenshots')
      if (!project.githubUrl) missingDetails.push('Public GitHub repository link')
      if (!project.limitations || project.limitations.length === 0) {
        missingDetails.push('Recorded technical limitations')
      }

      const critique = this.generatePedagogicalCritique(
        project,
        classification,
        matchingTech,
        matchingFeatures
      )

      const similarities: string[] = []
      if (titleSim >= 0.45 || directTitleCoreOverlap >= 0.35) {
        similarities.push(`Core topic aligns with "${project.title}"`)
      }
      if (meaningfulConceptMatch) {
        similarities.push(
          `Shared problem space: ${project.problemStatement}`
        )
      }
      if (matchingFeatures.length > 0) {
        similarities.push(`Overlapping documented features: ${matchingFeatures.join(', ')}`)
      }
      if (matchingTech.length > 0) {
        similarities.push(`Shared technologies: ${matchingTech.join(', ')}`)
      }

      const differences: string[] = []
      const unsharedTech = proposedTechStack.filter(
        (t) => !matchingTech.map((m) => m.toLowerCase()).includes(t.toLowerCase())
      )
      if (unsharedTech.length > 0) {
        differences.push(`You introduce technologies not recorded in the earlier project: ${unsharedTech.join(', ')}`)
      }
      if (classification === 'RELATED_TECHNOLOGY_ONLY') {
        differences.push('Problem domain, target users, and end goals are completely distinct despite shared frameworks')
      } else if (project.limitations && project.limitations.length > 0) {
        differences.push(`Your design can explicitly address documented gaps (${project.limitations.join('; ')})`)
      } else {
        differences.push('Your specific target workflow, architecture trade-offs, and extensions remain open to differentiation')
      }

      const improvementOpportunities: string[] = []
      if (project.limitations && project.limitations.length > 0) {
        improvementOpportunities.push(
          ...project.limitations.map((l) => `Address documented limitation: ${l}`)
        )
      }
      if (project.futureEnhancements && project.futureEnhancements.length > 0) {
        improvementOpportunities.push(
          ...project.futureEnhancements.map((f) => `Extend documented future work: ${f}`)
        )
      }
      if (improvementOpportunities.length === 0) {
        improvementOpportunities.push(
          'Define measurable evaluation benchmarks (latency, accuracy, usability) missing from the prior abstract'
        )
        improvementOpportunities.push(
          'Compare architectural trade-offs and privacy safeguards against the earlier implementation'
        )
      }

      const missingOrUnknown = missingDetails.map(
        (m) => `Not recorded in repository entry: ${m}`
      )

      const documentedSolution =
        project.solution || project.proposedSolution || project.proposedSystem || project.abstract

      const dimensionComparison = {
        problemAddressed: project.problemStatement,
        targetUsers:
          project.scope ||
          `Academic department stakeholders (${project.department})`,
        proposedSolution: documentedSolution,
        functionalFeatures:
          project.features.length > 0
            ? project.features.join('; ')
            : 'No explicit feature list archived.',
        technicalImplementation: `${project.technologyStack.map((t) => t.name).join(', ')}${
          project.architecture?.description ? ` — ${project.architecture.description}` : ''
        }`,
        expectedOutcomes:
          project.objectives.length > 0
            ? project.objectives.join('; ')
            : 'Expected outcomes not itemized beyond project abstract.',
      }

      if (classification !== 'INDEPENDENT_WORK') {
        results.push({
          project,
          score: Math.round(compositeScore * 100) / 100,
          classification,
          academicClassification,
          classificationReason,
          matchedDimensions: {
            titleSimilarity: Math.round(Math.max(titleSim, directTitleCoreOverlap) * 100) / 100,
            conceptSimilarity: Math.round(conceptSim * 100) / 100,
            matchingFeatures,
            matchingTechnologies: matchingTech,
          },
          dimensionComparison,
          academicCritique: critique,
          sourceAttribution: {
            sourceType: project.sourceType,
            verificationStatus: project.verificationStatus,
            confirmedFromDocumentation: project.reportDocuments.some((d) => d.verified),
            missingDetails,
          },
          analysis: {
            problemAddressed: project.problemStatement,
            documentedSolution,
            documentedFeatures: project.features,
            technologiesUsed: project.technologyStack.map((t) => t.name),
            similaritiesWithIdea:
              similarities.length > 0 ? similarities : ['Shared general academic domain'],
            differencesWithIdea: differences,
            missingOrUnknownInformation: missingOrUnknown,
            improvementOpportunities: improvementOpportunities.slice(0, 4),
          },
        })
      }
    }

    return results.sort((a, b) => b.score - a.score)
  }

  /**
   * Generates constructive academic guidance (Similarity != Plagiarism)
   */
  private generatePedagogicalCritique(
    project: IProject,
    classification: SimilarityClassification,
    matchingTech: string[],
    matchingFeatures: string[]
  ): string {
    switch (classification) {
      case 'EXACT_OR_NEAR_EXACT_TITLE':
        return `A nearly identical project ("${project.title}") was documented in ${project.academicYear} under ${project.department}. Your proposed idea overlaps closely with its core scope. What new capability or meaningful improvement are you planning that distinguishes your project?`

      case 'SIMILAR_PROJECT_CONCEPT':
        return `Your proposed idea overlaps significantly with the problem and solution of "${project.title}" (${project.academicYear}). What new capability or meaningful improvement are you planning that distinguishes your contribution?`

      case 'SIMILAR_FEATURE_SET':
        return `Some planned capabilities overlap with "${project.title}" (${matchingFeatures.slice(0, 3).join(', ')}). What new capability or meaningful improvement are you planning? Shared features are normal across projects, provided your core problem and evaluation advance beyond the prior work.`

      case 'RELATED_TECHNOLOGY_ONLY':
        return `Both projects share technologies (${matchingTech.join(', ')}), which is only an implementation choice and NOT conceptual duplication. Your problem domain appears distinct.`

      default:
        return 'No sufficiently similar project was found in the accessible repository.'
    }
  }

  /**
   * Token-based Jaccard / containment string similarity (0.0 to 1.0)
   */
  private computeStringSimilarity(a: string, b: string): number {
    if (!a || !b) return 0
    const str1 = a.toLowerCase().trim()
    const str2 = b.toLowerCase().trim()

    if (str1 === str2) return 1.0

    if (str1.length >= 6 && str2.length >= 6 && (str1.includes(str2) || str2.includes(str1))) {
      return 0.95
    }

    const words1 = new Set(str1.split(/\W+/).filter((w) => w.length > 2))
    const words2 = new Set(str2.split(/\W+/).filter((w) => w.length > 2))

    if (words1.size === 0 || words2.size === 0) return 0

    let intersection = 0
    for (const w of words1) {
      if (words2.has(w)) intersection++
    }

    const union = new Set([...words1, ...words2]).size
    const jaccard = intersection / union
    const containment = Math.max(intersection / words1.size, intersection / words2.size)

    return Math.max(jaccard, containment * 0.85)
  }
}

export const repositorySearchService = new RepositorySearchService()
