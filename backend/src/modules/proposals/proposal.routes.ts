import { Router } from 'express'
import { proposalController } from './proposal.controller.js'
import { authenticate, requireRole } from '../../middleware/auth.middleware.js'

const router = Router()

router.use(authenticate)

// College template catalog (Admin-managed, readable by all authenticated users)
router.get('/templates', proposalController.listTemplates)
router.post('/templates', requireRole('admin'), proposalController.adminUpsertTemplate)
router.delete('/templates/:templateId', requireRole('admin'), proposalController.adminDeleteTemplate)

// Proposal lifecycle
router.post('/generate', proposalController.generate)
router.get('/', proposalController.list)
router.get('/:proposalId', proposalController.getById)
router.patch('/:proposalId/template', proposalController.updateTemplate)

// Draft Autosave
router.put('/:proposalId/draft', proposalController.saveDraft)

// Section-level editing, AI improvement, regeneration, and customization
router.patch('/:proposalId/sections/:sectionId', proposalController.updateSection)
router.post('/:proposalId/sections/:sectionId/regenerate', proposalController.regenerateSection)
router.post('/:proposalId/sections/:sectionId/improve', proposalController.improveSection)
router.post('/:proposalId/sections', proposalController.addSection)
router.delete('/:proposalId/sections/:sectionId', proposalController.deleteSection)
router.post('/:proposalId/sections/reorder', proposalController.reorderSections)

// Version history, diff comparison & restoration
router.post('/:proposalId/versions', proposalController.createVersion)
router.get('/:proposalId/versions', proposalController.listVersions)
router.post('/:proposalId/versions/compare', proposalController.compareVersions)
router.post('/:proposalId/restore', proposalController.restoreVersion)

// Readiness advisory audit
router.post('/:proposalId/readiness', proposalController.readiness)

// Real DOCX & PDF Export
router.get('/:proposalId/export', proposalController.export)

// Faculty submission & review lifecycle
router.post('/:proposalId/submit', proposalController.submitFaculty)
router.post(
  '/:proposalId/faculty/review',
  requireRole('faculty', 'admin'),
  proposalController.facultyReview
)
router.post('/:proposalId/resubmit', proposalController.resubmitFaculty)

export default router
