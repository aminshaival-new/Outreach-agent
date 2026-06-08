import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET: Get full conversation with all messages
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const supabase = createSupabaseServerClient()

  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', id)
    .single()

  if (convError || !conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  // Fetch all messages in the conversation
  const { data: messages, error: msgError } = await supabase
    .from('conversation_messages')
    .select('*')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })

  if (msgError) {
    return NextResponse.json({ error: msgError.message }, { status: 500 })
  }

  // Fetch lead info
  const { data: lead } = await supabase
    .from('leads')
    .select('*')
    .eq('id', conversation.lead_id)
    .single()

  return NextResponse.json({
    data: {
      ...conversation,
      messages: messages || [],
      lead: lead || null,
    },
  })
}

// POST: Send a manual message (owner override)
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const supabase = createSupabaseServerClient()

  let body: { message: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { message } = body
  if (!message?.trim()) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }

  // Fetch conversation
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', id)
    .single()

  if (convError || !conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  try {
    // Send message via WhatsApp
    const waMessageId = await sendWhatsAppMessage(conversation.wa_phone_number, message.trim())

    // Record as outbound owner message
    const { data: convMessage, error: insertError } = await supabase
      .from('conversation_messages')
      .insert({
        conversation_id: id,
        direction: 'outbound',
        sender: 'owner',
        message_body: message.trim(),
        wa_message_id: waMessageId,
      })
      .select()
      .single()

    if (insertError) {
      throw new Error(`Failed to store message: ${insertError.message}`)
    }

    // Update conversation last_message_at
    await supabase
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    return NextResponse.json({
      message: 'Message sent',
      conversation_id: id,
      wa_message_id: waMessageId,
      data: convMessage,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[Conversation POST] Error:`, errorMessage)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
