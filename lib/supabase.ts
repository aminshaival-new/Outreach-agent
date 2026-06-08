import { createClient, SupabaseClient } from '@supabase/supabase-js'

// ─── Database Types ───────────────────────────────────────────────────────────

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

export type OutreachMessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed'

export type MessageType = 'initial' | 'followup_1' | 'followup_2'

export type FollowUpStatus = 'pending' | 'sent' | 'cancelled' | 'skipped'

export type ConversationStatus = 'active' | 'closed' | 'spam'

export type DailyPromptStatus =
  | 'prompt_sent'
  | 'reply_received'
  | 'parsed'
  | 'scrape_triggered'
  | 'completed'

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
  has_website: boolean
  lead_score: number
  pipeline_stage: PipelineStage
  outreach_personalization: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface OutreachMessage {
  id: string
  lead_id: string
  message_type: MessageType
  message_body: string
  wa_message_id: string | null
  wa_phone_number: string | null
  status: OutreachMessageStatus
  sent_at: string | null
  delivered_at: string | null
  read_at: string | null
  scheduled_at: string | null
  created_at: string
}

export interface Conversation {
  id: string
  lead_id: string
  wa_phone_number: string
  status: ConversationStatus
  ai_context: Array<{ role: 'user' | 'assistant'; content: string }>
  ai_summary: string | null
  pain_points: string[]
  call_booked_at: string | null
  call_notes: string | null
  last_message_at: string | null
  created_at: string
  updated_at: string
}

export interface ConversationMessage {
  id: string
  conversation_id: string
  direction: 'inbound' | 'outbound'
  sender: 'ai_agent' | 'lead' | 'owner'
  message_body: string
  wa_message_id: string | null
  created_at: string
}

export interface FollowUpQueue {
  id: string
  lead_id: string
  follow_up_type: 'followup_1' | 'followup_2'
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
  status: DailyPromptStatus
  created_at: string
}

// ─── Database Schema ──────────────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      scrape_jobs: { Row: ScrapeJob; Insert: Omit<ScrapeJob, 'id' | 'created_at'>; Update: Partial<ScrapeJob> }
      leads: { Row: Lead; Insert: Omit<Lead, 'id' | 'created_at' | 'updated_at' | 'has_website'>; Update: Partial<Omit<Lead, 'has_website'>> }
      outreach_messages: { Row: OutreachMessage; Insert: Omit<OutreachMessage, 'id' | 'created_at'>; Update: Partial<OutreachMessage> }
      conversations: { Row: Conversation; Insert: Omit<Conversation, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Conversation> }
      conversation_messages: { Row: ConversationMessage; Insert: Omit<ConversationMessage, 'id' | 'created_at'>; Update: Partial<ConversationMessage> }
      follow_up_queue: { Row: FollowUpQueue; Insert: Omit<FollowUpQueue, 'id' | 'created_at'>; Update: Partial<FollowUpQueue> }
      daily_scrape_prompts: { Row: DailyScrapePrompt; Insert: Omit<DailyScrapePrompt, 'id' | 'created_at'>; Update: Partial<DailyScrapePrompt> }
    }
  }
}

// ─── Client Factories ─────────────────────────────────────────────────────────

let serverClientInstance: SupabaseClient<Database> | null = null

/**
 * Server-side Supabase client using the service role key.
 * Bypasses Row Level Security — use only in API routes / server components.
 */
export function createSupabaseServerClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase server environment variables: NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY')
  }

  if (!serverClientInstance) {
    serverClientInstance = createClient<Database>(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }

  return serverClientInstance
}

/**
 * Browser-safe Supabase client using the public anon key.
 * Subject to Row Level Security policies.
 */
export function createSupabaseClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase public environment variables: NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  return createClient<Database>(url, key)
}
