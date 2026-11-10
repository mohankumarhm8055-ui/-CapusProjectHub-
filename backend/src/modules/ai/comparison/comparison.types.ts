export type DimensionRelation =
  | 'Same'
  | 'Similar'
  | 'Different'
  | 'Not documented'
  | 'Not applicable'

export type ComparisonDimensionName =
  | 'Project problem'
  | 'Target users'
  | 'Objectives'
  | 'Proposed solution'
  | 'Functional modules'
  | 'Implemented features'
  | 'Technologies'
  | 'Algorithms'
  | 'Architecture'
  | 'Data sources'
  | 'Documented limitations'
  | 'Future enhancements'

export interface StructuredDimensionComparison {
  dimension: ComparisonDimensionName
  studentAspect: string
  repositoryAspect: string
  relationship: DimensionRelation
  evidence: string
}

export interface ProjectByProjectComparison {
  projectId: string
  title: string
  academicYear: string
  batch: string
  department: string
  sourceUrl: string
  sourceType: string
  verificationStatus: string
  classification: string
  academicClassification: string
  whySelected: string
  missingDocumentation: string[]
  dimensions: StructuredDimensionComparison[]
}

export interface CollectiveSynthesis {
  commonFunctionality: string[]
  repeatedApproaches: string[]
  differentImplementationStrategies: string[]
  uniqueFeatures: string[]
  sharedTechnologies: string[]
  documentedLimitationsSummary: string[]
}

export type ResearchGapCategory =
  | 'Functional gaps'
  | 'Usability improvements'
  | 'Technical improvements'
  | 'Security and privacy improvements'
  | 'Performance improvements'
  | 'Accessibility improvements'
  | 'Automation opportunities'
  | 'New use cases'

export interface IdentifiedResearchGap {
  gapId: string
  category: ResearchGapCategory
  sourceBasis: 'DOCUMENTED_LIMITATION' | 'DOCUMENTED_FUTURE_ENHANCEMENT' | 'AI_IMPROVEMENT_HYPOTHESIS'
  existingApproach: string
  limitationEvidence: string
  proposedImprovement: string
  expectedUserBenefit: string
  implementationRequirements: string[]
  technicalDependencies: string[]
  estimatedComplexity: 'Low' | 'Medium' | 'High'
  risksAndLimitations: string[]
}

export type DifferentiationClassification =
  | 'Core contribution'
  | 'Meaningful improvement'
  | 'Supporting feature'
  | 'Optional enhancement'
  | 'Unnecessary feature'

export type AcademicFeatureTier = 'Essential' | 'Recommended' | 'Optional' | 'Unnecessary'

export type ContributionCategoryType =
  | 'A new module'
  | 'An enhancement to an existing module'
  | 'A technical improvement'
  | 'A new application of existing technology'
  | 'A minor UI change with limited academic contribution'

export interface ExistingVsProposedAreaRow {
  area: string
  existingProject: string
  proposedProject: string
  documentationStatus: 'Documented' | 'Not documented' | 'Proposed Addition'
}

export interface ActualDifferenceBreakdown {
  whatOriginalTeamDeveloped: string
  whatStudentWantsToAdd: string[]
  alreadyPresent: string[]
  genuinelyAdditional: string[]
  modificationsOfExisting: string[]
  needsClarificationOrUndocumented: string[]
}

export interface DifferentiatedFeatureAssessment {
  featureName: string
  alreadyPresentInPrevious: boolean
  solvesDifferentProblem: boolean
  meaningfullyImprovesExisting: boolean
  justTechnologyReplacement: boolean
  introducesMeasurableValue: boolean
  necessaryForCore: boolean
  feasibleWithinResources: boolean
  classification: DifferentiationClassification
  academicClassification: AcademicFeatureTier
  purpose: string
  problemItSolves: string
  expectedBenefit: string
  technicalApproach: string
  requiredTechOrData: string[]
  complexity: 'Low' | 'Medium' | 'High' | 'Very High'
  miniProjectFeasibility: string
  dependenciesAndLimitations: string
  honestRationale: string
  simplerAlternative?: string
}

export interface FeasibilitySummary {
  constraintsProvided: {
    teamSize?: number
    developmentWeeks?: number
    technicalExperience?: string
    hardware?: string
    datasets?: string
    budget?: string
  }
  missingConstraintsNotice?: string
  overallFeasibility: 'Realistic Scope' | 'Needs Scope Narrowing' | 'High Risk Within Current Constraints'
  integrationAndMaintenanceNotes: string[]
  recommendedCoreScope: string[]
  simplerAlternatives: string[]
}

export interface StructuredComparisonReport {
  A_proposedProject: {
    title: string
    description: string
    problemSummary: string
    proposedFeatures: string[]
    technologies: string[]
  }
  B_relevantPreviousProjects: Array<{
    projectId: string
    title: string
    academicYear: string
    batch: string
    department: string
    sourceUrl: string
    recordBasis: 'APPROVED_COLLEGE_REPOSITORY'
    classification: string
    missingDocumentation: string[]
  }>
  C_projectByProjectComparisons: ProjectByProjectComparison[]
  D_commonFunctionality: string[]
  E_meaningfulDifferences: string[]
  F_documentedLimitations: Array<{
    projectId: string
    projectTitle: string
    academicYear: string
    limitations: string[]
    documentationNote: string
  }>
  G_potentialResearchGaps: IdentifiedResearchGap[]
  H_recommendedImprovements: string[]
  I_featureFeasibilityAssessment: {
    featureAssessments: DifferentiatedFeatureAssessment[]
    feasibility: FeasibilitySummary
  }
  J_suggestedProjectContribution: string
  K_nextQuestionForStudent: string
  existingVsProposedTable: ExistingVsProposedAreaRow[]
  actualDifferenceBreakdown: ActualDifferenceBreakdown
  contributionAssessment: {
    contributionType: ContributionCategoryType
    reasoning: string
  }
  scopeRecommendation: {
    mustHave: string[]
    optional: string[]
    postpone: string[]
    confirmationPrompt: string
  }
  collectiveSynthesis: CollectiveSynthesis
  noveltyDisclaimer: string
  renderedMarkdown: string
}

export interface ComparisonDecisionRecord {
  gapId?: string
  improvementTitle: string
  decision: 'ACCEPTED' | 'DEFERRED' | 'REJECTED'
  notes?: string
  decidedAt: Date
}

export interface IComparisonSession {
  id: string
  ownerId: string
  conversationId?: string
  proposedTitle: string
  proposedDescription: string
  proposedFeatures: string[]
  proposedTechnologies: string[]
  constraintsSnapshot: Record<string, any>
  retrievedProjectIds: string[]
  report: StructuredComparisonReport
  studentDecisions: ComparisonDecisionRecord[]
  finalContributionStatement?: string
  version: number
  createdAt: Date
  updatedAt: Date
}
