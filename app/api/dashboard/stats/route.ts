import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

export interface DashboardStats {
  leads_scraped: number
  messages_sent: number
  replies_received: number
  interested: number
  calls_booked: number
  closed_deals: number
  revenue: number
  leads_by_stage: Record<string, number>
  leads_per_day: Array<{ date: string; count: number }>
}

// GET: Dashboard stats
export async function GET() {
  const supabase = createSupabaseServerClient()

  try {
    // Run all count queries in parallel
    const [
      leadsResult,
      messagesSentResult,
      repliesResult,
      interestedResult,
      callsResult,
      closedResult,
      stageBreakdownResult,
      leadsPerDayResult,
    ] = await Promise.all([
      // Total leads scraped
      supabase.from('leads').select('id', { count: 'exact', head: true }),

      // Messages sent (initial outreach)
      supabase
        .from('outreach_messages')
        .select('id', { count: 'exact', head: true })
        .in('status', ['sent', 'delivered', 'read']),

      // Leads that have replied (pipeline >= replied)
      supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .in('pipeline_stage', ['replied', 'interested', 'call_booked', 'closed_won', 'closed_lost', 'not_interested']),

      // Interested leads
      supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .in('pipeline_stage', ['interested', 'call_booked', 'closed_won']),

      // Calls booked
      supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .in('pipeline_stage', ['call_booked', 'closed_won']),

      // Closed deals
      supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('pipeline_stage', 'closed_won'),

      // Leads by stage breakdown
      supabase.from('leads').select('pipeline_stage'),

      // Leads per day (last 30 days)
      supabase
        .from('leads')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true }),
    ])

    // Process stage breakdown
    const stageBreakdown: Record<string, number> = {}
    for (const lead of stageBreakdownResult.data || []) {
      stageBreakdown[lead.pipeline_stage] = (stageBreakdown[lead.pipeline_stage] || 0) + 1
    }

    // Process leads per day
    const dailyCounts: Record<string, number> = {}
    for (const lead of leadsPerDayResult.data || []) {
      const date = lead.created_at.slice(0, 10) // YYYY-MM-DD
      dailyCounts[date] = (dailyCounts[date] || 0) + 1
    }

    // Fill in missing days with 0
    const leadsPerDay: Array<{ date: string; count: number }> = []
    const today = new Date()
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().slice(0, 10)
      leadsPerDay.push({ date: dateStr, count: dailyCounts[dateStr] || 0 })
    }

    const closedCount = closedResult.count || 0

    const stats: DashboardStats = {
      leads_scraped: leadsResult.count || 0,
      messages_sent: messagesSentResult.count || 0,
      replies_received: repliesResult.count || 0,
      interested: interestedResult.count || 0,
      calls_booked: callsResult.count || 0,
      closed_deals: closedCount,
      // Revenue estimate: assume ₹25,000 average deal value (middle of ₹15k-₹50k range)
      revenue: closedCount * 25000,
      leads_by_stage: stageBreakdown,
      leads_per_day: leadsPerDay,
    }

    return NextResponse.json({ data: stats })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Dashboard Stats] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
