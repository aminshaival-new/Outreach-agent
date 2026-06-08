import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

const OWNER_PHONE = process.env.WHATSAPP_OWNER_PHONE || '919727686181'

const MORNING_PROMPT = `Good morning! 🌅

*Local Lead AI* is ready to find leads for you today.

Reply with your target:
• Format: *[Business Type] in [Location]*
• Example: *Salon in South Bopal Ahmedabad*
• Example: *Dentist in Baner Pune*
• Example: *Gym in Koramangala Bangalore*

What should I scrape today?`

// POST: Send morning prompt to owner and create a daily_scrape_prompts record
export async function POST() {
  const supabase = createSupabaseServerClient()

  try {
    // Check if a prompt was already sent today
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const { data: existing } = await supabase
      .from('daily_scrape_prompts')
      .select('id, status')
      .gte('prompt_sent_at', todayStart.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (existing) {
      return NextResponse.json(
        {
          message: 'Morning prompt already sent today',
          prompt_id: existing.id,
          status: existing.status,
        },
        { status: 200 }
      )
    }

    // Send WhatsApp message to owner
    const waMessageId = await sendWhatsAppMessage(OWNER_PHONE, MORNING_PROMPT)

    // Create daily_scrape_prompts record
    const { data: prompt, error } = await supabase
      .from('daily_scrape_prompts')
      .insert({
        prompt_sent_at: new Date().toISOString(),
        status: 'prompt_sent',
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create daily_scrape_prompts record: ${error.message}`)
    }

    return NextResponse.json(
      {
        message: 'Morning prompt sent successfully',
        prompt_id: prompt.id,
        wa_message_id: waMessageId,
        sent_to: OWNER_PHONE,
      },
      { status: 201 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Morning Prompt] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
