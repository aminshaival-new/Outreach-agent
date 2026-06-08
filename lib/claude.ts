import Anthropic from '@anthropic-ai/sdk'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ParsedScrapeQuery {
  industry: string
  location: string
  confidence: number
}

export interface OutreachMessageResult {
  message: string
  personalization_angle: string
  pain_point: string
}

export interface SalesReplyResult {
  reply: string
  action: 'continue' | 'book_call' | 'close' | 'lost'
  extracted_info: {
    pain_points?: string[]
    interest_level?: 'low' | 'medium' | 'high'
    objections?: string[]
  }
}

// ─── Client ───────────────────────────────────────────────────────────────────

let client: Anthropic | null = null

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.CLAUDE_API_KEY
    if (!apiKey) throw new Error('Missing CLAUDE_API_KEY environment variable')
    client = new Anthropic({ apiKey })
  }
  return client
}

// ─── System Prompts ───────────────────────────────────────────────────────────

const OUTREACH_SYSTEM_PROMPT = `You are an expert digital marketing consultant generating personalized WhatsApp outreach messages for local businesses in India.

Rules:
- Keep messages under 150 words
- Be conversational, not salesy
- Mention their specific business name
- If they have no website: focus on how they're missing online customers
- If they have a website but poor online presence: focus on growth
- Mention their location (e.g., "in Ahmedabad")
- Always end with a soft question
- Write in English (they'll understand)
- Never use emojis excessively (max 1-2)
- Sound like a helpful friend, not a salesperson`

const SALES_AGENT_SYSTEM_PROMPT = `You are an expert B2B sales agent for a digital marketing agency in India. You are talking to local business owners via WhatsApp.

Your goals (in order):
1. Acknowledge their reply warmly
2. Discover their current online presence challenges
3. Qualify: Do they want more customers? Do they have budget?
4. If interested → book a 15-minute discovery call
5. If asking for price → give range: ₹15,000-₹50,000/month depending on scope

Your service: You build professional websites + Google Business Profile optimization for local businesses, helping them get found online and convert visitors to customers.

Rules:
- Keep messages under 100 words
- Be warm and conversational in Indian English
- Never be pushy
- If they say "not interested" → respond gracefully, wish them well
- If they ask technical questions → keep it simple`

// ─── Helper ───────────────────────────────────────────────────────────────────

function safeParseJSON<T>(text: string, fallback: T): T {
  // Extract JSON from code blocks if present
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const jsonText = codeBlockMatch ? codeBlockMatch[1].trim() : text.trim()

  // Extract first {...} or [...] block
  const objectMatch = jsonText.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
  if (!objectMatch) return fallback

  try {
    return JSON.parse(objectMatch[1]) as T
  } catch {
    return fallback
  }
}

// ─── Functions ────────────────────────────────────────────────────────────────

/**
 * Parse a natural language scrape query into structured industry + location.
 * Examples: "Salon in South Bopal" → { industry: "Salon", location: "South Bopal", confidence: 0.95 }
 */
export async function parseScrapeQuery(userMessage: string): Promise<ParsedScrapeQuery> {
  const anthropic = getClient()

  const response = await anthropic.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 256,
    messages: [
      {
        role: 'user',
        content: `Parse this business search query and extract the industry/business type and location.

Query: "${userMessage}"

Respond with JSON only, no explanation:
{
  "industry": "extracted business type (e.g., Salon, Dentist, Gym, Restaurant)",
  "location": "extracted location (e.g., South Bopal Ahmedabad, Baner Pune)",
  "confidence": 0.0 to 1.0
}

If you cannot extract both, use empty strings for missing fields and set confidence to 0.`,
      },
    ],
  })

  const responseText = response.content[0].type === 'text' ? response.content[0].text : ''

  return safeParseJSON<ParsedScrapeQuery>(responseText, {
    industry: '',
    location: '',
    confidence: 0,
  })
}

/**
 * Generate a personalized WhatsApp outreach message for a lead.
 */
