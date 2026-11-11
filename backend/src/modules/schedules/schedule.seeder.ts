import { ScheduleTemplateRepository } from './schedule.model.js'
import type { ITemplateActivityDefault } from './schedule.types.js'

export const STANDARD_MINI_PROJECT_8W_CODE = 'STANDARD_MINI_PROJECT_8W'

export const STANDARD_MINI_PROJECT_8W_ACTIVITIES: ITemplateActivityDefault[] = [
  {
    sequenceNumber: 1,
    title: 'Project Title Selection',
    description:
      'Formulate the academic project title, define target beneficiary group, and confirm domain scope with the faculty guide.',
    suggestedDurationDays: 3,
    isMandatory: true,
    requiredDeliverables: 'Approved project title sheet with 1-paragraph scope summary and problem focus.',
    evidenceTypes: ['PDF_DOCUMENT', 'SUMMARY_NOTE'],
    weeklyUpdateRequired: true,
    studentUpdateInstructions:
      'Summarize finalized problem title, intended users, and faculty guide sign-off notes.',
  },
  {
    sequenceNumber: 2,
    title: 'Base Paper Selection',
    description:
      'Identify 2–3 peer-reviewed reference papers or college repository baselines grounding the methodology.',
    suggestedDurationDays: 3,
    isMandatory: true,
    requiredDeliverables: 'Selected IEEE/ACM base paper PDF(s) with key comparative takeaway summary.',
    evidenceTypes: ['PDF_DOCUMENT', 'SUMMARY_NOTE'],
    weeklyUpdateRequired: true,
    studentUpdateInstructions:
      'List selected base paper citation(s), core approach, and relevance to your mini-project.',
  },
  {
    sequenceNumber: 3,
    title: 'Existing System Analysis',
    description:
      'Analyze prior college implementations and existing commercial/manual workflows to document genuine gaps.',
    suggestedDurationDays: 4,
    isMandatory: true,
    requiredDeliverables: 'Comparative analysis table of existing systems, limitations, and proposed improvements.',
    evidenceTypes: ['PDF_DOCUMENT', 'SUMMARY_NOTE'],
    weeklyUpdateRequired: true,
    studentUpdateInstructions:
      'Highlight concrete limitations observed in prior systems and what your project improves.',
  },
  {
    sequenceNumber: 4,
    title: 'Technology Finalization',
    description:
      'Select realistic frontend, backend, database, and runtime libraries matched to team skill constraints.',
    suggestedDurationDays: 3,
    isMandatory: true,
    requiredDeliverables: 'Final technology stack matrix with version justification and environment prerequisites.',
    evidenceTypes: ['SUMMARY_NOTE', 'PDF_DOCUMENT'],
    weeklyUpdateRequired: true,
    studentUpdateInstructions:
      'Document finalized stack components, why each tool is needed, and local setup verification.',
  },
  {
    sequenceNumber: 5,
    title: 'UI/UX Design',
    description:
      'Design clean user flows, low-fidelity wireframes, and role-appropriate screen layouts prior to coding.',
    suggestedDurationDays: 4,
    isMandatory: true,
    requiredDeliverables: 'Wireframes or interactive Figma/screen mockups covering main student/faculty workflows.',
    evidenceTypes: ['DESIGN_FILE', 'PDF_DOCUMENT'],
    weeklyUpdateRequired: true,
    studentUpdateInstructions:
      'Share screen flow links or exported PDF frames plus responsiveness considerations.',
  },
  {
    sequenceNumber: 6,
    title: 'System Architecture and Database Design',
    description:
      'Define module boundaries, API contracts, authentication rules, and normalized MongoDB/relational schemas.',
    suggestedDurationDays: 4,
    isMandatory: true,
    requiredDeliverables: 'System architecture diagram, ER/schema definitions, and core API route specification.',
    evidenceTypes: ['PDF_DOCUMENT', 'DESIGN_FILE'],
    weeklyUpdateRequired: true,
    studentUpdateInstructions:
      'Submit architecture overview diagram, key collections/tables, and access control design notes.',
  },
  {
    sequenceNumber: 7,
    title: 'Initial Development',
    description:
      'Implement core backend APIs, persistent storage models, and primary functional UI modules end-to-end.',
    suggestedDurationDays: 8,
    isMandatory: true,
    requiredDeliverables: 'Working vertical slice committed to Git repository with core workflow running cleanly.',
    evidenceTypes: ['REPOSITORY_LINK', 'DEMO_VIDEO', 'SUMMARY_NOTE'],
    weeklyUpdateRequired: true,
    studentUpdateInstructions:
      'Share milestone commit/branch link, completed modules list, and known implementation blockers.',
  },
  {
    sequenceNumber: 8,
    title: 'Testing and Validation',
    description:
      'Execute integration tests, edge-case validation, security checks, and verify requirements against objectives.',
    suggestedDurationDays: 4,
    isMandatory: true,
    requiredDeliverables: 'Automated test run logs, defect checklist resolution summary, and validation results.',
    evidenceTypes: ['TEST_REPORT', 'REPOSITORY_LINK'],
    weeklyUpdateRequired: true,
    studentUpdateInstructions:
      'Report executed test cases, pass/fail outcomes, fixed defects, and remaining known risks.',
  },
  {
    sequenceNumber: 9,
    title: 'Documentation',
    description:
      'Compile project synopsis/report sections, setup instructions, architecture documentation, and user guide.',
    suggestedDurationDays: 4,
    isMandatory: true,
    requiredDeliverables: 'Formatted academic project report PDF/DOCX aligned with department guidelines.',
    evidenceTypes: ['PDF_DOCUMENT', 'REPOSITORY_LINK'],
    weeklyUpdateRequired: true,
    studentUpdateInstructions:
      'Confirm completed report chapters, verified screenshots, and repository README instructions.',
  },
  {
    sequenceNumber: 10,
    title: 'Final Demonstration and Submission',
    description:
      'Present working project demonstration, defend technical decisions in viva, and complete final archive handover.',
    suggestedDurationDays: 3,
    isMandatory: true,
    requiredDeliverables: 'Final presentation deck, live demonstration checklist, and final submission archive.',
    evidenceTypes: ['PRESENTATION_SLIDES', 'DEMO_VIDEO', 'REPOSITORY_LINK', 'PDF_DOCUMENT'],
    weeklyUpdateRequired: true,
    studentUpdateInstructions:
      'Upload final slide deck, verified repository link, and team viva preparation checklist.',
  },
]

export async function seedScheduleTemplates(): Promise<void> {
  const existing = await ScheduleTemplateRepository.findByCode(STANDARD_MINI_PROJECT_8W_CODE)
  if (existing) return

  await ScheduleTemplateRepository.createTemplateWithVersion({
    code: STANDARD_MINI_PROJECT_8W_CODE,
    name: 'Standard Mini Project — 8 Week Plan',
    description:
      'Reusable academic mini-project schedule structure covering problem selection, design, core build, validation, documentation, and final viva submission.',
    targetDurationWeeks: 8,
    changelog: 'Initial institutional release of the 10-stage 8-week academic mini-project schedule template.',
    activities: STANDARD_MINI_PROJECT_8W_ACTIVITIES,
    createdBy: 'system-seeder',
  })
}
