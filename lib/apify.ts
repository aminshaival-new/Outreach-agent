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

interface ApifyRunResponse {
  data: {
    id: string
    actId: string
    status: string
    defaultDatasetId: string
    defaultKeyValueStoreId: string
  }
}

interface ApifyDatasetResponse {
  data: {
    items: ApifyGoogleMapsResult[]
    total: number
    count: number
    offset: number
    limit: number
    desc: boolean
  }
}

interface ApifyRunStatusResponse {
  data: {
    id: string
    status: 'READY' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'TIMING-OUT' | 'TIMED-OUT' | 'ABORTING' | 'ABORTED'
    defaultDatasetId: string
    stats: {
      durationMillis: number
    }
  }
}

// ─── Config ───────────────────────────────────────────────────────────────────

const APIFY_BASE_URL = 'https://api.apify.com/v2'

function getToken(): string {
  const token = process.env.APIFY_API_TOKEN
  if (!token) throw new Error('Missing APIFY_API_TOKEN environment variable')
  return token
}

function getActorId(): string {
  return process.env.APIFY_ACTOR_ID || 'compass/google-maps-scraper'
}

// ─── Core Functions ───────────────────────────────────────────────────────────

/**
 * Start a Google Maps scrape actor run.
 * @returns The Apify run ID
 */
export async function startGoogleMapsScrape(
  industry: string,
  location: string,
  webhookUrl: string
): Promise<string> {
  const token = getToken()
  const actorId = getActorId()
  const encodedActorId = encodeURIComponent(actorId)

  const searchQuery = `${industry} ${location}`

  const input: ApifyGoogleMapsInput = {
    searchStringsArray: [searchQuery],
    maxCrawledPlacesPerSearch: 20,
    language: 'en',
    countryCode: 'in',
    scrapeContacts: true,
    scrapeDirectories: false,
    website: true,
  }

  // Build webhook URL with auth
  const webhookPayload = {
    eventTypes: ['ACTOR.RUN.SUCCEEDED', 'ACTOR.RUN.FAILED'],
    requestUrl: webhookUrl,
    payloadTemplate: JSON.stringify({
      runId: '{{runId}}',
      actorId: '{{actorId}}',
      status: '{{status}}',
      defaultDatasetId: '{{defaultDatasetId}}',
    }),
  }

  const webhooksParam = encodeURIComponent(
    Buffer.from(JSON.stringify([webhookPayload])).toString('base64')
  )

  const url = `${APIFY_BASE_URL}/acts/${encodedActorId}/runs?token=${token}&webhooks=${webhooksParam}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Apify actor start failed (${response.status}): ${errorBody}`)
  }

  const data: ApifyRunResponse = await response.json()
  return data.data.id
}

/**
 * Fetch all results from a completed Apify run's default dataset.
 */
export async function getApifyRunResults(runId: string): Promise<ApifyGoogleMapsResult[]> {
  const token = getToken()

  // First, get the run details to find the dataset ID
  const runUrl = `${APIFY_BASE_URL}/actor-runs/${runId}?token=${token}`
  const runResponse = await fetch(runUrl)

  if (!runResponse.ok) {
    throw new Error(`Failed to fetch Apify run details (${runResponse.status})`)
  }

  const runData: ApifyRunStatusResponse = await runResponse.json()
  const datasetId = runData.data.defaultDatasetId

  // Paginate through all items
  const allItems: ApifyGoogleMapsResult[] = []
  const pageSize = 100
  let offset = 0
  let hasMore = true

  while (hasMore) {
    const datasetUrl = `${APIFY_BASE_URL}/datasets/${datasetId}/items?token=${token}&offset=${offset}&limit=${pageSize}&format=json`
    const datasetResponse = await fetch(datasetUrl)

    if (!datasetResponse.ok) {
      throw new Error(`Failed to fetch Apify dataset (${datasetResponse.status})`)
    }

    const datasetData: ApifyDatasetResponse = await datasetResponse.json()
    const items = datasetData.data.items

    allItems.push(...items)
    offset += items.length

    // Stop if we received fewer items than the page size
    hasMore = items.length === pageSize && offset < datasetData.data.total
  }

  return allItems
}

/**
 * Get the status of a running Apify run.
 */
export async function getApifyRunStatus(runId: string): Promise<ApifyRunStatusResponse['data']> {
  const token = getToken()
  const url = `${APIFY_BASE_URL}/actor-runs/${runId}?token=${token}`

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to fetch Apify run status (${response.status})`)
  }

  const data: ApifyRunStatusResponse = await response.json()
  return data.data
}

/**
 * Map raw Apify result to the normalized format expected by our database.
 * Returns null if the result lacks both a phone number and any contact info.
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
    business_name: result.title || 'Unknown Business',
    phone: result.phone?.trim() || null,
    email: result.emails?.[0]?.trim() || null,
    website: result.website?.trim() || null,
    address: result.address?.trim() || null,
    city: result.city?.trim() || null,
    state: result.state?.trim() || null,
    country: result.countryCode === 'in' ? 'India' : result.countryCode || 'India',
    google_rating: result.totalScore || null,
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
 * Calculate a lead score (0–100) based on available data points.
 */
export function calculateLeadScore(result: ReturnType<typeof normalizeApifyResult>): number {
  let score = 0

  // Phone available: +30 (required for WhatsApp outreach)
  if (result.phone) score += 30

  // No website: +25 (high value — they need one)
  if (!result.website) score += 25

  // Has good Google rating: +15
  if (result.google_rating && result.google_rating >= 4.0) score += 15

  // Has reviews (established business): +10
  if (result.review_count > 10) score += 10

  // Email available: +10
  if (result.email) score += 10

  // Social media presence indicates digital awareness: +5 each, max 10
  if (result.facebook_url || result.instagram_url) score += 5
  if (result.instagram_url) score += 5

  return Math.min(score, 100)
}
