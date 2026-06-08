import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { startGoogleMapsScrape } from '@/lib/apify'

interface TriggerScrapeBody {
  industry: string
  location: string
  raw_query?: string
  daily_prompt_id?: string
}

// POST: Start a scrape job
export async function POST(request: NextRequest) {
  const supabase = createSupabaseServerClient()

  let body: TriggerScrapeBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { industry, location, raw_query, daily_prompt_id } = body

  if (!industry?.trim() || !location?.trim()) {
    return NextResponse.json(
      { error: 'industry and location are required' },
      { status: 400 }
    )
  }

  try {
    // Check for a recently running job for the same industry+location (deduplication)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data: existingJob } = await supabase
      .from('scrape_jobs')
      .select('id, status, apify_run_id')
      .eq('industry', industry.trim())
      .eq('location', location.trim())
      .in('status', ['pending', 'running'])
      .gte('created_at', fiveMinutesAgo)
      .limit(1)
      .single()

    if (existingJob) {
      return NextResponse.json(
        {
          message: 'Scrape already in progress for this industry/location',
          scrape_job_id: existingJob.id,
          apify_run_id: existingJob.apify_run_id,
        },
        { status: 200 }
      )
    }

    // Create scrape_job record
    const { data: scrapeJob, error: jobError } = await supabase
      .from('scrape_jobs')
      .insert({
        industry: industry.trim(),
        location: location.trim(),
        raw_query: raw_query?.trim() || `${industry} in ${location}`,
        status: 'pending',
        leads_count: 0,
      })
      .select()
      .single()

    if (jobError || !scrapeJob) {
      throw new Error(`Failed to create scrape job: ${jobError?.message}`)
    }

    // Build the webhook URL for Apify to call when done
    const baseUrl = getBaseUrl(request)
    const webhookUrl = `${baseUrl}/api/scrape/apify-complete`

    // Start Apify actor
    const apifyRunId = await startGoogleMapsScrape(
      industry.trim(),
      location.trim(),
      webhookUrl
    )

    // Update job with Apify run ID and running status
    await supabase
      .from('scrape_jobs')
      .update({
        status: 'running',
        apify_run_id: apifyRunId,
      })
      .eq('id', scrapeJob.id)

    return NextResponse.json(
      {
        message: 'Scrape job started',
        scrape_job_id: scrapeJob.id,
        apify_run_id: apifyRunId,
        industry: industry.trim(),
        location: location.trim(),
      },
      { status: 201 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Scrape Trigger] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function getBaseUrl(request: NextRequest): string {
  const n8nBase = process.env.N8N_BASE_URL
  if (n8nBase) return n8nBase
  const host = request.headers.get('host') || 'localhost:3000'
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  return `${protocol}://${host}`
}
