import { createClient, SupabaseClient } from '@supabase/supabase-js'

// =============================================================================
// UNION TYPES — pipeline stages and statuses
// =============================================================================

export type PipelineStage =
  | 'new'
  | 'contacted'
  | 'replied'
  | 'interested'
  | 'call_booked'
  | 'closed_won'
  | 'closed_lost'
  | 'not_interested'

export type ScrapeJobStatus = 'pending' | 'running' | 'completed' | 'failed'

export type OutreachMessageType = 'initial' | 'followup_1' | 'followup_2'

export type OutreachMessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed'

export type ConversationStatus = 'active' | 'closed' | 'spam'

export type MessageDirection = 'inbound' | 'outbound'

export type MessageSender = 'ai_agent' | 'lead' | 'owner'

export type FollowUpType = 'followup_1' | 'followup_2'

export type FollowUpStatus = 'pending' | 'sent' | 'cancelled' | 'skipped'

export type DailyScrapePromptStatus =
  | 'prompt_sent'
  | 'reply_received'
  | 'parsed'
  | 'scrape_triggered'
  | 'completed'


// =============================================================================
// TABLE ROW TYPES
// =============================================================================

export interface ScrapeJob {
  id: string
  industry: string
  location: string
  raw_query: string
  status: ScrapeJobStatus
  apify_run_id: string | null
  leads_count: number
  drive_file_url: string | null
  drive_file_id: string | null
  error_message: string | null
  created_at: string
  completed_at: string | null
}

export interface Lead {
  id: string
  scrape_job_id: string | null

  // Business info
  business_name: string
  phone: string | null
  email: string | null
  website: string | null
  address: string | null
  city: string | null
  state: string | null
  country: string

  // Google Maps data
  google_rating: number | null
  review_count: number
  google_maps_url: string | null
  place_id: string | null
  category: string | null

  // Social media
  facebook_url: string | null
  instagram_url: string | null
  linkedin_url: string | null

  // Lead qualification
  has_website: boolean   // generated column — read-only
  lead_score: number

  // Pipeline
  pipeline_stage: PipelineStage

  // AI personalization
  outreach_personalization: OutreachPersonalization | null

  created_at: string
  updated_at: string
}

/** Shape of the JSONB stored in leads.outreach_personalization */
export interface OutreachPersonalization {
  hook: string
  pain_point: string
  offer_angle: string
  [key: string]: unknown
}

export interface OutreachMessage {
  id: string
  lead_id: string

  message_type: OutreachMessageType
  message_body: string

  // WhatsApp Cloud API
  wa_message_id: string | null
  wa_phone_number: string | null

  status: OutreachMessageStatus
  sent_at: string | null
  delivered_at: string | null
  read_at: string | null

  // Scheduling
  scheduled_at: string | null

  created_at: string
}

export interface Conversation {
  id: string
  lead_id: string
  wa_phone_number: string

  status: ConversationStatus

  // AI agent state
  ai_context: ConversationContextMessage[]
  ai_summary: string | null

  // Qualification
  pain_points: string[]
  call_booked_at: string | null
  call_notes: string | null

  last_message_at: string | null
  created_at: string
  updated_at: string
}

/** Shape of each entry in conversations.ai_context (Claude message format) */
export interface ConversationContextMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ConversationMessage {
  id: string
  conversation_id: string

  direction: MessageDirection
  sender: MessageSender
  message_body: string

  wa_message_id: string | null

  created_at: string
}

export interface FollowUpQueue {
  id: string
  lead_id: string

  follow_up_type: FollowUpType
  scheduled_at: string

  status: FollowUpStatus

  executed_at: string | null
  created_at: string
}

export interface DailyScrapePrompt {
  id: string

  prompt_sent_at: string | null
  user_reply: string | null
  reply_received_at: string | null

  parsed_industry: string | null
  parsed_location: string | null

  scrape_job_id: string | null

  status: DailyScrapePromptStatus

  created_at: string
}


// =============================================================================
// VIEW ROW TYPES
// =============================================================================

