import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

// GET: Return pending follow-ups that are due now
export async function GET(request: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { searchParams } = new URL(request.url)

  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))
  const now = new Date().toISOString()

  // Fetch pending follow-ups that are scheduled on or before now
  const { data: followUps, error } = await supabase
    .from('follow_up_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_at', now)
    .order('scheduled_at', { ascending: true })
    .limit(limit)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!followUps || followUps.length === 0) {
    return NextResponse.json({ data: [], count: 0 })
  }

  // Join with lead data
  const leadIds = [...new Set(followUps.map((f) => f.lead_id))]
  const { data: leads } = await supabase
    .from('leads')
    .select('id, business_name, phone, category, city, pipeline_stage, has_website')
    .in('id', leadIds)

  const leadsMap = new Map((leads || []).map((l) => [l.id, l]))

  const enriched = followUps.map((followUp) => ({
    ...followUp,
    lead: leadsMap.get(followUp.lead_id) || null,
  }))

  return NextResponse.json({
    data: enriched,
    count: enriched.length,
  })
}
