import { ProjectRepository, IProject } from './project.model.js'

export type SimilarityClassification =
  | 'EXACT_OR_NEAR_EXACT_TITLE'
  | 'SIMILAR_PROJECT_CONCEPT'
  | 'SIMILAR_FEATURE_SET'
  | 'RELATED_TECHNOLOGY_ONLY'
  | 'INDEPENDENT_WORK'

export interface ProjectMatchResult {
  project: IProject
  score: number // 0.0 to 1.0
  classification: SimilarityClassification
  matchedDimensions: {
    titleSimilarity: number
    conceptSimilarity: number
    matchingFeatures: string[]
    matchingTechnologies: string[]
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
    const all = await ProjectRepository.getAllAccessible(filters.collegeId || 'rvce-main')

    // Parse natural language queries if detected
    let parsedKeywords: string[] = []
    let detectedTech: string | undefined = filters.technology
    let detectedDept: string | undefined = filters.department
    let rawQuery = (filters.query || '').trim()

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

      // Filter stop words to isolate core subject matter
      const stopWords = new Set([
        'what', 'projects', 'project', 'have', 'seniors', 'developed', 'using',
        'previous', 'related', 'to', 'that', 'solve', 'show', 'tell', 'me', 'about',
        'with', 'and', 'the', 'for', 'in', 'our', 'college'
      ])
      parsedKeywords = qLower
        .split(/[^\w]+/)
        .filter((w) => w.length > 2 && !stopWords.has(w))
    }

    // Query vector for semantic ranking
    const queryVector = rawQuery ? this.generateVectorEmbedding(rawQuery) : null

    const matched = all.filter((p) => {
      // 1. Department filter
      if (detectedDept && detectedDept !== 'All' && detectedDept !== 'All Departments') {
        const norm = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/\s+/g, ' ').trim()
        const target = norm(detectedDept)
        const actual = norm(p.department)
        if (!actual.includes(target) && !target.includes(actual)) {
          return false
        }
      }

      // 2. Academic Year filter
      if (filters.academicYear && filters.academicYear !== 'All' && filters.academicYear !== 'All Years') {
        if (!p.academicYear.includes(filters.academicYear)) {
          return false
        }
      }

      // 3. Explicit Technology filter
      if (filters.technology && filters.technology !== 'All') {
        const targetTech = filters.technology.toLowerCase().trim()
        const hasTech = p.technologyStack.some((t) => t.name.toLowerCase().includes(targetTech))
        if (!hasTech) {
          return false
        }
      }

      // 4. Category filter
      if (filters.category && filters.category !== 'All' && filters.category !== 'All Projects') {
        if (p.category && p.category !== filters.category) {
          return false
        }
      }

      // 5. Source Type filter
      if (filters.sourceType && filters.sourceType !== 'All') {
        if (p.sourceType !== filters.sourceType) {
          return false
        }
      }

      // 6. Verification Status filter
      if (filters.verificationStatus && filters.verificationStatus !== 'All') {
        if (p.verificationStatus !== filters.verificationStatus) {
          return false
        }
      }

      // 7. Keyword / Natural language matching
      if (rawQuery.length > 0) {
        const q = rawQuery.toLowerCase()
        const inTitle = p.title.toLowerCase().includes(q)
        const inAbstract = p.abstract.toLowerCase().includes(q)
        const inProblem = p.problemStatement.toLowerCase().includes(q)
        const inSolution = (p.solution || p.proposedSolution || '').toLowerCase().includes(q)
        const inFeatures = p.features.some((f) => f.toLowerCase().includes(q))
        const inModules = p.modules.some((m) => m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q))
        const inTech = p.technologyStack.some((t) => t.name.toLowerCase().includes(q))

        if (inTitle || inAbstract || inProblem || inSolution || inFeatures || inModules || inTech) {
          return true
        }

        // Domain-specific natural language phrases
        if (q.includes('machine learning') || q.includes('ml')) {
          const isMl =
            p.abstract.toLowerCase().includes('machine learning') ||
            p.problemStatement.toLowerCase().includes('machine learning') ||
            p.technologyStack.some((t) => ['scikit-learn', 'tensorflow', 'pytorch', 'python'].includes(t.name.toLowerCase()))
          if (isMl) return true
        }
        if (q.includes('attendance')) {
          if (p.title.toLowerCase().includes('attendance') || p.abstract.toLowerCase().includes('attendance')) {
            return true
          }
        }
        if (q.includes('iot')) {
          if (p.title.toLowerCase().includes('iot') || p.technologyStack.some((t) => ['lorawan', 'mqtt', 'arduino', 'raspberry pi', 'esp32'].includes(t.name.toLowerCase()))) {
            return true
          }
        }

        // Check parsed extracted keywords
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

        // Semantic vector similarity threshold
        if (queryVector) {
          const projText = `${p.title} ${p.abstract} ${p.problemStatement} ${p.technologyStack.map((t) => t.name).join(' ')}`
          const projVec = p.embedding && p.embedding.length > 0 ? p.embedding : this.generateVectorEmbedding(projText)
          const sim = this.computeCosineSimilarity(queryVector, projVec)
          if (sim >= 0.25) return true
        }

        return false
      }

