import { ApifyClient } from 'apify-client'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApifyGoogleMapsInput {
  searchStringsArray: string[]
  maxCrawledPlacesPerSearch: number
  language: string
  countryCode: string
  scrapeContacts: boolean
  scrapeDirectories: boolean
  website: boolean
}

export interface ApifyGoogleMapsResult {
  title: string
  address: string
  city: string
  state: string
  countryCode: string
  phone: string
  website: string
  totalScore: number
  reviewsCount: number
  url: string
  placeId: string
  categoryName: string
  facebook: string
  instagram: string
  linkedin: string
  emails: string[]
}

// ─── Client ───────────────────────────────────────────────────────────────────

function getClient(): ApifyClient {
  const token = process.env.APIFY_API_TOKEN
  if (!token) throw new Error('Missing APIFY_API_TOKEN environment variable')
  return new ApifyClient({ token })
}

function getActorId(): string {
  return process.env.APIFY_ACTOR_ID || 'compass/google-maps-scraper'
}

// ─── Core Functions ───────────────────────────────────────────────────────────

/**
 * Start a Google Maps scrape actor run.
 * Registers a webhook so Apify calls back when the run finishes.
 * @returns The Apify run ID
 */
export async function startGoogleMapsScrape(
  industry: string,
  location: string,
  webhookUrl: string
): Promise<string> {
  const client = getClient()
  const actorId = getActorId()

  const input: ApifyGoogleMapsInput = {
    searchStringsArray: [`${industry} ${location}`],
    maxCrawledPlacesPerSearch: 20,
    language: 'en',
    countryCode: 'in',
    scrapeContacts: true,
    scrapeDirectories: false,
    website: true,
  }

  const run = await client.actor(actorId).start(input, {
    webhooks: [
      {
        eventTypes: ['ACTOR.RUN.SUCCEEDED', 'ACTOR.RUN.FAILED'],
        requestUrl: webhookUrl,
        payloadTemplate: JSON.stringify({
          runId: '{{runId}}',
          actorId: '{{actorId}}',
          status: '{{status}}',
          defaultDatasetId: '{{defaultDatasetId}}',
        }),
      },
    ],
  })

  return run.id
}

/**
 * Fetch all dataset items from a completed Apify run.
 */
export async function getApifyRunResults(runId: string): Promise<ApifyGoogleMapsResult[]> {
  const client = getClient()

  // Get run details to locate the dataset
  const run = await client.run(runId).get()

  if (!run) {
    throw new Error(`Apify run ${runId} not found`)
  }

  if (!run.defaultDatasetId) {
    throw new Error(`Apify run ${runId} has no dataset`)
  }

  // Paginate through all items
  const allItems: ApifyGoogleMapsResult[] = []
  let offset = 0
  const limit = 100

  while (true) {
    const { items, total, count } = await client
      .dataset(run.defaultDatasetId)
      .listItems({ offset, limit })

    allItems.push(...(items as ApifyGoogleMapsResult[]))
    offset += count

    if (offset >= total || count < limit) break
  }

  return allItems
}

/**
 * Get the current status of an Apify run.
 */
export async function getApifyRunStatus(runId: string): Promise<{
  id: string
  status: string
  defaultDatasetId: string
}> {
  const client = getClient()
  const run = await client.run(runId).get()

  if (!run) {
    throw new Error(`Apify run ${runId} not found`)
  }

  return {
    id: run.id,
    status: run.status,
    defaultDatasetId: run.defaultDatasetId,
  }
}

// ─── Normalization ────────────────────────────────────────────────────────────

/**
 * Normalize a raw Apify result into the shape expected by our database.
 */
export function normalizeApifyResult(result: ApifyGoogleMapsResult): {
  business_name: string
  phone: string | null
  email: string | null
  website: string | null
  address: string | null
  city: string | null
  state: string | null
  country: string
  google_rating: number | null
  review_count: number
  google_maps_url: string | null
  place_id: string | null
  category: string | null
  facebook_url: string | null
  instagram_url: string | null
  linkedin_url: string | null
} {
  return {
    business_name: result.title?.trim() || 'Unknown Business',
    phone: result.phone?.trim() || null,
    email: result.emails?.[0]?.trim() || null,
    website: result.website?.trim() || null,
    address: result.address?.trim() || null,
    city: result.city?.trim() || null,
    state: result.state?.trim() || null,
    country: result.countryCode?.toLowerCase() === 'in' ? 'India' : result.countryCode || 'India',
    google_rating: result.totalScore ? Number(result.totalScore) : null,
    review_count: result.reviewsCount || 0,
    google_maps_url: result.url?.trim() || null,
    place_id: result.placeId?.trim() || null,
    category: result.categoryName?.trim() || null,
    facebook_url: result.facebook?.trim() || null,
    instagram_url: result.instagram?.trim() || null,
    linkedin_url: result.linkedin?.trim() || null,
  }
}

/**
 * Calculate a lead score (0–100) based on available contact and business data.
 */
export function calculateLeadScore(
  result: ReturnType<typeof normalizeApifyResult>
): number {
  let score = 0

  // Phone available: +30 (required for WhatsApp outreach)
  if (result.phone) score += 30

  // No website: +25 (highest value — they need digital presence)
  if (!result.website) score += 25

  // Good Google rating: +15 (established business worth targeting)
  if (result.google_rating && result.google_rating >= 4.0) score += 15

  // Has reviews (not a ghost listing): +10
  if (result.review_count > 10) score += 10

  // Email available: +10 (secondary contact channel)
  if (result.email) score += 10

  // Social media presence (shows digital awareness): +5 per platform, max +10
  if (result.facebook_url) score += 5
  if (result.instagram_url) score += 5

  return Math.min(score, 100)
}
