import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

// POST: Schedule follow-up messages for a contacted lead
export async function POST(request: NextRequest) {
  const supabase = createSupabaseServerClient()

  let body: { lead_id: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { lead_id } = body

  if (!lead_id) {
    return NextResponse.json({ error: 'lead_id is required' }, { status: 400 })
  }

  // Verify lead exists
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('id, pipeline_stage, business_name, phone')
    .eq('id', lead_id)
    .single()

  if (leadError || !lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  if (!lead.phone) {
    return NextResponse.json({ error: 'Lead has no phone number — cannot schedule follow-ups' }, { status: 422 })
  }

  // Check for existing pending follow-ups to avoid duplicates
  const { data: existingFollowUps } = await supabase
    .from('follow_up_queue')
    .select('id, follow_up_type, status')
    .eq('lead_id', lead_id)
    .eq('status', 'pending')

  if (existingFollowUps && existingFollowUps.length >= 2) {
    return NextResponse.json(
      {
        message: 'Follow-ups already scheduled',
        existing: existingFollowUps,
      },
      { status: 200 }
    )
  }

  const now = new Date()
  // followup_1: 48 hours from now
  const followUp1At = new Date(now.getTime() + 48 * 60 * 60 * 1000)
  // followup_2: 120 hours (48 + 72) from now
  const followUp2At = new Date(now.getTime() + 120 * 60 * 60 * 1000)

  const followUpsToInsert: Array<{
    lead_id: string
    follow_up_type: 'followup_1' | 'followup_2'
    scheduled_at: string
    status: 'pending'
  }> = []

  // Only insert if not already present
  const existingTypes = new Set(existingFollowUps?.map((f) => f.follow_up_type) || [])

  if (!existingTypes.has('followup_1')) {
    followUpsToInsert.push({
      lead_id,
      follow_up_type: 'followup_1' as const,
      scheduled_at: followUp1At.toISOString(),
      status: 'pending' as const,
    })
  }

  if (!existingTypes.has('followup_2')) {
    followUpsToInsert.push({
      lead_id,
      follow_up_type: 'followup_2' as const,
      scheduled_at: followUp2At.toISOString(),
      status: 'pending' as const,
    })
  }

  if (followUpsToInsert.length === 0) {
    return NextResponse.json({ message: 'All follow-ups already scheduled' })
  }

  const { data: inserted, error: insertError } = await supabase
    .from('follow_up_queue')
    .insert(followUpsToInsert)
    .select()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json(
    {
      message: 'Follow-ups scheduled',
      lead_id,
      follow_ups: inserted,
      schedule: {
        followup_1: followUp1At.toISOString(),
        followup_2: followUp2At.toISOString(),
      },
    },
    { status: 201 }
  )
}
