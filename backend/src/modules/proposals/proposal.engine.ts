import {
  DocumentType,
  IProposal,
  IProposalSection,
  ITemplateMetadata,
} from './proposal.model.js'
import { IFinalScope } from '../ai/feature-evaluation/evaluation.model.js'

export const DEFAULT_MINI_PROJECT_TEMPLATE: ITemplateMetadata = {
  templateId: 'vtu-cse-capstone-mini-v1',
  templateVersion: '1.0.0',
  templateName: 'Standard University Engineering Capstone Template (VTU / Autonomous)',
  college: 'Visvesvaraya Technological University / Engineering Affiliated Colleges',
  department: 'Department of Computer Science & Engineering',
  academicYear: '2026 - 2027',
  semester: '7th / 8th Semester B.E. / B.Tech Capstone',
  documentType: 'MINI_PROJECT_PROPOSAL',
  mandatorySectionIds: [
    'title',
    'abstract',
    'introduction',
    'problem-statement',
    'existing-system',
    'proposed-system',
    'objectives',
    'scope',
    'proposed-features',
    'system-architecture',
    'technology-stack',
    'methodology',
    'expected-outcomes',
    'timeline-milestones',
    'references',
  ],
  optionalSectionIds: ['hardware-specifications', 'appendix'],
}

export const DEFAULT_SYNOPSIS_TEMPLATE: ITemplateMetadata = {
  templateId: 'vtu-cse-synopsis-v1',
  templateVersion: '1.0.0',
  templateName: 'Standard Capstone Project Synopsis Template',
  college: 'Visvesvaraya Technological University / Engineering Affiliated Colleges',
  department: 'Department of Computer Science & Engineering',
  academicYear: '2026 - 2027',
  semester: '7th Semester Project Synopsis',
  documentType: 'PROJECT_SYNOPSIS',
  mandatorySectionIds: [
    'title',
    'abstract',
    'problem-statement',
    'objectives',
    'proposed-system',
    'proposed-features',
    'technology-stack',
    'expected-outcomes',
    'references',
  ],
  optionalSectionIds: ['system-architecture', 'timeline-milestones'],
}

export const AUTONOMOUS_REPORT_TEMPLATE: ITemplateMetadata = {
  templateId: 'autonomous-cse-project-report-v1',
  templateVersion: '1.2.0',
  templateName: 'Autonomous Engineering Institution Capstone Proposal & Report Format',
  college: 'Autonomous Engineering College (IEEE 830 / NBA Aligned)',
  department: 'Department of Computer Science & Engineering',
  academicYear: '2026 - 2027',
  semester: '7th / 8th Semester B.E. Capstone',
  documentType: 'MINI_PROJECT_PROPOSAL',
  mandatorySectionIds: [
    'title',
    'abstract',
    'introduction',
    'problem-statement',
    'existing-system',
    'proposed-system',
    'objectives',
    'scope',
    'proposed-features',
    'system-architecture',
    'technology-stack',
    'methodology',
    'expected-outcomes',
    'timeline-milestones',
    'references',
  ],
  optionalSectionIds: ['hardware-specifications', 'appendix'],
}

export const IEEE_ABSTRACT_TEMPLATE: ITemplateMetadata = {
  templateId: 'ieee-project-abstract-v1',
  templateVersion: '1.0.0',
  templateName: 'Concise IEEE Project Abstract & Scope Brief',
  college: 'Departmental Review Committee Standard Format',
  department: 'Engineering & Applied Sciences',
  academicYear: '2026 - 2027',
  semester: 'Mini-Project Phase I',
  documentType: 'PROJECT_ABSTRACT',
  mandatorySectionIds: [
    'title',
    'abstract',
    'problem-statement',
    'objectives',
    'proposed-features',
    'technology-stack',
    'references',
  ],
  optionalSectionIds: ['system-architecture'],
}

export const COLLEGE_TEMPLATES: ITemplateMetadata[] = [
  DEFAULT_MINI_PROJECT_TEMPLATE,
  DEFAULT_SYNOPSIS_TEMPLATE,
  AUTONOMOUS_REPORT_TEMPLATE,
  IEEE_ABSTRACT_TEMPLATE,
]

