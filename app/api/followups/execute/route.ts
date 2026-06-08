import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { generateFollowUpMessage } from '@/lib/claude'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

// POST: Execute a single pending follow-up
export async function POST(request: NextRequest) {
  const supabase = createSupabaseServerClient()

  let body: { follow_up_queue_id: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { follow_up_queue_id } = body

  if (!follow_up_queue_id) {
    return NextResponse.json({ error: 'follow_up_queue_id is required' }, { status: 400 })
  }

  // Fetch follow-up queue item
  const { data: followUp, error: followUpError } = await supabase
    .from('follow_up_queue')
    .select('*')
    .eq('id', follow_up_queue_id)
    .single()

  if (followUpError || !followUp) {
    return NextResponse.json({ error: 'Follow-up not found' }, { status: 404 })
  }

  if (followUp.status !== 'pending') {
    return NextResponse.json(
      { message: 'Follow-up already processed', status: followUp.status },
      { status: 200 }
    )
  }

  // Fetch lead
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', followUp.lead_id)
    .single()

  if (leadError || !lead) {
    await supabase
      .from('follow_up_queue')
      .update({ status: 'cancelled', executed_at: new Date().toISOString() })
      .eq('id', follow_up_queue_id)

    return NextResponse.json({ error: 'Lead not found — follow-up cancelled' }, { status: 404 })
  }

  if (!lead.phone) {
    await supabase
      .from('follow_up_queue')
      .update({ status: 'cancelled', executed_at: new Date().toISOString() })
      .eq('id', follow_up_queue_id)

    return NextResponse.json({ message: 'Lead has no phone — follow-up cancelled' })
  }

  // Skip if lead has already replied (check for inbound conversation messages)
  const { data: inboundMessage } = await supabase
    .from('conversations')
    .select('id')
    .eq('lead_id', lead.id)
    .not('last_message_at', 'is', null)
    .single()

  if (inboundMessage) {
    // Lead has replied — cancel follow-up
    await supabase
      .from('follow_up_queue')
      .update({ status: 'skipped', executed_at: new Date().toISOString() })
      .eq('id', follow_up_queue_id)

    return NextResponse.json({
      message: 'Lead has replied — follow-up skipped',
      follow_up_queue_id,
      lead_id: lead.id,
    })
  }

  // Also cancel if lead has progressed past 'contacted'
  const stagesAfterContact: string[] = ['replied', 'interested', 'call_booked', 'closed_won', 'closed_lost', 'not_interested']
  if (stagesAfterContact.includes(lead.pipeline_stage)) {
    await supabase
      .from('follow_up_queue')
      .update({ status: 'skipped', executed_at: new Date().toISOString() })
      .eq('id', follow_up_queue_id)

    return NextResponse.json({
      message: `Lead is in stage "${lead.pipeline_stage}" — follow-up skipped`,
      follow_up_queue_id,
    })
  }

  // Fetch original outreach message for context
  const { data: originalMessage } = await supabase
    .from('outreach_messages')
    .select('message_body')
    .eq('lead_id', lead.id)
    .eq('message_type', 'initial')
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  const originalMessageBody = originalMessage?.message_body || ''

  try {
    // Generate follow-up message via Claude
    const followUpNumber = followUp.follow_up_type === 'followup_1' ? 1 : 2
    const message = await generateFollowUpMessage(
      {
        business_name: lead.business_name,
        category: lead.category,
        city: lead.city,
      },
      followUpNumber,
      originalMessageBody
    )

    // Create outreach_messages record
    const { data: outreachRecord, error: insertError } = await supabase
      .from('outreach_messages')
      .insert({
        lead_id: lead.id,
        message_type: followUp.follow_up_type,
        message_body: message,
        wa_phone_number: lead.phone,
        status: 'pending',
      })
      .select('id')
      .single()

    if (insertError || !outreachRecord) {
      throw new Error(`Failed to create outreach record: ${insertError?.message}`)
    }

    // Send WhatsApp message
    const waMessageId = await sendWhatsAppMessage(lead.phone, message)

    // Update outreach message record
    await supabase
      .from('outreach_messages')
      .update({
        wa_message_id: waMessageId,
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', outreachRecord.id)

    // Mark follow-up as sent
    await supabase
      .from('follow_up_queue')
      .update({
        status: 'sent',
        executed_at: new Date().toISOString(),
      })
      .eq('id', follow_up_queue_id)

    return NextResponse.json({
      message: 'Follow-up sent',
      follow_up_queue_id,
      lead_id: lead.id,
      wa_message_id: waMessageId,
      follow_up_type: followUp.follow_up_type,
      message_preview: message.slice(0, 100) + (message.length > 100 ? '...' : ''),
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[Execute Follow-up] Error for queue item ${follow_up_queue_id}:`, errorMessage)

    // Mark follow-up as failed (keep status as pending so it can be retried)
    // We don't update status here so the cron can retry

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