export interface DashboardStats {
  leads_new: number
  leads_contacted: number
  leads_replied: number
  leads_interested: number
  leads_call_booked: number
  leads_closed_won: number
  leads_closed_lost: number
  leads_not_interested: number
  total_leads: number
  total_contacted: number
  messages_sent: number
  messages_delivered: number
  messages_read: number
  active_conversations: number
  pending_followups: number
  total_scrape_jobs: number
}

export interface PendingFollowup {
  queue_id: string
  follow_up_type: FollowUpType
  scheduled_at: string
  queued_at: string

  lead_id: string
  business_name: string
  phone: string | null
  city: string | null
  pipeline_stage: PipelineStage
  lead_score: number
  outreach_personalization: OutreachPersonalization | null

  industry: string
  scrape_location: string
}


// =============================================================================
// DATABASE TYPE MAP (Supabase generic client)
// =============================================================================

export type Database = {
  public: {
    Tables: {
      scrape_jobs: {
        Row: ScrapeJob
        Insert: Omit<ScrapeJob, 'id' | 'created_at'>
        Update: Partial<Omit<ScrapeJob, 'id' | 'created_at'>>
      }
      leads: {
        Row: Lead
        Insert: Omit<Lead, 'id' | 'created_at' | 'updated_at' | 'has_website'>
        Update: Partial<Omit<Lead, 'id' | 'created_at' | 'has_website'>>
      }
      outreach_messages: {
        Row: OutreachMessage
        Insert: Omit<OutreachMessage, 'id' | 'created_at'>
        Update: Partial<Omit<OutreachMessage, 'id' | 'created_at'>>
      }
      conversations: {
        Row: Conversation
        Insert: Omit<Conversation, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Conversation, 'id' | 'created_at'>>
      }
      conversation_messages: {
        Row: ConversationMessage
        Insert: Omit<ConversationMessage, 'id' | 'created_at'>
        Update: Partial<Omit<ConversationMessage, 'id' | 'created_at'>>
      }
      follow_up_queue: {
        Row: FollowUpQueue
        Insert: Omit<FollowUpQueue, 'id' | 'created_at'>
        Update: Partial<Omit<FollowUpQueue, 'id' | 'created_at'>>
      }
      daily_scrape_prompts: {
        Row: DailyScrapePrompt
        Insert: Omit<DailyScrapePrompt, 'id' | 'created_at'>
        Update: Partial<Omit<DailyScrapePrompt, 'id' | 'created_at'>>
      }
    }
    Views: {
      v_dashboard_stats: {
        Row: DashboardStats
      }
      v_pending_followups: {
        Row: PendingFollowup
      }
    }
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}


// =============================================================================
// CLIENT FACTORIES
// =============================================================================

/**
 * Public/browser client — uses the anon key.
 * Safe to use in Next.js client components and API routes that run
 * under a user JWT. RLS policies are enforced.
 */
export function createSupabaseClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.'
    )
  }

  return createClient<Database>(url, key)
}

/**
 * Server/service-role client — uses the service role key.
 * Bypasses RLS entirely. Only use in:
 *   - GitHub Actions / cron workers
 *   - Next.js Route Handlers that need full data access
 *   - Railway bot server
 * NEVER expose this client to the browser.
 */
export function createSupabaseServiceClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.'
    )
  }

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}


// =============================================================================
// TYPED QUERY HELPERS
// =============================================================================

/**
 * Fetch the current dashboard stats snapshot.
 * Returns null when the view returns no rows (should never happen in practice).
 */
export async function getDashboardStats(
  client: SupabaseClient<Database>
): Promise<DashboardStats | null> {
  const { data, error } = await client
    .from('v_dashboard_stats')
    .select('*')
    .single()

  if (error) throw new Error(`getDashboardStats: ${error.message}`)
  return data
}

/**
 * Fetch all follow-ups that are due right now (scheduled_at <= NOW()).
 * The view already applies this filter.
 */