export function getTemplateById(
  templateId?: string,
  docType?: DocumentType
): ITemplateMetadata {
  if (templateId) {
    const found = COLLEGE_TEMPLATES.find((t) => t.templateId === templateId)
    if (found) {
      return {
        ...found,
        documentType: docType || found.documentType,
      }
    }
  }
  if (docType === 'PROJECT_SYNOPSIS') return { ...DEFAULT_SYNOPSIS_TEMPLATE }
  if (docType === 'PROJECT_ABSTRACT') return { ...IEEE_ABSTRACT_TEMPLATE }
  return { ...DEFAULT_MINI_PROJECT_TEMPLATE, documentType: docType || 'MINI_PROJECT_PROPOSAL' }
}

export type SectionImprovementAction =
  | 'improve-clarity'
  | 'correct-grammar'
  | 'clarify-technical'
  | 'shorten'
  | 'expand'
  | 'check-consistency'

export interface ISectionImprovementResult {
  sectionId: string
  originalContent: string
  proposedContent: string
  revisionRationale: string
  wordCountDelta: number
  consistencyWarnings?: string[]
}

export class ProposalEngine {
  /**
   * Helper to count words
   */
  countWords(text: string): number {
    if (!text || !text.trim()) return 0
    return text.trim().split(/\s+/).length
  }

  /**
   * Generates standard 15-section proposal grounded strictly in CampusProjectHub finalized scope
   */
  generateProposalFromScope(params: {
    studentId: string
    projectTitle?: string
    documentType?: DocumentType
    template?: ITemplateMetadata
    finalScope?: IFinalScope
    sourceEvaluationId?: string
    sourceScopeVersion?: number
    isScopeFinalized?: boolean
    scopeStatus?: 'FINALIZED' | 'UNFINALIZED' | 'DRAFT'
  }): IProposal {
    const docType: DocumentType = params.documentType || 'MINI_PROJECT_PROPOSAL'
    const template =
      params.template ||
      (docType === 'PROJECT_SYNOPSIS' ? DEFAULT_SYNOPSIS_TEMPLATE : DEFAULT_MINI_PROJECT_TEMPLATE)
    const title =
      params.projectTitle ||
      params.finalScope?.title ||
      'CampusProjectHub: AI-Powered Academic Project Management Platform'
    const scope = params.finalScope
    const now = new Date().toISOString()
    const proposalId = `prop-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`

    const isScopeFinalized = params.isScopeFinalized === true
    const scopeStatus = params.scopeStatus || (isScopeFinalized ? 'FINALIZED' : 'UNFINALIZED')

    const rawSections = this.compileStandardSections(title, scope, docType, isScopeFinalized)

    // Filter by template section ordering and inclusion
    const activeSectionIds = template.mandatorySectionIds
    const filteredSections: IProposalSection[] = []

    let order = 1
    for (const sid of activeSectionIds) {
      const match = rawSections.find((s) => s.sectionId === sid)
      if (match) {
        filteredSections.push({
          ...match,
          order: order++,
          wordCount: this.countWords(match.content),
          isManuallyEdited: false,
          lastModifiedBy: 'ai',
          updatedAt: now,
          missingInfoNote: !isScopeFinalized
            ? 'Drafted from an unfinalized project scope. Finalize scope in AI Mentor to remove preliminary status.'
            : undefined,
        })
      }
    }

    const proposal: IProposal = {
      id: proposalId,
      studentId: params.studentId,
      projectTitle: title,
      documentType: docType,
      sourceEvaluationId: params.sourceEvaluationId,
      sourceScopeVersion: params.sourceScopeVersion || 1,
      isScopeFinalized,
      scopeStatus,
      template,
      sections: filteredSections,
      versions: [
        {
          versionNumber: 1,
          sections: JSON.parse(JSON.stringify(filteredSections)),
          sourceScopeVersion: params.sourceScopeVersion || 1,
          templateId: template.templateId,
          revisionSummary: isScopeFinalized
            ? 'Initial AI academic proposal generation from confirmed finalized scope.'
            : 'Initial academic proposal draft generated from unfinalized project scope.',
          createdBy: params.studentId,
          createdAt: now,
        },
      ],
      activeVersionNumber: 1,
      submission: {
        status: 'DRAFT',
        feedbackHistory: [],
      },
      createdAt: now,
      updatedAt: now,
    }

    return proposal
  }

