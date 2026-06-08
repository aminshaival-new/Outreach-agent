import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, type PipelineStage } from '@/lib/supabase'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET: Get a single lead with outreach messages and conversations
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const supabase = createSupabaseServerClient()

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single()

  if (leadError || !lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  // Fetch outreach messages
  const { data: outreachMessages } = await supabase
    .from('outreach_messages')
    .select('*')
    .eq('lead_id', id)
    .order('created_at', { ascending: true })

  // Fetch conversation with messages
  const { data: conversation } = await supabase
    .from('conversations')
    .select('*')
    .eq('lead_id', id)
    .single()

  let conversationMessages = []
  if (conversation) {
    const { data: messages } = await supabase
      .from('conversation_messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })
    conversationMessages = messages || []
  }

  // Fetch follow-up queue
  const { data: followUps } = await supabase
    .from('follow_up_queue')
    .select('*')
    .eq('lead_id', id)
    .order('scheduled_at', { ascending: true })

  return NextResponse.json({
    data: {
      ...lead,
      outreach_messages: outreachMessages || [],
      conversation: conversation
        ? { ...conversation, messages: conversationMessages }
        : null,
      follow_ups: followUps || [],
    },
  })
}

// PATCH: Update a lead (stage, notes, etc.)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const supabase = createSupabaseServerClient()

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Allowlist of updatable fields
  const allowedFields = [
    'pipeline_stage',
    'phone',
    'email',
    'website',
    'address',
    'city',
    'category',
    'lead_score',
    'outreach_personalization',
    'facebook_url',
    'instagram_url',
    'linkedin_url',
  ]

  const updateData: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (field in body) {
      updateData[field] = body[field]
    }
  }

  // Validate pipeline_stage if provided
  const validStages: PipelineStage[] = [
    'new', 'contacted', 'replied', 'interested',
    'call_booked', 'closed_won', 'closed_lost', 'not_interested',
  ]
  if (updateData.pipeline_stage && !validStages.includes(updateData.pipeline_stage as PipelineStage)) {
    return NextResponse.json({ error: 'Invalid pipeline_stage value' }, { status: 400 })
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  updateData.updated_at = new Date().toISOString()

  const { data: lead, error } = await supabase
    .from('leads')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  return NextResponse.json({ data: lead })
}
