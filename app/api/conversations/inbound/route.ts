import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { generateSalesReply } from '@/lib/claude'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

interface InboundBody {
  phone: string
  message: string
  wa_message_id: string
}

// POST: Handle inbound WhatsApp message from a lead
export async function POST(request: NextRequest) {
  const supabase = createSupabaseServerClient()

  let body: InboundBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { phone, message, wa_message_id } = body

  if (!phone || !message) {
    return NextResponse.json({ error: 'phone and message are required' }, { status: 400 })
  }

  // Normalize phone number
  const normalizedPhone = phone.startsWith('+') ? phone.slice(1) : phone

  try {
    // 1. Find lead by phone number
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .or(`phone.eq.${normalizedPhone},phone.eq.+${normalizedPhone}`)
      .single()

    if (leadError || !lead) {
      console.warn(`[Inbound] No lead found for phone ${normalizedPhone}`)
      return NextResponse.json({ message: 'Lead not found — message ignored' }, { status: 200 })
    }

    // 2. Check for deduplication — same wa_message_id already processed
    if (wa_message_id) {
      const { data: existingMsg } = await supabase
        .from('conversation_messages')
        .select('id')
        .eq('wa_message_id', wa_message_id)
        .limit(1)
        .single()

      if (existingMsg) {
        return NextResponse.json({ message: 'Duplicate message — already processed' }, { status: 200 })
      }
    }

    // 3. Find or create conversation
    let { data: conversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('lead_id', lead.id)
      .single()

    if (!conversation) {
      const { data: newConversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          lead_id: lead.id,
          wa_phone_number: normalizedPhone,
          status: 'active',
          ai_context: [],
          pain_points: [],
        })
        .select()
        .single()

      if (convError || !newConversation) {
        throw new Error(`Failed to create conversation: ${convError?.message}`)
      }

      conversation = newConversation
    }

    // 4. Add inbound message to conversation_messages
    await supabase.from('conversation_messages').insert({
      conversation_id: conversation.id,
      direction: 'inbound',
      sender: 'lead',
      message_body: message,
      wa_message_id: wa_message_id || null,
    })

    // 5. Update conversation last_message_at
    const updatedAiContext = [
      ...(conversation.ai_context || []),
      { role: 'user' as const, content: message },
    ]

    await supabase
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString(),
        ai_context: updatedAiContext,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversation.id)

    // 6. Update lead pipeline stage to 'replied'
    const earlyStages = ['new', 'contacted']
    if (earlyStages.includes(lead.pipeline_stage)) {
      await supabase
        .from('leads')
        .update({
          pipeline_stage: 'replied',
          updated_at: new Date().toISOString(),
        })
        .eq('id', lead.id)
    }

    // 7. Cancel pending follow-ups (lead has responded)
    await supabase
      .from('follow_up_queue')
      .update({ status: 'cancelled' })
      .eq('lead_id', lead.id)
      .eq('status', 'pending')

    // 8. Generate AI sales reply
    const aiResult = await generateSalesReply(
      updatedAiContext,
      {
        business_name: lead.business_name,
        category: lead.category,
        city: lead.city,
        has_website: lead.has_website,
      }
    )

    // 9. Send AI reply via WhatsApp
    const waReplyId = await sendWhatsAppMessage(normalizedPhone, aiResult.reply)

    // 10. Store AI reply as outbound conversation message
    await supabase.from('conversation_messages').insert({
      conversation_id: conversation.id,
      direction: 'outbound',
      sender: 'ai_agent',
      message_body: aiResult.reply,
      wa_message_id: waReplyId,
    })

    // 11. Update conversation context with AI reply
    const finalAiContext = [
      ...updatedAiContext,
      { role: 'assistant' as const, content: aiResult.reply },
    ]

    // Build update object for conversation
    const convUpdate: Record<string, unknown> = {
      ai_context: finalAiContext,
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Extract and store pain points if identified
    if (aiResult.extracted_info.pain_points?.length) {
      const existingPainPoints = conversation.pain_points || []
      const mergedPainPoints = [
        ...new Set([...existingPainPoints, ...aiResult.extracted_info.pain_points]),
      ]
      convUpdate.pain_points = mergedPainPoints
    }

    // 12. Handle AI action outcomes
    let newPipelineStage = null

    if (aiResult.action === 'book_call') {
      newPipelineStage = 'call_booked'
      convUpdate.call_booked_at = new Date().toISOString()
    } else if (aiResult.action === 'close') {
      newPipelineStage = 'closed_won'
    } else if (aiResult.action === 'lost') {
      newPipelineStage = 'not_interested'
    } else if (aiResult.extracted_info.interest_level === 'high') {
      newPipelineStage = 'interested'
    }

    await supabase
      .from('conversations')
      .update(convUpdate)
      .eq('id', conversation.id)

    // Update lead pipeline stage if action changed it
    if (newPipelineStage) {
      await supabase
        .from('leads')
        .update({
          pipeline_stage: newPipelineStage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', lead.id)
    }

    return NextResponse.json({
      message: 'Inbound message processed',
      lead_id: lead.id,
      conversation_id: conversation.id,
      ai_action: aiResult.action,
      new_pipeline_stage: newPipelineStage || lead.pipeline_stage,
      reply_sent: true,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Inbound] Processing error:', errorMessage)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
