import { config } from '../../config/env.js'

export interface EmailMessagePayload {
  to: string
  subject: string
  text: string
}

export type EmailTransportFn = (msg: EmailMessagePayload) => Promise<void>

let customTestTransport: EmailTransportFn | null = null

export function setEmailTransportForTesting(fn: EmailTransportFn | null): void {
  customTestTransport = fn
}

export function getEmailConfigurationStatus(): {
  configured: boolean
  provider: 'CUSTOM_HOOK' | 'SMTP' | 'NONE'
  missingVars: string[]
} {
  if (customTestTransport) {
    return { configured: true, provider: 'CUSTOM_HOOK', missingVars: [] }
  }
  const missing: string[] = []
  if (!config.SMTP_HOST?.trim()) missing.push('SMTP_HOST')
  if (!config.SMTP_USER?.trim()) missing.push('SMTP_USER')
  if (!config.SMTP_PASS?.trim()) missing.push('SMTP_PASS')

  if (missing.length === 0) {
    return { configured: true, provider: 'SMTP', missingVars: [] }
  }
  return { configured: false, provider: 'NONE', missingVars: missing }
}

/**
 * Optional email dispatcher for important academic notifications.
 * In-app notifications remain primary; if SMTP is unconfigured, reports 'NOT_CONFIGURED' cleanly.
 */
export async function attemptOptionalEmailDelivery(
  payload: EmailMessagePayload
): Promise<{ status: 'NOT_CONFIGURED' | 'SENT' | 'FAILED'; error?: string }> {
  if (customTestTransport) {
    try {
      await customTestTransport(payload)
      return { status: 'SENT' }
    } catch (err: any) {
      return { status: 'FAILED', error: err?.message || 'Email delivery error' }
    }
  }

  const status = getEmailConfigurationStatus()
  if (!status.configured) {
    return { status: 'NOT_CONFIGURED' }
  }

  // Note: Full SMTP wire transmission requires an SMTP client library (e.g. nodemailer) installed and live credentials.
  return {
    status: 'NOT_CONFIGURED',
    error: 'SMTP credentials detected in env, but no external SMTP transport client package is installed.',
  }
}
