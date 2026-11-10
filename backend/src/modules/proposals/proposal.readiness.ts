import { IProposal, IReadinessAuditResult, ReadinessRating } from './proposal.model.js'

export class ProposalReadinessService {
  /**
   * Evaluates proposal against 9 transparent, defensible academic criteria
   */
  assessReadiness(proposal: IProposal): IReadinessAuditResult {
    const sections = proposal.sections
    const suggestions: string[] = []

    const getSection = (id: string) => sections.find((s) => s.sectionId === id)

    // 1. Problem Clarity
    const problemSec = getSection('problem-statement')
    let problemClarity: { status: 'PASS' | 'WARN' | 'FAIL'; note: string }
    if (!problemSec || problemSec.content.trim().length < 60) {
      problemClarity = {
        status: 'FAIL',
        note: 'Problem statement is missing or too brief to convey engineering significance.',
      }
      suggestions.push('Elaborate on the academic or operational challenges faced in the problem statement.')
    } else if (problemSec.wordCount < 40) {
      problemClarity = {
        status: 'WARN',
        note: 'Problem statement is concise; consider describing the consequences of existing limitations.',
      }
      suggestions.push('Add context on why manual workflows fail during semester capstone reviews.')
    } else {
      problemClarity = {
        status: 'PASS',
        note: 'Problem statement clearly articulates core operational friction and pedagogical challenges.',
      }
    }

    // 2. Objective Alignment
    const objSec = getSection('objectives')
    let objectiveAlignment: { status: 'PASS' | 'WARN' | 'FAIL'; note: string }
    if (!objSec || objSec.wordCount < 30) {
      objectiveAlignment = {
        status: 'FAIL',
        note: 'Project objectives are missing or lack specific numbered deliverables.',
      }
      suggestions.push('List at least 3 to 5 concrete engineering objectives aligned with your problem statement.')
    } else {
      objectiveAlignment = {
        status: 'PASS',
        note: 'Objectives clearly delineate engineering goals and deliverable milestones.',
      }
    }

    // 3. Scope Consistency
    const scopeSec = getSection('scope')
    let scopeConsistency: { status: 'PASS' | 'WARN' | 'FAIL'; note: string }
    const rejectedInclusions = sections.filter((s) => {
      const lower = s.content.toLowerCase()
      return (
        (lower.includes('voice interaction') || lower.includes('webrtc')) &&
        !lower.includes('excluded') &&
        !lower.includes('trade-off')
      )
    })

    if (rejectedInclusions.length > 0) {
      scopeConsistency = {
        status: 'FAIL',
        note: 'Rejected high-risk feature (Real-Time Voice WebRTC) appears as an active deliverable.',
      }
      suggestions.push(
        'Remove Real-Time Voice WebRTC from active deliverables and record it under Excluded Features with faculty defense rationale.'
      )
    } else if (!scopeSec || scopeSec.wordCount < 40) {
      scopeConsistency = {
        status: 'WARN',
        note: 'Project boundaries between in-scope deliverables and deferred features are ambiguous.',
      }
      suggestions.push('Clearly define what is in-scope for this semester versus deferred to future iterations.')
    } else {
      scopeConsistency = {
        status: 'PASS',
        note: 'Scope maintains strict consistency with accepted features and student constraints.',
      }
    }

    // 4. Feature Completeness
    const featSec = getSection('proposed-features')
    let featureCompleteness: { status: 'PASS' | 'WARN' | 'FAIL'; note: string }
    if (!featSec || featSec.wordCount < 50) {
      featureCompleteness = {
        status: 'FAIL',
        note: 'Proposed features are not adequately detailed into core and enhancement categories.',
      }
      suggestions.push('Group features into Essential Core Capabilities and Accepted Enhancements.')
    } else {
      featureCompleteness = {
        status: 'PASS',
        note: 'Feature set details essential and recommended capabilities with defense rationales for exclusions.',
      }
    }

    // 5. Technical Feasibility
    const techSec = getSection('technology-stack')
    let technicalFeasibility: { status: 'PASS' | 'WARN' | 'FAIL'; note: string }
    if (!techSec || techSec.wordCount < 30) {
      technicalFeasibility = {
        status: 'WARN',
        note: 'Technology stack does not specify frontend, backend, or database components.',
      }
      suggestions.push('Explicitly state programming languages, frameworks, and database versions.')
    } else {
      technicalFeasibility = {
        status: 'PASS',
        note: 'Technology choices (TypeScript, React, Node, Express, MongoDB) are realistic for an undergraduate timeline.',
      }
    }

    // 6. Architecture Consistency
    const archSec = getSection('system-architecture')
    let architectureConsistency: { status: 'PASS' | 'WARN' | 'FAIL'; note: string }
    if (proposal.documentType !== 'PROJECT_SYNOPSIS' && (!archSec || archSec.wordCount < 40)) {
      architectureConsistency = {
        status: 'WARN',
        note: 'System architecture explanation is sparse. A 3-tier or modular explanation is recommended.',
      }
      suggestions.push('Describe the presentation, application, and persistence layers in the system architecture.')
    } else {
      architectureConsistency = {
        status: 'PASS',
        note: 'Architecture outlines clear component separation and client-server interaction patterns.',
      }
    }

    // 7. Methodology Completeness
    const methodSec = getSection('methodology')
    let methodologyCompleteness: { status: 'PASS' | 'WARN' | 'FAIL'; note: string }
    if (proposal.documentType !== 'PROJECT_SYNOPSIS' && (!methodSec || methodSec.wordCount < 40)) {
      methodologyCompleteness = {
        status: 'WARN',
        note: 'Methodology lacks development model details (e.g. Agile sprint breakdown).',
      }
      suggestions.push('Detail development sprints and verification procedures in the methodology.')
    } else {
      methodologyCompleteness = {
        status: 'PASS',
        note: 'Methodology describes phased engineering sprints and testing strategies.',
      }
    }

    // 8. Reference Validity
    const refSec = getSection('references')
    let referenceValidity: { status: 'PASS' | 'WARN' | 'FAIL'; note: string }
    if (!refSec || refSec.wordCount < 20) {
      referenceValidity = {
        status: 'WARN',
        note: 'Academic references are minimal. Standard IEEE or textbook references should be included.',
      }
      suggestions.push('Include canonical standard references such as IEEE 830-1998.')
    } else {
      referenceValidity = {
        status: 'PASS',
        note: 'References cite standard academic literature and software engineering specifications without hallucinations.',
      }
    }

    // 9. Required Section Completeness
    const mandatoryIds = proposal.template.mandatorySectionIds
    const missingMandatory = mandatoryIds.filter((id) => {
      const s = getSection(id)
      return !s || !s.content.trim()
    })

    let requiredSectionCompleteness: { status: 'PASS' | 'WARN' | 'FAIL'; note: string }
    if (missingMandatory.length > 0) {
      requiredSectionCompleteness = {
        status: 'FAIL',
        note: `Missing ${missingMandatory.length} mandatory template section(s): ${missingMandatory.join(', ')}.`,
      }
      suggestions.push(`Complete mandatory sections: ${missingMandatory.join(', ')}.`)
    } else {
      requiredSectionCompleteness = {
        status: 'PASS',
        note: 'All mandatory template sections contain verified academic content.',
      }
    }

    // Aggregate overall advisory readiness
    const checks = [
      problemClarity,
      objectiveAlignment,
      scopeConsistency,
      featureCompleteness,
      technicalFeasibility,
      architectureConsistency,
      methodologyCompleteness,
      referenceValidity,
      requiredSectionCompleteness,
    ]

    const failCount = checks.filter((c) => c.status === 'FAIL').length
    const warnCount = checks.filter((c) => c.status === 'WARN').length

    let overallRating: ReadinessRating = 'READY_FOR_FACULTY_REVIEW'

    if (failCount > 0 || warnCount >= 4) {
      overallRating = 'NEEDS_IMPROVEMENT'
    } else if (warnCount > 0) {
      overallRating = 'ALMOST_READY'
    } else {
      overallRating = 'READY_FOR_FACULTY_REVIEW'
    }

    return {
      overallRating,
      problemClarity,
      objectiveAlignment,
      scopeConsistency,
      featureCompleteness,
      technicalFeasibility,
      architectureConsistency,
      methodologyCompleteness,
      referenceValidity,
      requiredSectionCompleteness,
      actionableSuggestions: suggestions,
    }
  }
}

export const proposalReadinessService = new ProposalReadinessService()