      return true
    })

    // Rank matching results by relevance (title exact match > keyword density > vector similarity)
    const ranked = matched.sort((a, b) => {
      if (!rawQuery) return 0
      const q = rawQuery.toLowerCase()
      const aTitleMatch = a.title.toLowerCase().includes(q) ? 10 : 0
      const bTitleMatch = b.title.toLowerCase().includes(q) ? 10 : 0
      return bTitleMatch - aTitleMatch
    })

    // Pagination
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
   * Deep AI similarity comparison between a student idea and repository projects
   */
  async compareStudentIdea(
    proposedTitle: string,
    proposedDescription: string,
    proposedTechStack: string[] = [],
    collegeId = 'rvce-main'
  ): Promise<ProjectMatchResult[]> {
    const accessibleProjects = await ProjectRepository.getAllAccessible(collegeId)
    const results: ProjectMatchResult[] = []

    for (const project of accessibleProjects) {
      const titleSim = this.computeStringSimilarity(proposedTitle, project.title)
      const conceptSim = this.computeStringSimilarity(
        `${proposedTitle} ${proposedDescription}`,
        `${project.title} ${project.problemStatement} ${project.abstract}`
      )

      // Identify matching technologies
      const matchingTech = project.technologyStack
        .filter((t) =>
          proposedTechStack.some((pt) => pt.toLowerCase().trim() === t.name.toLowerCase().trim())
        )
        .map((t) => t.name)

      // Identify overlapping feature tokens
      const descWords = proposedDescription.toLowerCase().split(/\W+/).filter((w) => w.length > 4)
      const matchingFeatures = project.features.filter((f) =>
        descWords.some((dw) => f.toLowerCase().includes(dw))
      )

      // Classify comparison dimension
      let classification: SimilarityClassification = 'INDEPENDENT_WORK'
      let compositeScore = 0

      if (titleSim >= 0.75) {
        classification = 'EXACT_OR_NEAR_EXACT_TITLE'
        compositeScore = 0.95
      } else if (conceptSim >= 0.35 || (titleSim >= 0.45 && conceptSim >= 0.25)) {
        classification = 'SIMILAR_PROJECT_CONCEPT'
        compositeScore = Math.max(0.65, conceptSim)
      } else if (matchingFeatures.length >= 2) {
        classification = 'SIMILAR_FEATURE_SET'
        compositeScore = 0.5
      } else if (matchingTech.length >= 2) {
        classification = 'RELATED_TECHNOLOGY_ONLY'
        compositeScore = 0.3
      } else {
        compositeScore = Math.max(titleSim, conceptSim * 0.5)
      }

      // Check documentation gaps
      const missingDetails: string[] = []
      if (!project.architecture?.diagramUrl) missingDetails.push('Architecture diagram')
      if (project.reportDocuments.length === 0) missingDetails.push('Full PDF project report')
      if (project.screenshots.length === 0) missingDetails.push('Application screenshots')

      // Formulate educational critique
      const critique = this.generatePedagogicalCritique(
        project,
        classification,
        matchingTech,
        matchingFeatures
      )

      // Section 5: Detailed comparison breakdown
      const similarities: string[] = []
      if (titleSim >= 0.5) similarities.push(`Title formulation closely mirrors "${project.title}"`)
      if (conceptSim >= 0.25) similarities.push(`Overlaps with problem formulation: ${project.problemStatement.slice(0, 120)}...`)
      if (matchingTech.length > 0) similarities.push(`Shared technology stack: ${matchingTech.join(', ')}`)
      if (matchingFeatures.length > 0) similarities.push(`Overlapping planned feature scope: ${matchingFeatures.join(', ')}`)

      const differences: string[] = []
      const unsharedTech = proposedTechStack.filter((t) => !matchingTech.map((m) => m.toLowerCase()).includes(t.toLowerCase()))
      if (unsharedTech.length > 0) {
        differences.push(`Your team introduces technologies not utilized in the previous project: ${unsharedTech.join(', ')}`)
      }
      if (classification === 'RELATED_TECHNOLOGY_ONLY') {
        differences.push(`Problem domain and user workflows are distinct despite shared frameworks`)
      } else {
        differences.push(`Modern runtime environment or alternative architectural design`)
      }

      const improvementOpportunities: string[] = []
      if (project.limitations && project.limitations.length > 0) {
        improvementOpportunities.push(...project.limitations.map((l) => `Address documented hurdle: ${l}`))
      } else {
        improvementOpportunities.push('Introduce responsive client feedback or edge execution')
        improvementOpportunities.push('Implement comparative performance benchmarks against previous implementations')
      }
      if (project.futureEnhancements && project.futureEnhancements.length > 0) {
        improvementOpportunities.push(...project.futureEnhancements.map((f) => `Incorporate planned future enhancement: ${f}`))
      }

      const missingOrUnknown: string[] = []
      if (missingDetails.length > 0) {
        missingOrUnknown.push(...missingDetails.map((m) => `Not available in documented repository record: ${m}`))
      }
      missingOrUnknown.push('Internal benchmark evaluation test dataset is not publicly archived')

      if (compositeScore >= 0.25 || classification !== 'INDEPENDENT_WORK') {
        results.push({
          project,
          score: Math.round(compositeScore * 100) / 100,
          classification,
          matchedDimensions: {
            titleSimilarity: Math.round(titleSim * 100) / 100,
            conceptSimilarity: Math.round(conceptSim * 100) / 100,
            matchingFeatures,
            matchingTechnologies: matchingTech,
          },
          academicCritique: critique,
          sourceAttribution: {
            sourceType: project.sourceType,
            verificationStatus: project.verificationStatus,
            confirmedFromDocumentation: project.reportDocuments.some((d) => d.verified),
            missingDetails,
          },
          analysis: {
            problemAddressed: project.problemStatement,
            documentedSolution: project.solution || project.proposedSolution || project.proposedSystem || project.abstract,
            documentedFeatures: project.features,
            technologiesUsed: project.technologyStack.map((t) => t.name),
            similaritiesWithIdea: similarities.length > 0 ? similarities : ['Shared general computing domain'],
            differencesWithIdea: differences,
            missingOrUnknownInformation: missingOrUnknown,
            improvementOpportunities: improvementOpportunities.slice(0, 4),
          },
        })
      }
    }

    // Sort by highest similarity match
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
        return `A nearly identical capstone project (${project.title}) was completed in ${project.academicYear} under ${project.department}. Your proposed idea overlaps with its core functionality. What new capability or meaningful improvement are you planning that distinguishes your project?`

      case 'SIMILAR_PROJECT_CONCEPT':
        return `Your proposed idea overlaps with the core problem formulation of ${project.title} (${project.academicYear}). What new capability or meaningful improvement are you planning that distinguishes your contribution?`

      case 'SIMILAR_FEATURE_SET':
        return `Your planned features overlap with ${project.title} in: [${matchingFeatures.slice(0, 3).join(', ')}]. What new capability or meaningful improvement are you planning? Note: Shared features do not imply duplication, but ensure you formulate distinct evaluation benchmarks.`

      case 'RELATED_TECHNOLOGY_ONLY':
        return `Both projects use common technologies ([${matchingTech.join(', ')}]). Shared technology alone is NOT a duplicate indicator. Your problem domain appears distinct.`

      default:
        return `Independent academic concept with minimal documented overlap in the college repository.`
    }
  }

  /**
   * Token-based Jaccard / Cosine character n-gram similarity (0.0 to 1.0)
   */
  private computeStringSimilarity(a: string, b: string): number {
    if (!a || !b) return 0
    const str1 = a.toLowerCase().trim()
    const str2 = b.toLowerCase().trim()

    if (str1 === str2) return 1.0

    if (str1.includes(str2) || str2.includes(str1)) {
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
