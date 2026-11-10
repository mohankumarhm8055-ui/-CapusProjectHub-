import { getApiBaseUrl, getApiHeaders } from './sessionService'

const getBase = () => `${getApiBaseUrl()}/api/repository`

export interface RepositoryProject {
  id: string
  title: string
  slug: string
  category?: string
  abstract: string
  problemStatement: string
  objectives?: string[]
  solution?: string
  proposedSolution?: string
  features: string[]
  modules?: Array<{ name: string; description: string; features?: string[] }>
  architecture?: { description?: string; diagramUrl?: string }
  technologyStack: Array<{ name: string; category?: string }>
  technologies?: string[]
  academicYear: string
  semester?: string
  department: string
  collegeId: string
  teamMembers: Array<{
    studentId?: string
    name: string
    role?: string
    department?: string
    isLeader?: boolean
    isAvailableForMentoring?: boolean
  }>
  facultyGuide: { name: string; designation?: string; department?: string; officialEmail?: string }
  screenshots?: Array<{ url: string; caption?: string }>
  reportDocuments?: Array<{ title: string; fileUrl: string; fileType?: string; verified?: boolean }>
  demoUrl?: string
  githubUrl?: string
  documentationUrl?: string
  videoUrl?: string
  challenges?: string[]
  learningOutcomes?: string[]
  futureEnhancements?: string[]
  references?: string[]
  sourceType: 'ADMIN_IMPORTED_HISTORICAL' | 'STUDENT_SUBMISSION'
  reviewStatus: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'CHANGES_REQUESTED' | 'APPROVED' | 'REJECTED'
  workflowStatus?: string
  verificationStatus: 'PENDING_VERIFICATION' | 'VERIFIED_HISTORICAL' | 'FACULTY_APPROVED'
  rejectionReason?: string
  createdAt?: string
}

export interface IdeaComparisonAnalysis {
  problemAddressed: string
  documentedSolution: string
  documentedFeatures: string[]
  technologiesUsed: string[]
  similaritiesWithIdea: string[]
  differencesWithIdea: string[]
  missingOrUnknownInformation: string[]
  improvementOpportunities: string[]
}

export interface IdeaMatchResult {
  classification: string
  overlapConfidence: number
  documentedFeatures: string[]
  pedagogicalCritique: string
  matchedProject: RepositoryProject
  matchedDimensions: {
    titleSimilarity: number
    conceptSimilarity: number
    matchingFeatures: string[]
    matchingTechnologies: string[]
  }
  sourceAttribution: {
    sourceType: string
    verificationStatus: string
    confirmedFromDocumentation: boolean
    missingDetails: string[]
  }
  analysis?: IdeaComparisonAnalysis
}

export interface IdeaComparisonResponse {
  proposedTitle: string
  summary: string
  matches: IdeaMatchResult[]
}

class RepositoryService {
  private getHeaders(): HeadersInit {
    return getApiHeaders()
  }

  async searchProjects(filters: {
    query?: string
    department?: string
    academicYear?: string
    technology?: string
    category?: string
    sourceType?: string
    verificationStatus?: string
    page?: number
    limit?: number
    naturalLanguage?: boolean
  }): Promise<{
    projects: RepositoryProject[]
    totalCount: number
    currentPage: number
    totalPages: number
  }> {
    const params = new URLSearchParams()
    if (filters.query) params.append('query', filters.query)
    if (filters.department && filters.department !== 'All') params.append('department', filters.department)
    if (filters.academicYear && filters.academicYear !== 'All') params.append('academicYear', filters.academicYear)
    if (filters.technology && filters.technology !== 'All') params.append('technology', filters.technology)
    if (filters.category && filters.category !== 'All') params.append('category', filters.category)
    if (filters.sourceType && filters.sourceType !== 'All') params.append('sourceType', filters.sourceType)
    if (filters.verificationStatus && filters.verificationStatus !== 'All') params.append('verificationStatus', filters.verificationStatus)
    if (filters.page) params.append('page', String(filters.page))
    if (filters.limit) params.append('limit', String(filters.limit))
    if (filters.naturalLanguage) params.append('naturalLanguage', 'true')

    const res = await fetch(`${getBase()}/search?${params.toString()}`, {
      headers: this.getHeaders(),
    })
    if (!res.ok) {
      throw new Error(`Failed to search repository projects (${res.status})`)
    }
    const json = await res.json()
    return {
      projects: json.data || [],
      totalCount: json.totalCount ?? (json.data ? json.data.length : 0),
      currentPage: json.currentPage ?? 1,
      totalPages: json.totalPages ?? 1,
    }
  }

  async getProjectById(id: string): Promise<RepositoryProject> {
    const res = await fetch(`${getBase()}/projects/${id}`, {
      headers: this.getHeaders(),
    })
    if (!res.ok) {
      throw new Error(`Project not found or inaccessible (${res.status})`)
    }
    const json = await res.json()
    return json.data
  }

  async compareIdea(data: {
    title: string
    description: string
    technologies?: string[]
  }): Promise<IdeaComparisonResponse> {
    const res = await fetch(`${getBase()}/compare`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      throw new Error(`Idea comparison failed (${res.status})`)
    }
    const json = await res.json()
    return json.data
  }

  async createStudentDraft(data: {
    title: string
    abstract: string
    problemStatement: string
    department: string
    academicYear: string
    technologyStack?: string[]
    objectives?: string[]
    features?: string[]
  }): Promise<RepositoryProject> {
    const res = await fetch(`${getBase()}/submissions/draft`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      throw new Error(`Failed to create draft (${res.status})`)
    }
    const json = await res.json()
    return json.data
  }

  async updateStudentSubmission(id: string, updates: any): Promise<RepositoryProject> {
    const res = await fetch(`${getBase()}/submissions/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(updates),
    })
    if (!res.ok) {
      throw new Error(`Failed to update submission (${res.status})`)
    }
    const json = await res.json()
    return json.data
  }

  async submitForReview(id: string): Promise<RepositoryProject> {
    const res = await fetch(`${getBase()}/submissions/${id}/submit`, {
      method: 'POST',
      headers: this.getHeaders(),
    })
    if (!res.ok) {
      throw new Error(`Failed to submit project (${res.status})`)
    }
    const json = await res.json()
    return json.data
  }

  async importCsv(csvContent: string): Promise<any> {
    const res = await fetch(`${getBase()}/admin/import/csv`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ csv: csvContent }),
    })
    const json = await res.json()
    return json
  }
}

export const repositoryService = new RepositoryService()