export async function getPendingFollowups(
  client: SupabaseClient<Database>
): Promise<PendingFollowup[]> {
  const { data, error } = await client
    .from('v_pending_followups')
    .select('*')

  if (error) throw new Error(`getPendingFollowups: ${error.message}`)
  return data ?? []
}

/**
 * Fetch all leads for a specific scrape job, ordered by lead score descending.
 */
export async function getLeadsByJob(
  client: SupabaseClient<Database>,
  scrapeJobId: string
): Promise<Lead[]> {
  const { data, error } = await client
    .from('leads')
    .select('*')
    .eq('scrape_job_id', scrapeJobId)
    .order('lead_score', { ascending: false })

  if (error) throw new Error(`getLeadsByJob: ${error.message}`)
  return data ?? []
}

/**
 * Update a lead's pipeline stage and optionally its updated_at timestamp.
 * The trigger handles updated_at automatically.
 */
export async function updateLeadStage(
  client: SupabaseClient<Database>,
  leadId: string,
  stage: PipelineStage
): Promise<Lead> {
  const { data, error } = await client
    .from('leads')
    .update({ pipeline_stage: stage })
    .eq('id', leadId)
    .select()
    .single()

  if (error) throw new Error(`updateLeadStage: ${error.message}`)
  return data
}

/**
 * Fetch the active conversation for a given phone number.
 * Used in the WhatsApp webhook handler to route incoming messages.
 */
export async function getConversationByPhone(
  client: SupabaseClient<Database>,
  phone: string
): Promise<Conversation | null> {
  const { data, error } = await client
    .from('conversations')
    .select('*')
    .eq('wa_phone_number', phone)
    .eq('status', 'active')
    .maybeSingle()

  if (error) throw new Error(`getConversationByPhone: ${error.message}`)
  return data
}

/**
 * Append a message to a conversation and bump last_message_at.
 */
export async function appendConversationMessage(
  client: SupabaseClient<Database>,
  conversationId: string,
  message: Database['public']['Tables']['conversation_messages']['Insert']
): Promise<ConversationMessage> {
  // Insert the message
  const { data: msgData, error: msgError } = await client
    .from('conversation_messages')
    .insert(message)
    .select()
    .single()

  if (msgError) throw new Error(`appendConversationMessage (insert): ${msgError.message}`)

  // Bump last_message_at on the parent conversation
  const { error: convError } = await client
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId)

  if (convError) throw new Error(`appendConversationMessage (update conv): ${convError.message}`)

  return msgData
}

/**
 * Mark a WhatsApp outreach message as sent / delivered / read.
 */
export async function updateOutreachMessageStatus(
  client: SupabaseClient<Database>,
  waMessageId: string,
  status: OutreachMessageStatus,
  timestamp?: string
): Promise<void> {
  const ts = timestamp ?? new Date().toISOString()

  const patch: Database['public']['Tables']['outreach_messages']['Update'] = { status }
  if (status === 'sent')      patch.sent_at      = ts
  if (status === 'delivered') patch.delivered_at = ts
  if (status === 'read')      patch.read_at      = ts

  const { error } = await client
    .from('outreach_messages')
    .update(patch)
    .eq('wa_message_id', waMessageId)

  if (error) throw new Error(`updateOutreachMessageStatus: ${error.message}`)
}

/**
 * Schedule a follow-up for a lead.
 * Automatically deduplicates — does nothing if a pending entry already exists.
 */
export async function scheduleFollowUp(
  client: SupabaseClient<Database>,
  leadId: string,
  type: FollowUpType,
  scheduledAt: Date
): Promise<FollowUpQueue | null> {
  // Check for existing pending entry
  const { data: existing } = await client
    .from('follow_up_queue')
    .select('id')
    .eq('lead_id', leadId)
    .eq('follow_up_type', type)
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) return null  // already scheduled

  const { data, error } = await client
    .from('follow_up_queue')
    .insert({
      lead_id: leadId,
      follow_up_type: type,
      scheduled_at: scheduledAt.toISOString(),
      status: 'pending',
    })
    .select()
    .single()

  if (error) throw new Error(`scheduleFollowUp: ${error.message}`)
  return data
}
