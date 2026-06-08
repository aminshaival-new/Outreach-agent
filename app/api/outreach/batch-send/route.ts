import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { generateOutreachMessage } from '@/lib/claude'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

const DELAY_BETWEEN_MESSAGES_MS = 2000 // 2 second delay to avoid rate limits

interface BatchSendResult {
  lead_id: string
  status: 'sent' | 'skipped' | 'failed'
  reason?: string
  wa_message_id?: string
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// POST: Generate and send outreach messages to multiple leads
export async function POST(request: NextRequest) {
  const supabase = createSupabaseServerClient()

  let body: { lead_ids: string[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { lead_ids } = body

  if (!Array.isArray(lead_ids) || lead_ids.length === 0) {
    return NextResponse.json({ error: 'lead_ids must be a non-empty array' }, { status: 400 })
  }

  if (lead_ids.length > 50) {
    return NextResponse.json({ error: 'Maximum 50 leads per batch' }, { status: 400 })
  }

  // Fetch all leads in one query
  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('*')
    .in('id', lead_ids)

  if (leadsError) {
    return NextResponse.json({ error: leadsError.message }, { status: 500 })
  }

  if (!leads || leads.length === 0) {
    return NextResponse.json({ error: 'No leads found for provided IDs' }, { status: 404 })
  }

  const results: BatchSendResult[] = []

  for (const lead of leads) {
    // Skip leads without phone numbers
    if (!lead.phone) {
      results.push({ lead_id: lead.id, status: 'skipped', reason: 'No phone number' })
      continue
    }

    // Skip leads that have already been contacted
    if (lead.pipeline_stage !== 'new') {
      results.push({ lead_id: lead.id, status: 'skipped', reason: `Already in stage: ${lead.pipeline_stage}` })
      continue
    }

    // Check for already sent initial message (idempotency guard)
    const { data: existingMsg } = await supabase
      .from('outreach_messages')
      .select('id')
      .eq('lead_id', lead.id)
      .eq('message_type', 'initial')
      .in('status', ['sent', 'delivered', 'read'])
      .limit(1)
      .single()

    if (existingMsg) {
      results.push({ lead_id: lead.id, status: 'skipped', reason: 'Initial message already sent' })
      continue
    }

    try {
      // Generate personalized message
      const generated = await generateOutreachMessage({
        business_name: lead.business_name,
        category: lead.category,
        city: lead.city,
        google_rating: lead.google_rating,
        review_count: lead.review_count,
        has_website: lead.has_website,
        website: lead.website,
        facebook_url: lead.facebook_url,
        instagram_url: lead.instagram_url,
      })

      // Create outreach_messages record
      const { data: outreachRecord, error: insertError } = await supabase
        .from('outreach_messages')
        .insert({
          lead_id: lead.id,
          message_type: 'initial',
          message_body: generated.message,
          wa_phone_number: lead.phone,
          status: 'pending',
        })
        .select('id')
        .single()

      if (insertError || !outreachRecord) {
        throw new Error(`DB insert failed: ${insertError?.message}`)
      }

      // Send WhatsApp message
      const waMessageId = await sendWhatsAppMessage(lead.phone, generated.message)

      // Update record as sent
      await supabase
        .from('outreach_messages')
        .update({
          wa_message_id: waMessageId,
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', outreachRecord.id)

      // Update lead stage and personalization
      await supabase
        .from('leads')
        .update({
          pipeline_stage: 'contacted',
          outreach_personalization: {
            personalization_angle: generated.personalization_angle,
            pain_point: generated.pain_point,
            generated_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', lead.id)

      // Schedule follow-ups
      const now = new Date()
      const followUp1At = new Date(now.getTime() + 48 * 60 * 60 * 1000) // 48h
      const followUp2At = new Date(now.getTime() + 120 * 60 * 60 * 1000) // 120h

      await supabase.from('follow_up_queue').insert([
        {
          lead_id: lead.id,
          follow_up_type: 'followup_1',
          scheduled_at: followUp1At.toISOString(),
          status: 'pending',
        },
        {
          lead_id: lead.id,
          follow_up_type: 'followup_2',
          scheduled_at: followUp2At.toISOString(),
          status: 'pending',
        },
      ])

      results.push({ lead_id: lead.id, status: 'sent', wa_message_id: waMessageId })

      // Rate limit delay
      await sleep(DELAY_BETWEEN_MESSAGES_MS)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[Batch Send] Error for lead ${lead.id}:`, message)
      results.push({ lead_id: lead.id, status: 'failed', reason: message })

      // Mark any pending outreach message as failed
      await supabase
        .from('outreach_messages')
        .update({ status: 'failed' })
        .eq('lead_id', lead.id)
        .eq('status', 'pending')
    }
  }

  const sent = results.filter((r) => r.status === 'sent').length
  const skipped = results.filter((r) => r.status === 'skipped').length
  const failed = results.filter((r) => r.status === 'failed').length

  return NextResponse.json({
    summary: { total: lead_ids.length, sent, skipped, failed },
    results,
  })
}