export async function generateOutreachMessage(lead: {
  business_name: string
  category: string | null
  city: string | null
  google_rating: number | null
  review_count: number
  has_website: boolean
  website?: string | null
  facebook_url?: string | null
  instagram_url?: string | null
}): Promise<OutreachMessageResult> {
  const anthropic = getClient()

  const leadContext = `
Business: ${lead.business_name}
Category: ${lead.category || 'Local Business'}
City: ${lead.city || 'Ahmedabad'}
Google Rating: ${lead.google_rating ? `${lead.google_rating}/5` : 'Not listed'}
Reviews: ${lead.review_count}
Has Website: ${lead.has_website ? `Yes (${lead.website})` : 'No'}
Has Facebook: ${lead.facebook_url ? 'Yes' : 'No'}
Has Instagram: ${lead.instagram_url ? 'Yes' : 'No'}
`.trim()

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 512,
    system: OUTREACH_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Generate a personalized WhatsApp outreach message for this business. Also identify the key personalization angle and main pain point.

${leadContext}

Respond with JSON only:
{
  "message": "the WhatsApp message text",
  "personalization_angle": "brief description of what makes this message specific to them",
  "pain_point": "the core problem they likely face that we can solve"
}`,
      },
    ],
  })

  const responseText = response.content[0].type === 'text' ? response.content[0].text : ''

  return safeParseJSON<OutreachMessageResult>(responseText, {
    message: `Hi! I noticed ${lead.business_name} in ${lead.city || 'your area'} and wanted to reach out. We help local businesses get more customers online. Would you be open to a quick chat?`,
    personalization_angle: 'Generic outreach',
    pain_point: 'Online visibility',
  })
}

/**
 * Generate an AI sales agent reply to an incoming WhatsApp message.
 */
export async function generateSalesReply(
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  leadContext: {
    business_name: string
    category: string | null
    city: string | null
    has_website: boolean
  }
): Promise<SalesReplyResult> {
  const anthropic = getClient()

  const contextNote = `
Current lead context:
- Business: ${leadContext.business_name}
- Type: ${leadContext.category || 'Local Business'}
- City: ${leadContext.city || 'Ahmedabad'}
- Has website: ${leadContext.has_website ? 'Yes' : 'No'}
`.trim()

  // Build messages for Claude — inject context as first user message
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    {
      role: 'user',
      content: `[CONTEXT — not from lead]\n${contextNote}\n\n[CONVERSATION STARTS]`,
    },
    {
      role: 'assistant',
      content: 'Understood. I have the context. Ready to handle the conversation.',
    },
    ...conversationHistory,
    {
      role: 'user',
      content: `Based on this conversation, generate my next reply AND analyze the conversation state.

Respond with JSON only:
{
  "reply": "your response message (under 100 words)",
  "action": "continue" | "book_call" | "close" | "lost",
  "extracted_info": {
    "pain_points": ["string array of identified pain points"],
    "interest_level": "low" | "medium" | "high",
    "objections": ["string array of objections raised"]
  }
}

action meanings:
- continue: keep the conversation going
- book_call: lead is ready to book a discovery call
- close: lead has agreed to work with us
- lost: lead said no or not interested`,
    },
  ]

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 512,
    system: SALES_AGENT_SYSTEM_PROMPT,
    messages,
  })

  const responseText = response.content[0].type === 'text' ? response.content[0].text : ''

  return safeParseJSON<SalesReplyResult>(responseText, {
    reply: "Thanks for your message! I'd love to share more about how we can help your business grow online. Can I ask — are you currently getting enough customers through online searches?",
    action: 'continue',
    extracted_info: {
      interest_level: 'medium',
    },
  })
}

/**
 * Generate a follow-up message for a lead that hasn't replied.
 */
export async function generateFollowUpMessage(
  lead: {
    business_name: string
    category: string | null
    city: string | null
  },
  followUpNumber: 1 | 2,
  originalMessage: string
): Promise<string> {
  const anthropic = getClient()

  const followUpContext =
    followUpNumber === 1
      ? 'This is a first follow-up, 2 days after the initial message. Be gentle, assume they were busy.'
      : 'This is the second and final follow-up, 5 days after the initial message. Keep it brief and leave the door open.'

  const response = await anthropic.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 256,
    system: OUTREACH_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Generate a follow-up WhatsApp message.

Business: ${lead.business_name}
Category: ${lead.category || 'Local Business'}
City: ${lead.city || 'Ahmedabad'}
Follow-up number: ${followUpNumber}
Context: ${followUpContext}

Original message sent:
"${originalMessage}"

Keep it short (under 80 words), friendly, and not pushy. Don't repeat the original pitch verbatim.
Reply with just the message text, no JSON needed.`,
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text.trim() : ''

  if (!text) {
    return followUpNumber === 1
      ? `Hi! Just following up on my message about ${lead.business_name}'s online presence. Did you get a chance to read it? Happy to chat if you have 5 minutes. 😊`
      : `Hi! Last check-in from my side — if you ever want to explore how we can help ${lead.business_name} get more online customers, feel free to reach out anytime. Best wishes!`
  }

  return text
}
