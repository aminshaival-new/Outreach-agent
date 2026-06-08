import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { parseScrapeQuery } from '@/lib/claude'

// POST: Manual scrape trigger from dashboard
export async function POST(request: NextRequest) {
  let body: { query?: string; industry?: string; location?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  let industry: string
  let location: string
  let rawQuery: string

  if (body.industry && body.location) {
    // Direct structured input
    industry = body.industry.trim()
    location = body.location.trim()
    rawQuery = `${industry} in ${location}`
  } else if (body.query) {
    // Parse natural language query
    rawQuery = body.query.trim()
    const parsed = await parseScrapeQuery(rawQuery)

    if (!parsed.industry || !parsed.location || parsed.confidence < 0.3) {
      return NextResponse.json(
        {
          error: 'Could not parse query. Use format: "Salon in South Bopal Ahmedabad"',
          parsed,
        },
        { status: 422 }
      )
    }

    industry = parsed.industry
    location = parsed.location
  } else {
    return NextResponse.json(
      { error: 'Provide either "query" or both "industry" and "location"' },
      { status: 400 }
    )
  }

  // Forward to trigger endpoint
  const baseUrl = getBaseUrl(request)
  const triggerResponse = await fetch(`${baseUrl}/api/scrape/trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ industry, location, raw_query: rawQuery }),
  })

  const triggerData = await triggerResponse.json()

  if (!triggerResponse.ok) {
    return NextResponse.json(triggerData, { status: triggerResponse.status })
  }

  return NextResponse.json(triggerData, { status: 201 })
}

// GET: List all scrape jobs with pagination
export async function GET(request: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { searchParams } = new URL(request.url)

  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
  const offset = (page - 1) * limit
  const status = searchParams.get('status')

  let query = supabase
    .from('scrape_jobs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) {
    query = query.eq('status', status)
  }

  const { data: jobs, count, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    data: jobs || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      total_pages: Math.ceil((count || 0) / limit),
    },
  })
}

function getBaseUrl(request: NextRequest): string {
  const n8nBase = process.env.N8N_BASE_URL
  if (n8nBase) return n8nBase
  const host = request.headers.get('host') || 'localhost:3000'
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  return `${protocol}://${host}`
}
