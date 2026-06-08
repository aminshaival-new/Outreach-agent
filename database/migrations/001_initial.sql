-- =============================================================================
-- Migration 001: Initial Schema
-- Local Lead AI — WhatsApp-driven lead generation and outreach automation
-- =============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- TABLES
-- =============================================================================

-- scrape_jobs: tracks each scraping session initiated by the owner
CREATE TABLE scrape_jobs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  industry        TEXT        NOT NULL,       -- "Salon", "Dentist", "Gym"
  location        TEXT        NOT NULL,       -- "South Bopal", "Ahmedabad"
  raw_query       TEXT        NOT NULL,       -- original WhatsApp message e.g. "Salon in South Bopal"
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  apify_run_id    TEXT,
  leads_count     INTEGER     DEFAULT 0,
  drive_file_url  TEXT,                       -- Google Drive Excel file URL
  drive_file_id   TEXT,
  error_message   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

-- leads: individual businesses scraped from Google Maps
CREATE TABLE leads (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  scrape_job_id    UUID        REFERENCES scrape_jobs(id) ON DELETE CASCADE,

  -- Business info
  business_name    TEXT        NOT NULL,
  phone            TEXT,
  email            TEXT,
  website          TEXT,
  address          TEXT,
  city             TEXT,
  state            TEXT,
  country          TEXT        DEFAULT 'India',

  -- Google Maps data
  google_rating    DECIMAL(2,1),
  review_count     INTEGER     DEFAULT 0,
  google_maps_url  TEXT,
  place_id         TEXT,
  category         TEXT,

  -- Social media
  facebook_url     TEXT,
  instagram_url    TEXT,
  linkedin_url     TEXT,

  -- Lead qualification
  has_website      BOOLEAN     GENERATED ALWAYS AS (website IS NOT NULL AND website != '') STORED,
  lead_score       INTEGER     DEFAULT 0 CHECK (lead_score BETWEEN 0 AND 100),

  -- Pipeline stage
  pipeline_stage   TEXT        NOT NULL DEFAULT 'new'
                               CHECK (pipeline_stage IN (
                                 'new', 'contacted', 'replied', 'interested',
                                 'call_booked', 'closed_won', 'closed_lost', 'not_interested'
                               )),

  -- AI-generated personalized outreach angles
  outreach_personalization  JSONB,

  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- outreach_messages: WhatsApp messages sent TO leads
CREATE TABLE outreach_messages (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id          UUID        REFERENCES leads(id) ON DELETE CASCADE,

  message_type     TEXT        NOT NULL
                               CHECK (message_type IN ('initial', 'followup_1', 'followup_2')),
  message_body     TEXT        NOT NULL,

  -- WhatsApp Cloud API tracking
  wa_message_id    TEXT,
  wa_phone_number  TEXT,

  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  sent_at          TIMESTAMPTZ,
  delivered_at     TIMESTAMPTZ,
  read_at          TIMESTAMPTZ,

  -- Scheduling
  scheduled_at     TIMESTAMPTZ,

  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- conversations: WhatsApp conversation threads with leads (one per lead)
CREATE TABLE conversations (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id          UUID        REFERENCES leads(id) ON DELETE CASCADE,
  wa_phone_number  TEXT        NOT NULL,

  status           TEXT        NOT NULL DEFAULT 'active'
                               CHECK (status IN ('active', 'closed', 'spam')),

  -- AI agent state
  ai_context       JSONB       DEFAULT '[]',   -- conversation history array for Claude
  ai_summary       TEXT,                        -- brief summary of current conversation state

  -- Qualification data captured during conversation
  pain_points      JSONB       DEFAULT '[]',
  call_booked_at   TIMESTAMPTZ,
  call_notes       TEXT,

  last_message_at  TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- conversation_messages: individual messages within a conversation thread
CREATE TABLE conversation_messages (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID        REFERENCES conversations(id) ON DELETE CASCADE,

  direction        TEXT        NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  sender           TEXT        NOT NULL,   -- 'ai_agent', 'lead', 'owner'
  message_body     TEXT        NOT NULL,

  wa_message_id    TEXT,

  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- follow_up_queue: scheduled follow-up tasks for leads that haven't replied
CREATE TABLE follow_up_queue (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id          UUID        REFERENCES leads(id) ON DELETE CASCADE,

  follow_up_type   TEXT        NOT NULL
                               CHECK (follow_up_type IN ('followup_1', 'followup_2')),
  scheduled_at     TIMESTAMPTZ NOT NULL,

  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'sent', 'cancelled', 'skipped')),

  executed_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- daily_scrape_prompts: tracks the morning WhatsApp prompt → reply → scrape flow
CREATE TABLE daily_scrape_prompts (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  prompt_sent_at      TIMESTAMPTZ,
  user_reply          TEXT,
  reply_received_at   TIMESTAMPTZ,

  parsed_industry     TEXT,
  parsed_location     TEXT,

  scrape_job_id       UUID        REFERENCES scrape_jobs(id),

  status              TEXT        NOT NULL DEFAULT 'prompt_sent'
                                  CHECK (status IN (
                                    'prompt_sent', 'reply_received', 'parsed',
                                    'scrape_triggered', 'completed'
                                  )),

  created_at          TIMESTAMPTZ DEFAULT NOW()
);


-- =============================================================================
-- INDEXES
-- (Additional performance indexes are in 002_indexes.sql — this file
--  includes only the indexes required for FK constraints and core queries.)
-- =============================================================================

-- scrape_jobs
CREATE INDEX idx_scrape_jobs_status        ON scrape_jobs (status);
CREATE INDEX idx_scrape_jobs_created_at    ON scrape_jobs (created_at DESC);

-- leads
CREATE INDEX idx_leads_scrape_job_id       ON leads (scrape_job_id);
CREATE INDEX idx_leads_pipeline_stage      ON leads (pipeline_stage);
CREATE INDEX idx_leads_created_at          ON leads (created_at DESC);
CREATE INDEX idx_leads_phone               ON leads (phone);
CREATE INDEX idx_leads_lead_score          ON leads (lead_score DESC);

-- outreach_messages
CREATE INDEX idx_outreach_lead_id          ON outreach_messages (lead_id);
CREATE INDEX idx_outreach_status           ON outreach_messages (status);
CREATE INDEX idx_outreach_scheduled_at     ON outreach_messages (scheduled_at)
  WHERE scheduled_at IS NOT NULL;

-- conversations
CREATE INDEX idx_conversations_lead_id     ON conversations (lead_id);
CREATE INDEX idx_conversations_status      ON conversations (status);
CREATE INDEX idx_conversations_last_msg    ON conversations (last_message_at DESC);

-- conversation_messages
CREATE INDEX idx_conv_messages_conv_id     ON conversation_messages (conversation_id);
CREATE INDEX idx_conv_messages_created_at  ON conversation_messages (created_at DESC);

-- follow_up_queue
CREATE INDEX idx_followup_lead_id          ON follow_up_queue (lead_id);
CREATE INDEX idx_followup_scheduled_at     ON follow_up_queue (scheduled_at)
  WHERE status = 'pending';
CREATE INDEX idx_followup_status           ON follow_up_queue (status);

-- daily_scrape_prompts
CREATE INDEX idx_daily_prompts_status      ON daily_scrape_prompts (status);
CREATE INDEX idx_daily_prompts_created_at  ON daily_scrape_prompts (created_at DESC);


-- =============================================================================
-- TRIGGERS: auto-update updated_at timestamps
-- =============================================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE scrape_jobs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_queue        ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_scrape_prompts   ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS entirely (Supabase default behaviour for service_role).
-- These policies grant the authenticated role full access for use via the dashboard
-- and server-side clients that authenticate with the anon/user JWT.

-- scrape_jobs policies
CREATE POLICY "service_full_access_scrape_jobs"
  ON scrape_jobs FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access_scrape_jobs"
  ON scrape_jobs FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- leads policies
CREATE POLICY "service_full_access_leads"
  ON leads FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access_leads"
  ON leads FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- outreach_messages policies
CREATE POLICY "service_full_access_outreach_messages"
  ON outreach_messages FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access_outreach_messages"
  ON outreach_messages FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- conversations policies
CREATE POLICY "service_full_access_conversations"
  ON conversations FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access_conversations"
  ON conversations FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- conversation_messages policies
CREATE POLICY "service_full_access_conversation_messages"
  ON conversation_messages FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access_conversation_messages"
  ON conversation_messages FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- follow_up_queue policies
CREATE POLICY "service_full_access_follow_up_queue"
  ON follow_up_queue FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access_follow_up_queue"
  ON follow_up_queue FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- daily_scrape_prompts policies
CREATE POLICY "service_full_access_daily_scrape_prompts"
  ON daily_scrape_prompts FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access_daily_scrape_prompts"
  ON daily_scrape_prompts FOR ALL
  TO authenticated USING (true) WITH CHECK (true);


-- =============================================================================
-- VIEWS
-- =============================================================================

-- v_dashboard_stats: aggregate pipeline and activity counts for the dashboard
CREATE OR REPLACE VIEW v_dashboard_stats AS
SELECT
  -- Lead pipeline counts
  COUNT(*) FILTER (WHERE pipeline_stage = 'new')            AS leads_new,
  COUNT(*) FILTER (WHERE pipeline_stage = 'contacted')      AS leads_contacted,
  COUNT(*) FILTER (WHERE pipeline_stage = 'replied')        AS leads_replied,
  COUNT(*) FILTER (WHERE pipeline_stage = 'interested')     AS leads_interested,
  COUNT(*) FILTER (WHERE pipeline_stage = 'call_booked')    AS leads_call_booked,
  COUNT(*) FILTER (WHERE pipeline_stage = 'closed_won')     AS leads_closed_won,
  COUNT(*) FILTER (WHERE pipeline_stage = 'closed_lost')    AS leads_closed_lost,
  COUNT(*) FILTER (WHERE pipeline_stage = 'not_interested') AS leads_not_interested,
  COUNT(*)                                                   AS total_leads,

  -- Activity metrics
  COUNT(*) FILTER (WHERE pipeline_stage IN (
    'contacted', 'replied', 'interested',
    'call_booked', 'closed_won', 'closed_lost', 'not_interested'
  ))                                                         AS total_contacted,

  -- Counts derived from sub-selects
  (SELECT COUNT(*) FROM outreach_messages WHERE status IN ('sent', 'delivered', 'read'))
                                                             AS messages_sent,
  (SELECT COUNT(*) FROM outreach_messages WHERE status = 'delivered')
                                                             AS messages_delivered,
  (SELECT COUNT(*) FROM outreach_messages WHERE status = 'read')
                                                             AS messages_read,
  (SELECT COUNT(*) FROM conversations WHERE status = 'active')
                                                             AS active_conversations,
  (SELECT COUNT(*) FROM follow_up_queue WHERE status = 'pending')
                                                             AS pending_followups,
  (SELECT COUNT(*) FROM scrape_jobs WHERE status = 'completed')
                                                             AS total_scrape_jobs

FROM leads;


-- v_pending_followups: leads due for a follow-up message right now
CREATE OR REPLACE VIEW v_pending_followups AS
SELECT
  fq.id                     AS queue_id,
  fq.follow_up_type,
  fq.scheduled_at,
  fq.created_at             AS queued_at,

  l.id                      AS lead_id,
  l.business_name,
  l.phone,
  l.city,
  l.pipeline_stage,
  l.lead_score,
  l.outreach_personalization,

  sj.industry,
  sj.location               AS scrape_location

FROM follow_up_queue fq
JOIN leads           l  ON l.id  = fq.lead_id
JOIN scrape_jobs     sj ON sj.id = l.scrape_job_id

WHERE fq.status       = 'pending'
  AND fq.scheduled_at <= NOW()

ORDER BY fq.scheduled_at ASC;
