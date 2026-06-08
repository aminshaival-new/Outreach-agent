export type PipelineStage =
  | 'new'
  | 'contacted'
  | 'replied'
  | 'interested'
  | 'call_booked'
  | 'closed_won'
  | 'closed_lost'
  | 'not_interested'

export interface Lead {
  id: string
  scrape_job_id: string
  business_name: string
  phone: string | null
  email: string | null
  website: string | null
  address: string | null
  city: string | null
  google_rating: number | null
  review_count: number
  category: string | null
  has_website: boolean
  pipeline_stage: PipelineStage
  lead_score: number
  facebook_url: string | null
  instagram_url: string | null
  created_at: string
  updated_at: string
}

export interface ScrapeJob {
  id: string
  industry: string
  location: string
  raw_query: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  leads_count: number
  drive_file_url: string | null
  created_at: string
  completed_at: string | null
}

export interface OutreachMessage {
  id: string
  lead_id: string
  message: string
  direction: 'outbound' | 'inbound'
  sent_at: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
}

export interface Conversation {
  id: string
  lead_id: string
  business_name: string
  phone: string
  last_message: string
  last_message_at: string
  unread_count: number
  status: 'active' | 'closed'
  ai_handling: boolean
  messages: OutreachMessage[]
}

export interface DashboardStats {
  leads_scraped: number
  messages_sent: number
  replies_received: number
  interested: number
  calls_booked: number
  closed_deals: number
  revenue: number
  leads_by_stage: Record<PipelineStage, number>
  leads_per_day: { date: string; count: number }[]
}