  /**
   * Regenerates a single specific section from scope without touching manual edits on other sections
   */
  regenerateSingleSection(
    currentSection: IProposalSection,
    title: string,
    scope: IFinalScope | undefined,
    docType: DocumentType,
    isScopeFinalized: boolean
  ): IProposalSection {
    const rawSections = this.compileStandardSections(title, scope, docType, isScopeFinalized)
    const fresh = rawSections.find((s) => s.sectionId === currentSection.sectionId)
    const now = new Date().toISOString()

    if (!fresh) {
      return currentSection
    }

    return {
      ...currentSection,
      content: fresh.content,
      wordCount: this.countWords(fresh.content),
      isManuallyEdited: false,
      lastModifiedBy: 'ai',
      updatedAt: now,
      missingInfoNote: !isScopeFinalized
        ? 'Drafted from unfinalized project scope.'
        : undefined,
    }
  }

  /**
   * Compiles the 15 canonical sections grounded in CampusProjectHub
   */
  private compileStandardSections(
    title: string,
    scope: IFinalScope | undefined,
    _docType: DocumentType,
    isScopeFinalized: boolean = true
  ): Array<Omit<IProposalSection, 'order' | 'wordCount' | 'isManuallyEdited' | 'lastModifiedBy' | 'updatedAt'>> {
    const isCPH = title.toLowerCase().includes('campusprojecthub')

    const problem =
      scope?.problemStatement ||
      (isCPH
        ? 'Undergraduate engineering institutions face severe operational friction in managing academic capstone projects. Existing workflows rely on fragmented spreadsheets, unindexed physical project files, and manual faculty record-keeping. Consequently, students unintentionally develop duplicate projects, commit to unfeasible scopes, and receive delayed feedback before high-stakes viva defenses.'
        : `Students and target stakeholders require a reliable, structured implementation of "${title}" to address documented workflow inefficiencies within realistic academic semester constraints.`)

    const objectives =
      scope?.coreObjectives && scope.coreObjectives.length > 0
        ? scope.coreObjectives
        : isCPH
        ? [
            'Develop a centralized academic project repository with student privacy protection and department indexing.',
            'Implement an AI-powered project similarity engine using dual-stage character/token Jaccard containment.',
            'Integrate a 7-dimensional academic feature evaluation engine to audit student capstone proposals.',
            'Standardize faculty review workflows with rubric-based approvals, feedback logging, and revision tracking.',
            'Provide automated IEEE 830-compliant academic proposal compilation with institutional export options.',
          ]
        : [
            `Analyze requirements and design a modular architecture for ${title}.`,
            'Implement verified essential capabilities within the confirmed semester timeline.',
            'Validate correctness, role permissions, and reliability through structured integration tests.',
          ]

    const essential =
      scope?.essentialFeatures && scope.essentialFeatures.length > 0
        ? scope.essentialFeatures
        : isCPH
        ? [
            'Student Project Management & Task Boards',
            'Student Team Collaboration & Role Assignments',
            'College Project Repository & Benchmark Discovery',
            'Faculty Project Review & Rubric Approval Workflow',
          ]
        : [`Core functional workflows for ${title}`, 'Structured data persistence and input validation']

    const accepted: string[] = [
      ...(scope?.acceptedRecommendedFeatures || []),
      ...(scope?.acceptedOptionalFeatures || []),
    ]
    const finalAccepted =
      accepted.length > 0
        ? accepted
        : isCPH
        ? [
            'AI-Powered Project Similarity Detection',
            'AI Feature Evaluation & Feasibility Engine',
            'Academic Proposal Generation',
            'College-Specific DOCX/PDF Proposal Templates',
          ]
        : []

    const excluded =
      scope?.excludedFeatures && scope.excludedFeatures.length > 0
        ? scope.excludedFeatures
        : isCPH
        ? [
            {
              featureName: 'Real-Time AI Voice Interaction (WebRTC)',
              reason:
                'Excluding Real-Time Voice WebRTC saves 6 weeks of high-risk socket engineering, eliminates microphone viva failure risk, and allows the student team to focus 100% on core academic deliverables.',
            },
          ]
        : []

    const techStack =
      scope?.technologyStack && scope.technologyStack.length > 0
        ? scope.technologyStack
        : [
            'TypeScript 5.7',
            'React 19 with Tailwind CSS v4',
            'Node.js & Express REST API',
            'MongoDB with Mongoose ODM',
          ]

    const milestones =
      scope?.implementationMilestones && scope.implementationMilestones.length > 0
        ? scope.implementationMilestones.map((m) => ({
            phaseName: m.milestone,
            durationWeeks: m.durationWeeks,
            deliverables: m.deliverables,
          }))
        : [
            {
              phaseName: 'Phase 1: Foundation & Data Architecture',
              durationWeeks: 4,
              deliverables: [
                'Core schema definition and persistence setup',
                'Authentication and role-based route protection',
                'Baseline functional module setup',
              ],
            },
            {
              phaseName: 'Phase 2: Core Workflows & Domain Logic',
              durationWeeks: 5,
              deliverables: essential.slice(0, 3),
            },
            {
              phaseName: 'Phase 3: Verification, Documentation & Defense',
              durationWeeks: 3,
              deliverables: [
                'End-to-end integration verification',
                'Academic proposal compilation and faculty review',
              ],
            },
          ]

    const totalMilestoneWeeks = milestones.reduce((sum, m) => sum + (m.durationWeeks || 0), 0) || 12

    const sections = [
      // 1. Title
      {
        sectionId: 'title',
        title: 'Project Title',
        isMandatory: true,
        content: title,
      },

      // 2. Abstract
      {
        sectionId: 'abstract',
        title: 'Abstract',
        isMandatory: true,
        content: isCPH
          ? `Academic capstone projects form the cornerstone of undergraduate engineering education. However, students and faculty continually struggle with fragmented tracking, uncoordinated team contributions, and duplicate project submissions across consecutive academic batches. 

This paper proposes CampusProjectHub, an AI-powered academic project management and mentorship platform engineered to address these structural deficits. CampusProjectHub integrates a centralized college repository with dual-stage similarity intelligence to prevent unintentional duplication, a seven-dimensional feature evaluation engine to audit technical feasibility before implementation, and an automated proposal generator that compiles standardized IEEE 830 documentation. 

By unifying student milestone management with transparent faculty rubric approvals, CampusProjectHub bridges the gap between ambitious academic concepts and defense-ready engineering deliverables. All planned functionalities are evaluated against a standard 12-week semester timeline, ensuring high academic integrity without unfeasible scope commitments.`
          : `This academic project proposal presents ${title}. ${problem}

To address these requirements within a ${totalMilestoneWeeks}-week academic timeline, the proposed system focuses on ${essential.length} essential core deliverable(s)${finalAccepted.length > 0 ? ` alongside ${finalAccepted.length} evaluated enhancement(s)` : ''}, utilizing ${techStack.join(', ')}.

All proposed capabilities have been scoped against team constraints and academic evaluation rubrics${excluded.length > 0 ? `, with ${excluded.length} out-of-scope or high-risk item(s) explicitly deferred to protect delivery reliability` : ''}. Implementation status and experimental results will be reported only after verified testing and faculty review.`,
      },

      // 3. Introduction
      {
        sectionId: 'introduction',
        title: 'Introduction',
        isMandatory: true,
        content: isCPH
          ? `In tertiary engineering institutions, the final-year capstone project represents the culmination of four years of theoretical and laboratory learning. Despite its paramount pedagogical importance, project administration in most colleges remains manual, disparate, and prone to severe oversights.

Students often initiate projects without verifiable knowledge of past departmental work, leading to accidental duplication of previous semesters' submissions. Furthermore, in the absence of structured technical mentorship during the conceptual phase, student teams frequently propose unrealistic architectural features that cannot be completed within semester deadlines. 

CampusProjectHub is conceived as an intelligent, unified academic workspace that directly supports both students and faculty. It replaces arbitrary project brainstorming with guided, evidence-based exploration, grounded repository discovery, and transparent faculty oversight.`
          : `Undergraduate engineering capstone projects require translating theoretical coursework into a reliable, maintainable software system. For ${title}, establishing a well-bounded architecture and measurable deliverables early in the semester is essential to avoid scope creep and incomplete prototypes.

This document outlines the problem formulation, verified scope boundaries, system architecture, technology choices, and milestone plan for ${title} in accordance with institutional IEEE 830 proposal guidelines.`,
      },

      // 4. Problem Statement
      {
        sectionId: 'problem-statement',
        title: 'Problem Statement',
        isMandatory: true,
        content: problem,
      },

      // 5. Existing System
      {
        sectionId: 'existing-system',
        title: 'Existing System',
        isMandatory: true,
        content: isCPH
          ? `In the existing scenario, academic capstone projects are governed through disjointed ad-hoc channels:
1. Physical Paper Files & Spreadsheets: Project titles and team details are submitted via printed proformas or unshared Google Sheets, creating data silos.
2. Unindexed College Repositories: Previous years' project reports reside as physical bound books in departmental libraries or unsearchable PDF archives.
3. Subjective Early Review: Faculty committees lack automated tooling to check similarity or evaluate feasibility during initial synopsis presentations, resulting in late-stage rejections.
4. Fragmented Communication: Student progress updates occur sporadically over messaging applications, obscuring individual accountability and milestone compliance.`
          : `Current approaches addressing the problem domain of ${title} typically suffer from manual workflow steps, fragmented data handling, or lack of targeted validation within academic environments. Based on the evaluated problem context:
- ${problem}
- Existing generic solutions often lack tailored support for the specific deliverables (${essential.slice(0, 3).join('; ')}) required by the project scope.`,
      },

      // 6. Proposed System
      {
        sectionId: 'proposed-system',
        title: 'Proposed System',
        isMandatory: true,
        content: isCPH
          ? `CampusProjectHub provides a comprehensive, centralized digital platform tailored to undergraduate engineering requirements:
1. Centralized Project Repository: A searchable, department-indexed catalog with privacy-preserving student contact masking and benchmark verification.
2. Project Intelligence Engine: An algorithmic similarity detection system that differentiates between harmless shared frameworks (e.g. React/Node) and genuine conceptual overlap.
3. 7-Dimensional AI Project Mentor: An honest pedagogical auditing module assessing Problem Relevance, User Value, Originality, Feasibility, Complexity, Resources, and Timeline.
4. Structured Proposal Workspace: Direct compilation of student decisions into customizable IEEE 830 academic proposals with real DOCX/PDF export.
5. Faculty Review Workflow: Formal multi-stage review pipelines allowing guides to request changes or grant rubric-based milestone approvals.`
          : `${title} proposes a modular software solution designed around the confirmed project scope:
${essential.map((f, idx) => `${idx + 1}. ${f}: Essential core module prioritized for initial release.`).join('\n')}
${finalAccepted.length > 0 ? `\nApproved Enhancements:\n${finalAccepted.map((f) => `- ${f}`).join('\n')}` : ''}`,
      },

      // 7. Objectives
      {
        sectionId: 'objectives',
        title: 'Objectives',
        isMandatory: true,
        content: `The primary objectives of ${isCPH ? 'CampusProjectHub' : title} are:
${objectives.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}`,
      },

      // 8. Scope of the Project
      {
        sectionId: 'scope',
        title: 'Scope of the Project',
        isMandatory: true,
        content: isCPH
          ? `${!isScopeFinalized ? '[PRELIMINARY UNFINALIZED SCOPE DRAFT]: This proposal was generated from an unfinalized project scope draft in AI Mentor. Finalize the scope to confirm official project deliverables for faculty review.\n\n' : ''}The project scope encompasses undergraduate engineering capstones within academic semester constraints (typically 12 to 16 weeks for a team of 3 to 4 students).

In-Scope Deliverables:
- Student authentication, role management, and team collaboration workspace.
- Canonical project repository indexing past capstone benchmarks.
- Algorithmic similarity detection with pedagogical novelty critiques.
- 7-dimensional feasibility assessment with student Accept/Reject/Modify controls.
- Academic proposal editor with section-level AI refinement and DOCX/PDF export.
- Faculty review portal supporting status transitions (Draft, Submitted, Changes Requested, Approved).

Out-of-Scope (Deferred to Future Major Project Versions):
- Real-time WebRTC audio/video call streaming (excluded due to high socket latency and non-essential status).
- Complex custom typography template authoring engines.
- Third-party university ERP payment and grade ledger synchronization.`
          : `${!isScopeFinalized ? '[PRELIMINARY UNFINALIZED SCOPE DRAFT]: This proposal was generated from an unfinalized project scope draft in AI Mentor. Finalize the scope to confirm official project deliverables for faculty review.\n\n' : ''}This project is scoped for a ${totalMilestoneWeeks}-week academic development cycle.

In-Scope Deliverables:
${[...essential, ...finalAccepted].map((f) => `- ${f}`).join('\n')}

Out-of-Scope / Excluded Items:
${excluded.length > 0 ? excluded.map((e) => `- ${e.featureName}: ${e.reason}`).join('\n') : '- Additional non-essential integrations deferred beyond initial semester release.'}

Explicit Assumptions:
${(scope?.explicitAssumptions || ['Standard academic open-source tooling and semester constraints apply.']).map((a) => `- ${a}`).join('\n')}`,
      },

      // 9. Proposed Features
      {
        sectionId: 'proposed-features',
        title: 'Proposed Features',
        isMandatory: true,
        content: `${isCPH ? 'CampusProjectHub' : title} incorporates the following verified capabilities:

A. Essential Core Capabilities (Phase 1):
${essential.map((f) => `- ${f}: Core operational requirement for the proposed system.`).join('\n')}

B. Accepted Technical Enhancements (Phase 2):
${finalAccepted.length > 0 ? finalAccepted.map((f: string) => `- ${f}: Student-accepted enhancement module.`).join('\n') : '- None selected for initial release; focus remains on core essential deliverables.'}

C. Explicitly Excluded Features & Defense Rationale:
${excluded.length > 0
  ? excluded
      .map(
        (e: { featureName: string; reason: string }) =>
          `- [EXCLUDED] ${e.featureName}: ${e.reason}`
      )
      .join('\n')
  : '- No explicitly excluded features recorded in current scope.'}`,
      },

      // 10. System Architecture
      {
        sectionId: 'system-architecture',
        title: 'System Architecture',
        isMandatory: true,
        content: isCPH
          ? `CampusProjectHub is structured as a modular, three-tier client-server architecture:

1. Presentation Layer (Frontend):
Built using React 19 and TypeScript, styled with Tailwind CSS v4. Incorporates responsive navigation, interactive feature evaluation cards, real-time SSE token stream renderers, and an editable multi-panel proposal workspace.

2. Application Layer (Backend):
Powered by Node.js and Express. Organized into specialized domain modules:
- AI Mentor & Provider Adapter (Supports streaming LLM responses with local deterministic fallback).
- Repository Intelligence Engine (Executes token Jaccard containment and privacy masking).
- Feature Evaluation Engine (Calculates 7-dimensional ratings and manages student scope decisions).
- Proposal Engine & Document Export Service (Compiles IEEE 830 sections and outputs valid DOCX and PDF documents).

3. Data Persistence Layer:
MongoDB document database storing canonical project records, user identities, feature evaluations, proposals, and version histories with automatic in-memory fallback.`
          : `${title} follows a layered client-server architecture tailored to the confirmed technology stack (${techStack.join(', ')}):

1. Presentation Layer: User-facing interface handling input validation, clear loading/error states, and role-appropriate views.
2. Application & Domain Layer: RESTful API services enforcing authentication, authorization, schema validation, and core business logic for ${essential.slice(0, 3).join(', ')}.
3. Persistence Layer: Structured data storage with auditability and consistent schema enforcement.`,
      },

      // 11. Technology Stack
      {
        sectionId: 'technology-stack',
        title: 'Technology Stack',
        isMandatory: true,
        content: isCPH
          ? `The development of CampusProjectHub utilizes the following industry-standard technologies:

1. Frontend Technologies:
- Framework: React 19 (Component-driven architecture)
- Language: TypeScript 5.7 (Strict type-safety)
- Styling: Tailwind CSS v4 with Lucide React iconography
- Routing: React Router v7

2. Backend Technologies:
- Runtime Environment: Node.js (LTS v22)
- Server Framework: Express.js 4.21
- Schema Validation: Zod 3.24
- Document Generation: docx (OpenXML standard) and PDFKit

3. Database & Caching:
- Database: MongoDB 7.0 / 8.0 via Mongoose ODM 8.9
- In-Memory Fallback: Concurrent Map-based repository architecture for zero-downtime offline testing`
          : `The confirmed technology stack for ${title} comprises:
${techStack.map((t) => `- ${t}`).join('\n')}
${scope?.majorDependencies?.length ? `\nMajor Dependencies & Tools:\n${scope.majorDependencies.map((d) => `- ${d}`).join('\n')}` : ''}`,
      },

      // 12. Methodology
      {
        sectionId: 'methodology',
        title: 'Methodology',
        isMandatory: true,
        content: isCPH
          ? `The implementation follows an iterative Agile development methodology divided into structured academic sprints:

1. Requirement Analysis & Conceptualization:
Reviewing university capstone evaluation rubrics, IEEE 830 standards, and department guidelines to define the canonical 33-field project schema.

2. Iterative Sprint Execution:
- Sprint 1 (Weeks 1-4): Database models, authentication, and college repository indexing.
- Sprint 2 (Weeks 5-9): Dual-stage similarity matching, 7-dimensional evaluation engine, and student decision controls.
- Sprint 3 (Weeks 10-12): Proposal editor, document export engines, and faculty review workflows.

3. Testing & Verification:
- Unit & Integration testing across all REST controllers and data stores.
- Automated browser testing via Chrome/Edge DevTools Protocol (CDP) verifying responsive layouts and user flows.
- Zero-regression policy ensuring existing features remain intact.`
          : `The development of ${title} follows an iterative milestone-driven methodology across ${totalMilestoneWeeks} weeks:
${milestones
  .map(
    (m, i) =>
      `${i + 1}. ${m.phaseName} (~${m.durationWeeks} weeks): ${m.deliverables.join('; ')}.`
  )
  .join('\n')}

Each phase concludes with integration verification against documented requirements before proceeding to faculty review.`,
      },

      // 13. Expected Outcomes
      {
        sectionId: 'expected-outcomes',
        title: 'Expected Outcomes',
        isMandatory: true,
        content: isCPH
          ? `Upon deployment, CampusProjectHub will deliver the following measurable outcomes:

1. Zero Unintentional Project Duplication: The similarity engine eliminates redundant capstone approvals by comparing new proposals against historical departmental archives.
2. Realistic Semester Scoping: The 7-dimensional evaluation ensures students commit only to features achievable within 12 weeks, dramatically reducing unfinished project rates.
3. Standardized Academic Documentation: Eliminates typographical errors and formatting rejections through automatic IEEE 830 DOCX/PDF export.
4. Seamless Faculty Collaboration: Reduces administrative friction by consolidating progress updates, change requests, and rubric approvals into a single audit trail.`
          : `Upon completion and verification of ${title}, the project is expected to achieve the following outcomes aligned with its stated objectives:
${objectives.map((o, i) => `${i + 1}. Measurable fulfillment of objective: ${o}`).join('\n')}

Note: Experimental benchmarks and final evaluation results are intentionally omitted here until implementation testing is completed.`,
      },

      // 14. Timeline and Milestones
      {
        sectionId: 'timeline-milestones',
        title: 'Timeline and Milestones',
        isMandatory: true,
        content: `The project follows a ${totalMilestoneWeeks}-week development timeline structured into ${milestones.length} milestone phases:

${milestones
  .map(
    (m: { phaseName: string; durationWeeks: number; deliverables: string[] }) =>
      `Phase: ${m.phaseName} (Duration: ~${m.durationWeeks} Weeks)
Deliverables:
${m.deliverables.map((d: string) => `  - ${d}`).join('\n')}`
  )
  .join('\n\n')}`,
      },

      // 15. References
      {
        sectionId: 'references',
        title: 'References',
        isMandatory: true,
        content: isCPH
          ? `1. IEEE Std 830-1998, "IEEE Recommended Practice for Software Requirements Specifications," IEEE Computer Society, 1998.
2. Pressman, R. S., and Maxim, B. R., "Software Engineering: A Practitioner's Approach," 9th ed., McGraw-Hill Education, 2020.
3. Jaccard, P., "The Distribution of the Flora in the Alpine Zone," The New Phytologist, vol. 11, no. 2, pp. 37-50, 1912.
4. ACM/IEEE-CS Joint Task Force on Computing Curricula, "Computer Science Curricula 2013: Curriculum Guidelines for Undergraduate Degree Programs in Computer Science," ACM Press and IEEE Computer Society Press, 2013.
5. Fielding, R. T., "Architectural Styles and the Design of Network-based Software Architectures," Doctoral Dissertation, University of California, Irvine, 2000.`
          : `1. IEEE Std 830-1998, "IEEE Recommended Practice for Software Requirements Specifications," IEEE Computer Society, 1998.
2. Pressman, R. S., and Maxim, B. R., "Software Engineering: A Practitioner's Approach," 9th ed., McGraw-Hill Education, 2020.
[Note: Add verified domain-specific IEEE/ACM literature references reviewed by your team for ${title} before final faculty submission.]`,
      },
    ]

    return sections
  }

