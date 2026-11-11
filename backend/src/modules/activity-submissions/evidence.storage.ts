import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { EvidenceCategory, IEvidenceFileMeta } from './submission.types.js'

export const MAX_EVIDENCE_FILE_BYTES = 10 * 1024 * 1024 // 10 MB per file
export const MAX_EVIDENCE_FILES_PER_SUBMISSION = 5

const ALLOWED_EXTENSION_MAP: Record<
  string,
  { expectedMimes: string[]; canonicalMime: string; magicType: 'PDF' | 'DOCX' | 'PNG' | 'JPEG' | 'WEBP' }
> = {
  '.pdf': {
    expectedMimes: ['application/pdf'],
    canonicalMime: 'application/pdf',
    magicType: 'PDF',
  },
  '.docx': {
    expectedMimes: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/octet-stream',
    ],
    canonicalMime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    magicType: 'DOCX',
  },
  '.png': {
    expectedMimes: ['image/png'],
    canonicalMime: 'image/png',
    magicType: 'PNG',
  },
  '.jpg': {
    expectedMimes: ['image/jpeg', 'image/jpg'],
    canonicalMime: 'image/jpeg',
    magicType: 'JPEG',
  },
  '.jpeg': {
    expectedMimes: ['image/jpeg', 'image/jpg'],
    canonicalMime: 'image/jpeg',
    magicType: 'JPEG',
  },
  '.webp': {
    expectedMimes: ['image/webp'],
    canonicalMime: 'image/webp',
    magicType: 'WEBP',
  },
}

export function getPrivateEvidenceStorageRoot(): string {
  if (process.env.EVIDENCE_STORAGE_DIR && process.env.EVIDENCE_STORAGE_DIR.trim()) {
    return path.resolve(process.env.EVIDENCE_STORAGE_DIR.trim())
  }
  return path.resolve(process.cwd(), 'storage', 'private-evidence')
}

function matchesMagicBytes(
  buf: Buffer,
  type: 'PDF' | 'DOCX' | 'PNG' | 'JPEG' | 'WEBP'
): boolean {
  if (buf.length < 4) return false

  switch (type) {
    case 'PDF':
      return buf.subarray(0, 5).toString('ascii') === '%PDF-'
    case 'PNG':
      return (
        buf.length >= 8 &&
        buf[0] === 0x89 &&
        buf[1] === 0x50 &&
        buf[2] === 0x4e &&
        buf[3] === 0x47 &&
        buf[4] === 0x0d &&
        buf[5] === 0x0a &&
        buf[6] === 0x1a &&
        buf[7] === 0x0a
      )
    case 'JPEG':
      return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff
    case 'WEBP':
      return (
        buf.length >= 12 &&
        buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buf.subarray(8, 12).toString('ascii') === 'WEBP'
      )
    case 'DOCX':
      return buf[0] === 0x50 && buf[1] === 0x4b && (buf[2] === 0x03 || buf[2] === 0x05) && (buf[3] === 0x04 || buf[3] === 0x06)
  }
}

function sanitizeDisplayFileName(originalName: string): string {
  const base = path.basename(originalName || 'evidence').replace(/[^\w.\- ()]/g, '_')
  return base.slice(0, 140) || 'evidence'
}

export interface ValidatedUploadInput {
  originalName: string
  declaredMimeType: string
  buffer: Buffer
  evidenceCategory?: EvidenceCategory
}

function inferDefaultCategory(ext: string): EvidenceCategory {
  if (ext === '.pdf') return 'PDF_DOCUMENT'
  if (ext === '.docx') return 'DOCX_DOCUMENT'
  return 'IMAGE_EVIDENCE'
}

export function validateEvidenceFile(file: ValidatedUploadInput): {
  ext: string
  safeName: string
  canonicalMime: string
  evidenceCategory: EvidenceCategory
} {
  if (!file.buffer || file.buffer.length === 0) {
    throw Object.assign(new Error(`Uploaded file "${file.originalName}" is empty.`), {
      statusCode: 400,
      code: 'EMPTY_FILE',
    })
  }
  if (file.buffer.length > MAX_EVIDENCE_FILE_BYTES) {
    throw Object.assign(
      new Error(`File "${file.originalName}" exceeds the 10 MB maximum file size limit.`),
      { statusCode: 400, code: 'FILE_TOO_LARGE' }
    )
  }

  const ext = path.extname(file.originalName || '').toLowerCase()
  const rule = ALLOWED_EXTENSION_MAP[ext]
  if (!rule) {
    throw Object.assign(
      new Error(
        `Unsupported file format "${ext || 'unknown'}". Allowed formats: PDF, DOCX, PNG, JPG, JPEG, WEBP.`
      ),
      { statusCode: 400, code: 'UNSUPPORTED_FILE_TYPE' }
    )
  }

  const cleanMime = (file.declaredMimeType || '').toLowerCase().split(';')[0].trim()
  if (cleanMime && !rule.expectedMimes.includes(cleanMime)) {
    throw Object.assign(
      new Error(
        `MIME type "${cleanMime}" does not match allowed "${ext}" evidence format.`
      ),
      { statusCode: 400, code: 'INVALID_FILE_MIME' }
    )
  }

  if (!matchesMagicBytes(file.buffer, rule.magicType)) {
    throw Object.assign(
      new Error(
        `File signature validation failed for "${file.originalName}". File content does not match ${rule.magicType}.`
      ),
      { statusCode: 400, code: 'INVALID_FILE_SIGNATURE' }
    )
  }

  return {
    ext,
    safeName: sanitizeDisplayFileName(file.originalName),
    canonicalMime: rule.canonicalMime,
    evidenceCategory: file.evidenceCategory || inferDefaultCategory(ext),
  }
}

export async function persistPrivateEvidenceFile(params: {
  projectId: string
  studentId: string
  studentName: string
  file: ValidatedUploadInput
}): Promise<IEvidenceFileMeta> {
  const checked = validateEvidenceFile(params.file)
  const fileId = crypto.randomUUID()
  const safeProjectDir = params.projectId.replace(/[^a-zA-Z0-9_-]/g, '_') || 'project'
  const storageKey = `${safeProjectDir}/${fileId}${checked.ext}`

  const root = getPrivateEvidenceStorageRoot()
  const targetPath = path.resolve(root, storageKey)
  if (!targetPath.startsWith(path.resolve(root) + path.sep)) {
    throw Object.assign(new Error('Invalid storage target path.'), {
      statusCode: 400,
      code: 'INVALID_STORAGE_PATH',
    })
  }

  await fs.mkdir(path.dirname(targetPath), { recursive: true })
  await fs.writeFile(targetPath, params.file.buffer)

  const sha256 = crypto.createHash('sha256').update(params.file.buffer).digest('hex')

  return {
    fileId,
    storageKey,
    originalName: checked.safeName,
    mimeType: checked.canonicalMime,
    sizeBytes: params.file.buffer.length,
    sha256,
    evidenceCategory: checked.evidenceCategory,
    uploadedByStudentId: params.studentId,
    uploadedByStudentName: params.studentName,
    uploadedAt: new Date(),
  }
}

export async function readPrivateEvidenceFile(storageKey: string): Promise<Buffer> {
  const root = path.resolve(getPrivateEvidenceStorageRoot())
  const resolved = path.resolve(root, storageKey)
  if (!resolved.startsWith(root + path.sep)) {
    throw Object.assign(new Error('Invalid evidence file reference.'), {
      statusCode: 403,
      code: 'FORBIDDEN_FILE_PATH',
    })
  }
  return fs.readFile(resolved)
}
