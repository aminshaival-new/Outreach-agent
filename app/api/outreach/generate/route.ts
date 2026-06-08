import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { generateOutreachMessage } from '@/lib/claude'

// POST: Generate a personalized outreach message for a lead
export async function POST(request: NextRequest) {
  const supabase = createSupabaseServerClient()

  let body: { lead_id: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { lead_id } = body

  if (!lead_id) {
    return NextResponse.json({ error: 'lead_id is required' }, { status: 400 })
  }

  // Fetch lead
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', lead_id)
    .single()

  if (leadError || !lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  try {
    // Generate personalized message via Claude
    const result = await generateOutreachMessage({
      business_name: lead.business_name,
      category: lead.category,
      city: lead.city,
      google_rating: lead.google_rating,
      review_count: lead.review_count,
      has_website: lead.has_website,
      website: lead.website,
      facebook_url: lead.facebook_url,
      instagram_url: lead.instagram_url,
    })

    // Store personalization data in the lead record
    await supabase
      .from('leads')
      .update({
        outreach_personalization: {
          personalization_angle: result.personalization_angle,
          pain_point: result.pain_point,
          generated_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', lead_id)

    return NextResponse.json({
      message: result.message,
      personalization_angle: result.personalization_angle,
      pain_point: result.pain_point,
      lead_id,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Outreach Generate] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