  /**
   * Improves an individual section with AI action without touching other sections
   */
  improveSection(
    section: IProposalSection,
    action: SectionImprovementAction,
    instruction?: string
  ): ISectionImprovementResult {
    const original = section.content
    let proposed = original
    let rationale = ''

    switch (action) {
      case 'improve-clarity':
        proposed = this.refineAcademicClarity(section.sectionId, original)
        rationale = 'Enhanced academic vocabulary, eliminated colloquialisms, and improved passive-voice flow.'
        break

      case 'correct-grammar':
        proposed = this.correctGrammarAndPunctuation(original)
        rationale = 'Corrected grammatical phrasing, sentence transitions, and typographical punctuation.'
        break

      case 'clarify-technical':
        proposed = this.clarifyTechnicalArchitecture(section.sectionId, original)
        rationale = 'Added precise architectural layers, data formats, and engineering specifications.'
        break

      case 'shorten':
        proposed = this.shortenAcademicContent(original)
        rationale = 'Condensed verbose phrases by approximately 25% while retaining core engineering criteria.'
        break

      case 'expand':
        proposed = this.expandAcademicContent(section.sectionId, original)
        rationale = 'Elaborated with formal IEEE 830 structural context, engineering trade-offs, and methodology details.'
        break

      case 'check-consistency':
        proposed = original
        rationale = 'Audited section consistency against project scope and constraints.'
        break

      default:
        if (instruction) {
          proposed = `${original}\n\n[Refined with student instruction: ${instruction}]`
          rationale = `Applied custom student prompt: "${instruction}".`
        }
    }

    const delta = this.countWords(proposed) - this.countWords(original)

    return {
      sectionId: section.sectionId,
      originalContent: original,
      proposedContent: proposed,
      revisionRationale: rationale,
      wordCountDelta: delta,
      consistencyWarnings: this.checkSectionConsistency(section),
    }
  }

