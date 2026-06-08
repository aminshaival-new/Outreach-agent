import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhook, parseWhatsAppWebhook, type WhatsAppWebhookPayload } from '@/lib/whatsapp'

const OWNER_PHONE = process.env.WHATSAPP_OWNER_PHONE || '919727686181'

// ─── GET: Webhook Verification ────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const mode = searchParams.get('hub.mode') || ''
  const token = searchParams.get('hub.verify_token') || ''
  const challenge = searchParams.get('hub.challenge') || ''

  const result = verifyWebhook(mode, token, challenge)

  if (result) {
    return new Response(result, { status: 200 })
  }

  return new Response('Forbidden', { status: 403 })
}

// ─── POST: Receive Messages & Status Updates ──────────────────────────────────

export async function POST(request: NextRequest) {
  let body: WhatsAppWebhookPayload

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate it's a WhatsApp Business Account webhook
  if (body.object !== 'whatsapp_business_account') {
    return NextResponse.json({ error: 'Not a WhatsApp webhook' }, { status: 400 })
  }

  const { messages, statuses } = parseWhatsAppWebhook(body)

  // Process in background — always respond 200 immediately to Meta
  void processWebhookEvents(messages, statuses, request)

  return NextResponse.json({ status: 'ok' }, { status: 200 })
}

// ─── Background Processing ────────────────────────────────────────────────────

async function processWebhookEvents(
  messages: Array<{ from: string; id: string; body: string; timestamp: string }>,
  statuses: Array<{ id: string; status: string; recipient: string }>,
  request: NextRequest
) {
  const baseUrl = getBaseUrl(request)

  // Process status updates (delivery receipts)
  for (const status of statuses) {
    await processStatusUpdate(status, baseUrl).catch((err) => {
      console.error('[WhatsApp Webhook] Status update error:', err)
    })
  }

  // Process inbound messages
  for (const message of messages) {
    await processInboundMessage(message, baseUrl).catch((err) => {
      console.error('[WhatsApp Webhook] Message processing error:', err)
    })
  }
}

async function processStatusUpdate(
  status: { id: string; status: string; recipient: string },
  baseUrl: string
) {
  // Update outreach_messages delivery status via a dedicated internal call
  // We do a direct Supabase update here for performance
  const { createSupabaseServerClient } = await import('@/lib/supabase')
  const supabase = createSupabaseServerClient()

  const updateData: Record<string, string> = {
    status: status.status as 'sent' | 'delivered' | 'read' | 'failed',
  }

  if (status.status === 'delivered') {
    updateData.delivered_at = new Date().toISOString()
  } else if (status.status === 'read') {
    updateData.read_at = new Date().toISOString()
  }

  await supabase
    .from('outreach_messages')
    .update(updateData)
    .eq('wa_message_id', status.id)
}

async function processInboundMessage(
  message: { from: string; id: string; body: string; timestamp: string },
  baseUrl: string
) {
  const isOwner = message.from === OWNER_PHONE

  if (isOwner) {
    // Route owner messages to the scrape parse flow
    await fetch(`${baseUrl}/api/scrape/parse-reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: message.body,
        phone: message.from,
        wa_message_id: message.id,
      }),
    })
  } else {
    // Route lead messages to the conversation inbound flow
    await fetch(`${baseUrl}/api/conversations/inbound`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: message.from,
        message: message.body,
        wa_message_id: message.id,
      }),
    })
  }
}

function getBaseUrl(request: NextRequest): string {
  const n8nBase = process.env.N8N_BASE_URL
  if (n8nBase) return n8nBase

  const host = request.headers.get('host') || 'localhost:3000'
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  return `${protocol}://${host}`
}
