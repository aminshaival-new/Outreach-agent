import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

// GET: List conversations with last message preview and lead info
export async function GET(request: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { searchParams } = new URL(request.url)

  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
  const offset = (page - 1) * limit
  const status = searchParams.get('status') // 'active' | 'closed' | 'spam'

  let query = supabase
    .from('conversations')
    .select('*', { count: 'exact' })
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1)

  if (status) {
    query = query.eq('status', status)
  }

  const { data: conversations, count, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!conversations || conversations.length === 0) {
    return NextResponse.json({
      data: [],
      pagination: { page, limit, total: 0, total_pages: 0 },
    })
  }

  // Fetch associated leads
  const leadIds = conversations.map((c) => c.lead_id)
  const { data: leads } = await supabase
    .from('leads')
    .select('id, business_name, phone, category, city, pipeline_stage, lead_score')
    .in('id', leadIds)

  const leadsMap = new Map((leads || []).map((l) => [l.id, l]))

  // Fetch last message for each conversation + unread count
  const enriched = await Promise.all(
    conversations.map(async (conv) => {
      const { data: messages } = await supabase
        .from('conversation_messages')
        .select('id, direction, sender, message_body, created_at')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1)

      // Count unread = inbound messages that came after our last outbound
      const { count: inboundCount } = await supabase
        .from('conversation_messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conv.id)
        .eq('direction', 'inbound')

      const lastMessage = messages?.[0] || null

      return {
        ...conv,
        ai_context: undefined, // Strip large context from list view
        lead: leadsMap.get(conv.lead_id) || null,
        last_message: lastMessage
          ? {
              body: lastMessage.message_body.slice(0, 100),
              direction: lastMessage.direction,
              sender: lastMessage.sender,
              created_at: lastMessage.created_at,
            }
          : null,
        unread_count: inboundCount || 0,
      }
    })
  )

  return NextResponse.json({
    data: enriched,
    pagination: {
      page,
      limit,
      total: count || 0,
      total_pages: Math.ceil((count || 0) / limit),
    },
  })
}
