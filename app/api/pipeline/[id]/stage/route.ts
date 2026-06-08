import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, type PipelineStage } from '@/lib/supabase'

const VALID_STAGES: PipelineStage[] = [
  'new',
  'contacted',
  'replied',
  'interested',
  'call_booked',
  'closed_won',
  'closed_lost',
  'not_interested',
]

interface RouteParams {
  params: Promise<{ id: string }>
}

// PATCH: Update lead pipeline stage
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const supabase = createSupabaseServerClient()

  let body: { stage: PipelineStage }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { stage } = body

  if (!stage) {
    return NextResponse.json({ error: 'stage is required' }, { status: 400 })
  }

  if (!VALID_STAGES.includes(stage)) {
    return NextResponse.json(
      {
        error: 'Invalid stage',
        valid_stages: VALID_STAGES,
      },
      { status: 400 }
    )
  }

  // Fetch current lead to validate it exists and get previous stage
  const { data: existingLead, error: fetchError } = await supabase
    .from('leads')
    .select('id, pipeline_stage, business_name')
    .eq('id', id)
    .single()

  if (fetchError || !existingLead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  const previousStage = existingLead.pipeline_stage

  // Update the stage
  const { data: lead, error: updateError } = await supabase
    .from('leads')
    .update({
      pipeline_stage: stage,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Side effects based on stage transitions
  await handleStageTransition(id, previousStage, stage, supabase)

  return NextResponse.json({
    data: lead,
    transition: {
      from: previousStage,
      to: stage,
    },
  })
}

async function handleStageTransition(
  leadId: string,
  from: PipelineStage,
  to: PipelineStage,
  supabase: ReturnType<typeof createSupabaseServerClient>
) {
  // If moved to call_booked: record call booking time in conversation
  if (to === 'call_booked' && from !== 'call_booked') {
    await supabase
      .from('conversations')
      .update({
        call_booked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('lead_id', leadId)
  }

  // If moved to not_interested or closed_lost: cancel pending follow-ups
  if (to === 'not_interested' || to === 'closed_lost') {
    await supabase
      .from('follow_up_queue')
      .update({ status: 'cancelled' })
      .eq('lead_id', leadId)
      .eq('status', 'pending')

    await supabase
      .from('conversations')
      .update({
        status: 'closed',
        updated_at: new Date().toISOString(),
      })
      .eq('lead_id', leadId)
  }

  // If moved to closed_won: also close conversation
  if (to === 'closed_won') {
    await supabase
      .from('conversations')
      .update({
        status: 'closed',
        updated_at: new Date().toISOString(),
      })
      .eq('lead_id', leadId)
  }
}
