import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { parseScrapeQuery } from '@/lib/claude'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

const OWNER_PHONE = process.env.WHATSAPP_OWNER_PHONE || '919727686181'

interface ParseReplyBody {
  message: string
  phone: string
  wa_message_id?: string
}

// POST: Parse owner's reply and trigger scrape
export async function POST(request: NextRequest) {
  const supabase = createSupabaseServerClient()

  let body: ParseReplyBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { message, phone } = body

  if (!message?.trim()) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }

  // Only process messages from the owner phone
  if (phone !== OWNER_PHONE) {
    return NextResponse.json({ error: 'Unauthorized phone number' }, { status: 403 })
  }

  try {
    // Find the most recent pending daily_scrape_prompt
    const { data: prompt, error: promptError } = await supabase
      .from('daily_scrape_prompts')
      .select('*')
      .eq('status', 'prompt_sent')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (promptError || !prompt) {
      // No active prompt — this might be a manual query
      // Still parse and trigger as a direct scrape
      await handleDirectQuery(message, request)
      return NextResponse.json({ message: 'Direct scrape triggered', query: message })
    }

    // Update prompt with user reply
    await supabase
      .from('daily_scrape_prompts')
      .update({
        user_reply: message,
        reply_received_at: new Date().toISOString(),
        status: 'reply_received',
      })
      .eq('id', prompt.id)

    // Parse the query with Claude
    const parsed = await parseScrapeQuery(message)

    if (!parsed.industry || !parsed.location || parsed.confidence < 0.3) {
      // Could not parse — ask for clarification
      await sendWhatsAppMessage(
        OWNER_PHONE,
        `I couldn't parse your query. Please use this format:\n*[Business Type] in [Location]*\n\nExample: *Salon in South Bopal Ahmedabad*`
      )
      return NextResponse.json(
        { error: 'Could not parse query', parsed },
        { status: 422 }
      )
    }

    // Update prompt with parsed data
    await supabase
      .from('daily_scrape_prompts')
      .update({
        parsed_industry: parsed.industry,
        parsed_location: parsed.location,
        status: 'parsed',
      })
      .eq('id', prompt.id)

    // Trigger the scrape
    const baseUrl = getBaseUrl(request)
    const scrapeResponse = await fetch(`${baseUrl}/api/scrape/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        industry: parsed.industry,
        location: parsed.location,
        raw_query: message,
        daily_prompt_id: prompt.id,
      }),
    })

    if (!scrapeResponse.ok) {
      const errBody = await scrapeResponse.json().catch(() => ({}))
      throw new Error(`Scrape trigger failed: ${JSON.stringify(errBody)}`)
    }

    const scrapeData = await scrapeResponse.json()

    // Update prompt status to scrape_triggered
    await supabase
      .from('daily_scrape_prompts')
      .update({
        scrape_job_id: scrapeData.scrape_job_id,
        status: 'scrape_triggered',
      })
      .eq('id', prompt.id)

    // Confirm to owner via WhatsApp
    await sendWhatsAppMessage(
      OWNER_PHONE,
      `✅ Got it! Scraping *${parsed.industry}* businesses in *${parsed.location}*...\n\nI'll send you a summary when done (usually 3-5 minutes).`
    )

    return NextResponse.json({
      message: 'Scrape triggered successfully',
      parsed,
      scrape_job_id: scrapeData.scrape_job_id,
      apify_run_id: scrapeData.apify_run_id,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Parse Reply] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function handleDirectQuery(query: string, request: NextRequest) {
  const parsed = await parseScrapeQuery(query)
  if (!parsed.industry || !parsed.location) return

  const baseUrl = getBaseUrl(request)
  await fetch(`${baseUrl}/api/scrape/trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      industry: parsed.industry,
      location: parsed.location,
      raw_query: query,
    }),
  })
}

function getBaseUrl(request: NextRequest): string {
  const n8nBase = process.env.N8N_BASE_URL
  if (n8nBase) return n8nBase
  const host = request.headers.get('host') || 'localhost:3000'
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  return `${protocol}://${host}`
}
