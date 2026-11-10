export type ProjectCategory =
  | 'Artificial Intelligence'
  | 'Machine Learning'
  | 'Web Development'
  | 'Data Science'
  | 'Education Technology'
  | 'Full Stack Development'

export type ProjectDifficulty = 'Beginner' | 'Intermediate' | 'Advanced'
export type ProjectStatus = 'In Progress' | 'Completed' | 'Under Review'
export type ApprovalStatus = 'Faculty Approved' | 'Pending Review' | 'Revision Requested'

export type TechCategory =
  | 'Frontend'
  | 'Backend'
  | 'Database'
  | 'Programming Languages'
  | 'Frameworks'
  | 'AI/ML Tools'
  | 'Development Tools'

export interface TechnologyItem {
  name: string
  category: TechCategory
  iconName?: string
}

export interface ScreenshotItem {
  id: string
  url: string
  caption: string
}

export interface TeamMember {
  id: string
  name: string
  profileImage: string
  role: string
  department: string
  semester: string
  responsibilities: string[]
  isLeader: boolean
  publicPhone?: string
  publicEmail?: string
  showPublicPhone: boolean
  showPublicEmail: boolean
  isAvailableForMentoring?: boolean
  studentId?: string
}

export interface FacultyGuide {
  id: string
  name: string
  designation: string
  department: string
  profileImage: string
  officialEmail?: string
}

export interface ProjectRequirements {
  hardware: string[]
  software: string[]
  languages: string[]
  frameworks: string[]
  database: string[]
  environment: string[]
  installation: string[]
  prerequisites: string[]
}

export interface Comment {
  id: string
  projectId: string
  userId: string
  userName: string
  userAvatar: string
  content: string
  parentCommentId?: string
  likesCount: number
  isLiked?: boolean
  createdAt: string
  updatedAt?: string
  replies?: Comment[]
}

export interface Project {
  id: string
  title: string
  slug: string
  description: string
  abstract: string
  problemStatement: string
  objectives: string[]
  proposedSolution: string
  coverImage: string
  screenshots: ScreenshotItem[]
  category: ProjectCategory
  department: string
  academicYear: string
  difficulty: ProjectDifficulty
  status: ProjectStatus
  technologies: TechnologyItem[]
  requirements: ProjectRequirements
  githubUrl?: string
  liveDemoUrl?: string
  documentationUrl?: string
  videoUrl?: string
  architectureDiagram?: string
  learningOutcomes: string[]
  futureEnhancements: string[]
  challenges: string[]
  teamMembers: TeamMember[]
  facultyGuide: FacultyGuide
  approvalStatus: ApprovalStatus
  likesCount: number
  commentsCount: number
  createdAt: string
  sourceType?: 'ADMIN_IMPORTED_HISTORICAL' | 'STUDENT_SUBMISSION'
  verificationStatus?: 'PENDING_VERIFICATION' | 'VERIFIED_HISTORICAL' | 'FACULTY_APPROVED'
  modules?: Array<{ name: string; description: string; features?: string[] }>
  reportDocuments?: Array<{ title: string; fileUrl: string; fileType?: string; verified?: boolean }>
}