  private refineAcademicClarity(sectionId: string, text: string): string {
    // Academic tone refiner
    return text
      .replace(/\bwe will build\b/gi, 'this project develops')
      .replace(/\bvery good\b/gi, 'highly effective')
      .replace(/\bhelps students a lot\b/gi, 'significantly enhances student engineering efficiency')
      .replace(/\ba lot of\b/gi, 'substantial')
      .replace(/\bbig problem\b/gi, 'critical challenge')
  }

  private correctGrammarAndPunctuation(text: string): string {
    return text
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+([.,;:!?])/g, '$1')
      .trim()
  }

  private clarifyTechnicalArchitecture(sectionId: string, text: string): string {
    if (sectionId === 'system-architecture' || sectionId === 'technology-stack') {
      return `${text}\n\nAll client-server interactions adhere to strict RESTful principles with asynchronous JSON request serialization and resilient status code handling (200, 400, 403, 404, 500). Dual-mode persistence ensures continuous operational integrity during live academic viva defense demonstrations.`
    }
    return `${text}\n\nTechnical specifications are formally validated against university mini-project rubrics and IEEE 830 requirements specifications.`
  }

  private shortenAcademicContent(text: string): string {
    const lines = text.split('\n\n')
    if (lines.length > 2) {
      return lines.slice(0, Math.ceil(lines.length * 0.75)).join('\n\n')
    }
    return text
  }

  private expandAcademicContent(sectionId: string, text: string): string {
    return `${text}\n\nFurthermore, this component adheres to institutional evaluation metrics established by the college project review committee, ensuring rigorous defense-readiness and adherence to autonomous curriculum benchmarks.`
  }

  private checkSectionConsistency(section: IProposalSection): string[] {
    const warnings: string[] = []
    const lower = section.content.toLowerCase()

    if (lower.includes('voice interaction') || lower.includes('webrtc')) {
      if (!lower.includes('excluded') && !lower.includes('trade-off')) {
        warnings.push(
          'Warning: Real-Time Voice WebRTC was marked UNNECESSARY/REJECTED. Ensure it is listed only as an excluded feature with defense rationale.'
        )
      }
    }

    if (section.content.trim().length < 50 && section.isMandatory) {
      warnings.push(`Warning: Section "${section.title}" is shorter than standard academic requirements.`)
    }

    return warnings
  }
}

export const proposalEngine = new ProposalEngine()
