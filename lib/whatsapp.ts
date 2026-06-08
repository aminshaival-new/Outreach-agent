// ─── Types ────────────────────────────────────────────────────────────────────

export interface WhatsAppTextMessage {
  id: string
  from: string
  timestamp: string
  type: 'text'
  text: { body: string }
}

export interface WhatsAppStatusUpdate {
  id: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  timestamp: string
  recipient_id: string
  errors?: Array<{ code: number; title: string }>
}

export interface WhatsAppWebhookPayload {
  object: 'whatsapp_business_account'
  entry: Array<{
    id: string
    changes: Array<{
      value: {
        messaging_product: 'whatsapp'
        metadata: {
          display_phone_number: string
          phone_number_id: string
        }
        messages?: WhatsAppTextMessage[]
        statuses?: WhatsAppStatusUpdate[]
        errors?: Array<{ code: number; title: string; message: string }>
      }
      field: 'messages'
    }>
  }>
}

export interface ParsedWebhookData {
  messages: Array<{
    from: string
    id: string
    body: string
    timestamp: string
  }>
  statuses: Array<{
    id: string
    status: string
    recipient: string
  }>
}

interface SendMessageResponse {
  messaging_product: 'whatsapp'
  contacts: Array<{ input: string; wa_id: string }>
  messages: Array<{ id: string }>
}

// ─── Config ───────────────────────────────────────────────────────────────────

function getPhoneNumberId(): string {
  const id = process.env.WHATSAPP_PHONE_NUMBER_ID
  if (!id) throw new Error('Missing WHATSAPP_PHONE_NUMBER_ID environment variable')
  return id
}

function getAccessToken(): string {
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  if (!token) throw new Error('Missing WHATSAPP_ACCESS_TOKEN environment variable')
  return token
}

function getApiUrl(): string {
  const phoneNumberId = getPhoneNumberId()
  return `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`
}

// ─── Core Send Functions ──────────────────────────────────────────────────────

/**
 * Send a plain text WhatsApp message.
 * @returns The WhatsApp message ID (wamid)
 */
export async function sendWhatsAppMessage(to: string, message: string): Promise<string> {
  const token = getAccessToken()

  // Normalize phone number — strip leading + if present
  const normalizedTo = to.startsWith('+') ? to.slice(1) : to

  const body = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizedTo,
    type: 'text',
    text: {
      preview_url: false,
      body: message,
    },
  }

  const response = await fetch(getApiUrl(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(
      `WhatsApp API error (${response.status}): ${JSON.stringify(errorData)}`
    )
  }

  const data: SendMessageResponse = await response.json()
  return data.messages[0].id
}

/**
 * Send a WhatsApp template message.
 * @returns The WhatsApp message ID (wamid)
 */
export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  components: Array<{
    type: 'header' | 'body' | 'button'
    parameters?: Array<{
      type: 'text' | 'image' | 'document'
      text?: string
      image?: { link: string }
    }>
  }>
): Promise<string> {
  const token = getAccessToken()
  const normalizedTo = to.startsWith('+') ? to.slice(1) : to

  const body = {
    messaging_product: 'whatsapp',
    to: normalizedTo,
    type: 'template',
    template: {
      name: templateName,
      language: { code: 'en' },
      components,
    },
  }

  const response = await fetch(getApiUrl(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(
      `WhatsApp template API error (${response.status}): ${JSON.stringify(errorData)}`
    )
  }

  const data: SendMessageResponse = await response.json()
  return data.messages[0].id
}

// ─── Webhook Utilities ────────────────────────────────────────────────────────

/**
 * Verify the WhatsApp webhook handshake (GET request).
 * @returns The challenge string if valid, null if invalid
 */
export function verifyWebhook(
  mode: string,
  token: string,
  challenge: string
): string | null {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN
  if (!verifyToken) {
    console.error('WHATSAPP_VERIFY_TOKEN not set')
    return null
  }

  if (mode === 'subscribe' && token === verifyToken) {
    return challenge
  }

  return null
}

/**
 * Parse the WhatsApp webhook payload into a normalized structure.
 */
export function parseWhatsAppWebhook(payload: WhatsAppWebhookPayload): ParsedWebhookData {
  const messages: ParsedWebhookData['messages'] = []
  const statuses: ParsedWebhookData['statuses'] = []

  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value

      // Parse inbound messages
      for (const msg of value.messages || []) {
        if (msg.type === 'text') {
          messages.push({
            from: msg.from,
            id: msg.id,
            body: msg.text.body,
            timestamp: msg.timestamp,
          })
        }
        // Non-text messages (image, audio, etc.) are acknowledged but not processed
      }

      // Parse delivery/read status updates
      for (const status of value.statuses || []) {
        statuses.push({
          id: status.id,
          status: status.status,
          recipient: status.recipient_id,
        })
      }
    }
  }

  return { messages, statuses }
}

/**
 * Mark a WhatsApp message as read (sends read receipt).
 */
export async function markMessageAsRead(messageId: string): Promise<void> {
  const token = getAccessToken()

  const body = {
    messaging_product: 'whatsapp',
    status: 'read',
    message_id: messageId,
  }

  await fetch(getApiUrl(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  // Intentionally don't throw on failure — read receipts are best-effort
}

/**
 * Format a phone number for display.
 */
export function formatPhoneForDisplay(phone: string): string {
  const normalized = phone.startsWith('+') ? phone : `+${phone}`
  return normalized
}
