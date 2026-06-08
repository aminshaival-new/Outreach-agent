import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { getApifyRunResults, normalizeApifyResult, calculateLeadScore } from '@/lib/apify'
import { uploadLeadsToGoogleDrive } from '@/lib/google-drive'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

const OWNER_PHONE = process.env.WHATSAPP_OWNER_PHONE || '919727686181'

interface ApifyWebhookPayload {
  runId: string
  actorId: string
  status: 'SUCCEEDED' | 'FAILED' | string
  defaultDatasetId?: string
}

// POST: Called by Apify webhook when a run completes
export async function POST(request: NextRequest) {
  // Validate shared secret if configured
  const n8nSecret = process.env.N8N_WEBHOOK_SECRET
  if (n8nSecret) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${n8nSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  let payload: ApifyWebhookPayload
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { runId, status } = payload

  if (!runId) {
    return NextResponse.json({ error: 'runId is required' }, { status: 400 })
  }

  const supabase = createSupabaseServerClient()

  // Find the scrape job associated with this Apify run
  const { data: scrapeJob, error: jobError } = await supabase
    .from('scrape_jobs')
    .select('*')
    .eq('apify_run_id', runId)
    .single()

  if (jobError || !scrapeJob) {
    console.error(`[Apify Complete] No scrape job found for run ${runId}`)
    return NextResponse.json({ error: 'Scrape job not found' }, { status: 404 })
  }

  // Handle failed runs
  if (status === 'FAILED') {
    await supabase
      .from('scrape_jobs')
      .update({
        status: 'failed',
        error_message: `Apify run ${runId} failed`,
        completed_at: new Date().toISOString(),
      })
      .eq('id', scrapeJob.id)

    await sendWhatsAppMessage(
      OWNER_PHONE,
      `❌ Scrape failed for *${scrapeJob.industry}* in *${scrapeJob.location}*.\n\nApify run ID: ${runId}\nPlease check the Apify console for details.`
    ).catch(console.error)

    return NextResponse.json({ message: 'Failure recorded' })
  }

  try {
    // 1. Fetch results from Apify
    const rawResults = await getApifyRunResults(runId)

    // 2. Normalize and filter results
    const normalizedResults = rawResults
      .map((r) => normalizeApifyResult(r))
      .filter((r) => r.business_name && r.business_name !== 'Unknown Business')

    // 3. Deduplicate by place_id (if available) then by business_name+phone
    const seen = new Set<string>()
    const uniqueResults = normalizedResults.filter((r) => {
      const key = r.place_id || `${r.business_name}_${r.phone}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    // 4. Insert all leads into Supabase
    const leadsToInsert = uniqueResults.map((r) => ({
      scrape_job_id: scrapeJob.id,
      ...r,
      lead_score: calculateLeadScore(r),
      pipeline_stage: 'new' as const,
    }))

    let insertedLeads: typeof leadsToInsert & { id: string }[] = []

    if (leadsToInsert.length > 0) {
      // Insert in batches of 50 to stay within Supabase limits
      const batchSize = 50
      const allInserted: Array<{ id: string }> = []

      for (let i = 0; i < leadsToInsert.length; i += batchSize) {
        const batch = leadsToInsert.slice(i, i + batchSize)
        const { data: inserted, error: insertError } = await supabase
          .from('leads')
          .insert(batch)
          .select('id')

        if (insertError) {
          console.error(`[Apify Complete] Batch insert error at offset ${i}:`, insertError.message)
          continue
        }

        if (inserted) allInserted.push(...inserted)
      }

      insertedLeads = allInserted as typeof insertedLeads
    }

    const actualLeadsCount = insertedLeads.length

    // 5. Update scrape_job with lead count
    await supabase
      .from('scrape_jobs')
      .update({
        leads_count: actualLeadsCount,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', scrapeJob.id)

    // 6. Generate Excel file and upload to Google Drive
    let driveFileUrl: string | null = null
    let driveFileId: string | null = null

    if (actualLeadsCount > 0) {
      try {
        // Fetch all inserted leads for Excel generation
        const { data: fullLeads } = await supabase
          .from('leads')
          .select('*')
          .eq('scrape_job_id', scrapeJob.id)
          .order('lead_score', { ascending: false })

        if (fullLeads && fullLeads.length > 0) {
          const driveResult = await uploadLeadsToGoogleDrive(fullLeads, {
            industry: scrapeJob.industry,
            location: scrapeJob.location,
            created_at: scrapeJob.created_at,
          })

          driveFileUrl = driveResult.webViewLink
          driveFileId = driveResult.fileId

          await supabase
            .from('scrape_jobs')
            .update({
              drive_file_url: driveFileUrl,
              drive_file_id: driveFileId,
            })
            .eq('id', scrapeJob.id)
        }
      } catch (driveError) {
        console.error('[Apify Complete] Google Drive upload failed:', driveError)
        // Non-fatal — continue without Drive URL
      }
    }

    // 7. Trigger batch outreach for leads that have phone numbers
    const baseUrl = getBaseUrl(request)
    const leadIdsWithPhone = insertedLeads
      .slice(0, 20) // Limit initial batch to 20 leads to avoid rate limits
      .map((l) => l.id)

    if (leadIdsWithPhone.length > 0) {
      fetch(`${baseUrl}/api/outreach/batch-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_ids: leadIdsWithPhone }),
      }).catch((err) => {
        console.error('[Apify Complete] Batch send trigger failed:', err)
      })
    }

    // 8. Send WhatsApp summary to owner
    const withPhone = uniqueResults.filter((r) => r.phone).length
    const withWebsite = uniqueResults.filter((r) => r.website).length
    const noWebsite = actualLeadsCount - withWebsite

    let summaryMessage = `✅ *Scrape Complete!*\n\n`
    summaryMessage += `📍 *${scrapeJob.industry}* in *${scrapeJob.location}*\n\n`
    summaryMessage += `📊 Results:\n`
    summaryMessage += `• Total leads: *${actualLeadsCount}*\n`
    summaryMessage += `• With phone: *${withPhone}*\n`
    summaryMessage += `• Without website: *${noWebsite}* (high priority)\n`
    summaryMessage += `• With website: *${withWebsite}*\n\n`
    summaryMessage += `🚀 Sending WhatsApp outreach to ${Math.min(leadIdsWithPhone.length, withPhone)} leads now...`

    if (driveFileUrl) {
      summaryMessage += `\n\n📥 Excel file: ${driveFileUrl}`
    }

    await sendWhatsAppMessage(OWNER_PHONE, summaryMessage).catch(console.error)

    return NextResponse.json({
      message: 'Scrape completed and processed',
      scrape_job_id: scrapeJob.id,
      leads_inserted: actualLeadsCount,
      drive_file_url: driveFileUrl,
      outreach_triggered: leadIdsWithPhone.length,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Apify Complete] Processing error:', message)

    await supabase
      .from('scrape_jobs')
      .update({
        status: 'failed',
        error_message: message,
        completed_at: new Date().toISOString(),
      })
      .eq('id', scrapeJob.id)

    await sendWhatsAppMessage(
      OWNER_PHONE,
      `❌ Error processing scrape results for *${scrapeJob.industry}* in *${scrapeJob.location}*.\n\nError: ${message}`
    ).catch(console.error)

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
