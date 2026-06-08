import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

// POST: Send a WhatsApp outreach message to a lead
export async function POST(request: NextRequest) {
  const supabase = createSupabaseServerClient()

  let body: { lead_id: string; message: string; message_type?: 'initial' | 'followup_1' | 'followup_2' }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { lead_id, message, message_type = 'initial' } = body

  if (!lead_id || !message?.trim()) {
    return NextResponse.json({ error: 'lead_id and message are required' }, { status: 400 })
  }

  // Fetch lead
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('id, business_name, phone, pipeline_stage')
    .eq('id', lead_id)
    .single()

  if (leadError || !lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  if (!lead.phone) {
    return NextResponse.json({ error: 'Lead has no phone number' }, { status: 422 })
  }

  // Create outreach_messages record (pending state)
  const { data: outreachMessage, error: msgError } = await supabase
    .from('outreach_messages')
    .insert({
      lead_id,
      message_type,
      message_body: message.trim(),
      wa_phone_number: lead.phone,
      status: 'pending',
    })
    .select()
    .single()

  if (msgError || !outreachMessage) {
    return NextResponse.json(
      { error: `Failed to create outreach message record: ${msgError?.message}` },
      { status: 500 }
    )
  }

  try {
    // Send via WhatsApp Cloud API
    const waMessageId = await sendWhatsAppMessage(lead.phone, message.trim())

    // Update message record with WA message ID and sent status
    await supabase
      .from('outreach_messages')
      .update({
        wa_message_id: waMessageId,
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', outreachMessage.id)

    // Update lead pipeline stage to 'contacted'
    if (lead.pipeline_stage === 'new') {
      await supabase
        .from('leads')
        .update({
          pipeline_stage: 'contacted',
          updated_at: new Date().toISOString(),
        })
        .eq('id', lead_id)
    }

    return NextResponse.json({
      message_id: outreachMessage.id,
      wa_message_id: waMessageId,
      lead_id,
      status: 'sent',
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[Outreach Send] Failed for lead ${lead_id}:`, errorMessage)

    // Mark message as failed
    await supabase
      .from('outreach_messages')
      .update({ status: 'failed' })
      .eq('id', outreachMessage.id)

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
