-- =============================================================================
-- Migration 002: Performance Indexes
-- Local Lead AI — supplemental indexes beyond those in 001_initial.sql
-- =============================================================================

-- =============================================================================
-- leads — additional composite and partial indexes
-- =============================================================================

-- Fast lookup by business name (for deduplication checks)
CREATE INDEX IF NOT EXISTS idx_leads_business_name
  ON leads (business_name);

-- Leads with a phone number (outreach-ready subset)
CREATE INDEX IF NOT EXISTS idx_leads_has_phone
  ON leads (id)
  WHERE phone IS NOT NULL;

-- Leads without a website (common targeting filter)
CREATE INDEX IF NOT EXISTS idx_leads_no_website
  ON leads (id)
  WHERE has_website = false;

-- High-score leads (above 50) — used for priority outreach queues
CREATE INDEX IF NOT EXISTS idx_leads_high_score
  ON leads (lead_score DESC)
  WHERE lead_score >= 50;

-- Composite: pipeline stage + created_at for paginated pipeline views
CREATE INDEX IF NOT EXISTS idx_leads_stage_created
  ON leads (pipeline_stage, created_at DESC);

-- Composite: scrape_job + pipeline stage for per-job funnel analysis
CREATE INDEX IF NOT EXISTS idx_leads_job_stage
  ON leads (scrape_job_id, pipeline_stage);

-- place_id deduplication guard
CREATE INDEX IF NOT EXISTS idx_leads_place_id
  ON leads (place_id)
  WHERE place_id IS NOT NULL;

-- Category-based filtering
CREATE INDEX IF NOT EXISTS idx_leads_category
  ON leads (category)
  WHERE category IS NOT NULL;

-- City-based filtering (for multi-city setups)
CREATE INDEX IF NOT EXISTS idx_leads_city
  ON leads (city)
  WHERE city IS NOT NULL;


-- =============================================================================
-- scrape_jobs — additional indexes
-- =============================================================================

-- Lookup running jobs (for idempotency / duplicate run prevention)
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_running
  ON scrape_jobs (id)
  WHERE status = 'running';

-- Industry + location composite for dedup checks before starting a new scrape
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_industry_location
  ON scrape_jobs (industry, location);

-- Apify run ID lookup (for webhook callbacks)
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_apify_run_id
  ON scrape_jobs (apify_run_id)
  WHERE apify_run_id IS NOT NULL;


-- =============================================================================
-- outreach_messages — additional indexes
-- =============================================================================

-- Lookup by WhatsApp message ID (for delivery/read webhook callbacks)
CREATE INDEX IF NOT EXISTS idx_outreach_wa_message_id
  ON outreach_messages (wa_message_id)
  WHERE wa_message_id IS NOT NULL;

-- Messages due to send right now (pending + scheduled <= now)
CREATE INDEX IF NOT EXISTS idx_outreach_pending_due
  ON outreach_messages (scheduled_at ASC)
  WHERE status = 'pending' AND scheduled_at IS NOT NULL;

-- Per-lead message type lookup (check if initial already sent)
CREATE INDEX IF NOT EXISTS idx_outreach_lead_type
  ON outreach_messages (lead_id, message_type);

-- Messages sent today (for rate-limit checks)
CREATE INDEX IF NOT EXISTS idx_outreach_sent_at
  ON outreach_messages (sent_at DESC)
  WHERE sent_at IS NOT NULL;


-- =============================================================================
-- conversations — additional indexes
-- =============================================================================

-- Look up conversation by phone number (incoming WhatsApp webhook)
CREATE INDEX IF NOT EXISTS idx_conversations_phone
  ON conversations (wa_phone_number);

-- Active conversations with recent activity (for AI agent polling)
CREATE INDEX IF NOT EXISTS idx_conversations_active_recent
  ON conversations (last_message_at DESC)
  WHERE status = 'active';

-- Conversations with booked calls (for CRM view)
CREATE INDEX IF NOT EXISTS idx_conversations_call_booked
  ON conversations (call_booked_at DESC)
  WHERE call_booked_at IS NOT NULL;


-- =============================================================================
-- conversation_messages — additional indexes
-- =============================================================================

-- Inbound messages only (for reply detection)
CREATE INDEX IF NOT EXISTS idx_conv_messages_inbound
  ON conversation_messages (conversation_id, created_at DESC)
  WHERE direction = 'inbound';

-- Outbound messages by sender (distinguish ai_agent vs owner)
CREATE INDEX IF NOT EXISTS idx_conv_messages_sender
  ON conversation_messages (sender, created_at DESC);

-- WhatsApp message ID (for deduplication of incoming webhooks)
CREATE INDEX IF NOT EXISTS idx_conv_messages_wa_id
  ON conversation_messages (wa_message_id)
  WHERE wa_message_id IS NOT NULL;


-- =============================================================================
-- follow_up_queue — additional indexes
-- =============================================================================

-- Composite: pending follow-ups ordered by schedule time (worker poll query)
CREATE INDEX IF NOT EXISTS idx_followup_pending_scheduled
  ON follow_up_queue (scheduled_at ASC, id ASC)
  WHERE status = 'pending';

-- Per-lead follow-up type lookup (prevent duplicate scheduling)
CREATE INDEX IF NOT EXISTS idx_followup_lead_type
  ON follow_up_queue (lead_id, follow_up_type);

-- Executed follow-ups for audit/reporting
CREATE INDEX IF NOT EXISTS idx_followup_executed_at
  ON follow_up_queue (executed_at DESC)
  WHERE executed_at IS NOT NULL;


-- =============================================================================
-- daily_scrape_prompts — additional indexes
-- =============================================================================

-- Today's prompt lookup (prevent duplicate morning prompts)
CREATE INDEX IF NOT EXISTS idx_daily_prompts_sent_at
  ON daily_scrape_prompts (prompt_sent_at DESC)
  WHERE prompt_sent_at IS NOT NULL;

-- Prompts waiting for a reply
CREATE INDEX IF NOT EXISTS idx_daily_prompts_awaiting_reply
  ON daily_scrape_prompts (id)
  WHERE status = 'prompt_sent';

-- Link from prompt → scrape job
CREATE INDEX IF NOT EXISTS idx_daily_prompts_scrape_job_id
  ON daily_scrape_prompts (scrape_job_id)
  WHERE scrape_job_id IS NOT NULL;
