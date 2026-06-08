import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, type PipelineStage } from '@/lib/supabase'

// GET: List leads with filters
export async function GET(request: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { searchParams } = new URL(request.url)

  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
  const offset = (page - 1) * limit

  const stage = searchParams.get('stage') as PipelineStage | null
  const industry = searchParams.get('industry')
  const hasWebsite = searchParams.get('has_website')
  const search = searchParams.get('search')
  const scrapeJobId = searchParams.get('scrape_job_id')
  const sortBy = searchParams.get('sort_by') || 'created_at'
  const sortOrder = searchParams.get('sort_order') === 'asc' ? true : false

  let query = supabase
    .from('leads')
    .select('*', { count: 'exact' })
    .order(sortBy, { ascending: sortOrder })
    .range(offset, offset + limit - 1)

  if (stage) query = query.eq('pipeline_stage', stage)
  if (industry) query = query.ilike('category', `%${industry}%`)
  if (scrapeJobId) query = query.eq('scrape_job_id', scrapeJobId)
  if (hasWebsite === 'true') query = query.eq('has_website', true)
  if (hasWebsite === 'false') query = query.eq('has_website', false)
  if (search) {
    query = query.or(
      `business_name.ilike.%${search}%,city.ilike.%${search}%,phone.ilike.%${search}%`
    )
  }

  const { data: leads, count, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    data: leads || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      total_pages: Math.ceil((count || 0) / limit),
    },
  })
}

// POST: Create a lead manually
export async function POST(request: NextRequest) {
  const supabase = createSupabaseServerClient()

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.business_name) {
    return NextResponse.json({ error: 'business_name is required' }, { status: 400 })
  }

  const { data: lead, error } = await supabase
    .from('leads')
    .insert({
      business_name: body.business_name as string,
      phone: (body.phone as string) || null,
      email: (body.email as string) || null,
      website: (body.website as string) || null,
      address: (body.address as string) || null,
      city: (body.city as string) || null,
      state: (body.state as string) || null,
      category: (body.category as string) || null,
      google_rating: (body.google_rating as number) || null,
      review_count: (body.review_count as number) || 0,
      google_maps_url: (body.google_maps_url as string) || null,
      place_id: (body.place_id as string) || null,
      facebook_url: (body.facebook_url as string) || null,
      instagram_url: (body.instagram_url as string) || null,
      linkedin_url: (body.linkedin_url as string) || null,
      lead_score: (body.lead_score as number) || 0,
      pipeline_stage: (body.pipeline_stage as PipelineStage) || 'new',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: lead }, { status: 201 })
}
