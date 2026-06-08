# Local Lead AI

> AI-powered local business lead generation, outreach, and pipeline management — with WhatsApp-native automation.

---

## What It Does

Local Lead AI scrapes Google Maps for local businesses, scores each lead with Claude AI, generates personalized WhatsApp outreach messages, and tracks the entire sales pipeline in a kanban board — all without leaving your phone.

**Core capabilities:**

- **Lead Scraping** — Point Apify's Google Maps scraper at any city + niche (e.g. "plumbers in Mumbai") and import hundreds of qualified leads in minutes.
- **AI Scoring & Messaging** — Claude evaluates each lead's online presence, review count, and website quality, assigns a lead score (1–10), and writes a personalized first-contact WhatsApp message.
- **Pipeline Kanban** — Drag-and-drop board with 7 stages: New → Contacted → Responded → Qualified → Meeting → Closed Won → Lost.
- **WhatsApp Automation** — n8n workflows handle sending, follow-ups, and reply routing via the Meta WhatsApp Cloud API. Replies from leads come back into the pipeline automatically.
- **Export** — One-click export to Excel or sync to Google Drive.
- **Analytics** — Conversion funnel, response rates, revenue by stage, daily activity charts.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Browser / Phone                              │
│                                                                      │
│   Next.js 15 App (App Router + React 19)                            │
│   ┌──────────────┐ ┌──────────────┐ ┌────────────────┐             │
│   │  Dashboard   │ │  Pipeline    │ │  Analytics     │             │
│   │  (scrape,    │ │  (kanban,    │ │  (recharts,    │             │
│   │   import)    │ │  lead cards) │ │   funnel)      │             │
│   └──────────────┘ └──────────────┘ └────────────────┘             │
└──────────────────────────────┬──────────────────────────────────────┘
                               │  HTTPS / REST
         ┌─────────────────────┼──────────────────────────────┐
         │                     │                              │
         ▼                     ▼                              ▼
┌─────────────────┐  ┌──────────────────┐        ┌─────────────────────┐
│   Supabase DB   │  │  Next.js API     │        │    n8n Workflows    │
│   (Postgres)    │  │  Routes          │        │                     │
│                 │  │                  │        │  01-morning-prompt  │
│  businesses     │  │  /api/scrape     │        │  02-whatsapp-       │
│  pipeline_leads │  │  /api/leads      │        │     webhook         │
│  messages       │  │  /api/messages   │        │  03-outreach-engine │
│  campaigns      │  │  /api/export     │        │  04-followup-engine │
│  analytics      │  │  /api/webhooks/  │        │                     │
│                 │  │    whatsapp      │        └──────────┬──────────┘
└─────────────────┘  └────────┬─────────┘                  │
                              │                             │
              ┌───────────────┼─────────────────────────────┤
              │               │                             │
              ▼               ▼                             ▼
    ┌──────────────┐  ┌──────────────────┐     ┌──────────────────────┐
    │  Anthropic   │  │  Apify           │     │  Meta WhatsApp       │
    │  Claude API  │  │  Google Maps     │     │  Cloud API           │
    │              │  │  Scraper Actor   │     │                      │
    │  • Lead score│  │  • Business data │     │  • Send messages     │
    │  • Message   │  │  • Phone numbers │     │  • Receive replies   │
    │    gen       │  │  • Reviews       │     │  • Webhook events    │
    │  • Reply     │  │  • Categories    │     │                      │
    │    classify  │  │  • Websites      │     └──────────────────────┘
    └──────────────┘  └──────────────────┘
              │
              ▼
    ┌──────────────────────┐
    │  Google Drive API    │
    │  • Export to Sheets  │
    │  • Save Excel files  │
    └──────────────────────┘
```

---

## Quick Start (5 Steps)

**Step 1 — Clone and install**
```bash
git clone https://github.com/yourusername/local-lead-ai.git
cd local-lead-ai
npm install
```

**Step 2 — Configure environment**
```bash
cp .env.example .env.local
# Edit .env.local with your API keys (see docs/SETUP.md for where to get each one)
```

**Step 3 — Set up Supabase**
```bash
# Run the migrations in your Supabase project SQL editor:
# database/migrations/001_initial.sql
# database/migrations/002_indexes.sql
```

**Step 4 — Start development server**
```bash
npm run dev
# → http://localhost:3000
```

**Step 5 — (Optional) Start n8n locally**
```bash
docker compose -f docker/docker-compose.yml up n8n -d
# → http://localhost:5678  (admin / changeme123)
# Import workflows from n8n/workflows/
```

---

## Environment Variables

| Variable | Where to Get | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API | Yes |
| `APIFY_API_TOKEN` | console.apify.com → Integrations | Yes |
| `APIFY_ACTOR_ID` | Default: `compass/google-maps-scraper` | Yes |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta Developer Console → WhatsApp | Yes |
| `WHATSAPP_ACCESS_TOKEN` | Meta Business Suite → System Users | Yes |
| `WHATSAPP_VERIFY_TOKEN` | Any string you choose | Yes |
| `WHATSAPP_OWNER_PHONE` | Your number in E.164 (no +) | Yes |
| `CLAUDE_API_KEY` | console.anthropic.com | Yes |
| `GOOGLE_CLIENT_ID` | console.cloud.google.com | Optional |
| `GOOGLE_CLIENT_SECRET` | console.cloud.google.com | Optional |
| `GOOGLE_REFRESH_TOKEN` | OAuth flow (see SETUP.md) | Optional |
| `GOOGLE_DRIVE_FOLDER_ID` | Google Drive URL | Optional |
| `N8N_BASE_URL` | Your n8n instance URL | Yes |
| `N8N_WEBHOOK_SECRET` | Any random string | Yes |
| `NEXT_PUBLIC_APP_URL` | Your deployed app URL | Yes |

---

## How the WhatsApp Flow Works

```
1. You create a "campaign" in the app
   └── Select leads from pipeline (e.g. "all plumbers with score ≥ 7")

2. App calls Claude to generate personalized message for each lead
   └── Uses business name, category, review count, location

3. n8n outreach-engine workflow fires:
   └── Reads pending messages from Supabase
   └── Sends via WhatsApp Cloud API at configured rate (30/min)
   └── Updates message status: pending → sent

4. Lead replies on WhatsApp
   └── Meta sends webhook → /api/webhooks/whatsapp
   └── Next.js saves reply, classifies intent via Claude
   └── Triggers n8n followup-engine if positive reply
   └── Updates pipeline stage automatically

5. You see the reply in the pipeline kanban card
   └── Lead card shows conversation thread
   └── One-click to book meeting or close deal
```

---

## n8n Workflows Overview

| File | Purpose | Trigger |
|---|---|---|
| `01-morning-prompt.json` | Daily brief — summary of pipeline + follow-ups due | Cron: 8:00 AM IST |
| `02-whatsapp-webhook.json` | Receive and route incoming WhatsApp replies | HTTP Webhook |
| `03-outreach-engine.json` | Send queued outreach messages with rate limiting | Polling every 2 min |
| `04-followup-engine.json` | Auto follow-up for leads with no reply in 48h | Cron: 10:00 AM IST |

Import all four from the n8n UI: **Settings → Import from file** → select each JSON.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/scrape` | Trigger Apify Google Maps scrape |
| `GET` | `/api/scrape/[runId]/status` | Check scrape job status |
| `POST` | `/api/scrape/[runId]/import` | Import results into DB |
| `GET` | `/api/leads` | List all leads (paginated, filterable) |
| `GET` | `/api/leads/[id]` | Get single lead with messages |
| `PATCH` | `/api/leads/[id]` | Update lead stage / notes |
| `DELETE` | `/api/leads/[id]` | Archive a lead |
| `POST` | `/api/messages/generate` | Generate AI message for lead |
| `POST` | `/api/messages/send` | Send WhatsApp message |
| `GET` | `/api/messages/[leadId]` | Get conversation thread |
| `POST` | `/api/campaigns` | Create outreach campaign |
| `GET` | `/api/campaigns` | List campaigns |
| `POST` | `/api/export/excel` | Export leads to Excel file |
| `POST` | `/api/export/drive` | Push Excel to Google Drive |
| `GET` | `/api/analytics/funnel` | Conversion funnel data |
| `GET` | `/api/analytics/daily` | Daily activity stats |
| `GET` | `/api/health` | Health check |
| `GET/POST` | `/api/webhooks/whatsapp` | Meta webhook endpoint |

---

## Deployment Options

### Option A — Coolify (Recommended for self-hosting)
- Push code to GitHub
- Add project in Coolify → Docker Compose → point to `docker/docker-compose.prod.yml`
- Set environment variables in Coolify dashboard
- Enable automatic SSL
- See `docs/DEPLOYMENT.md` for full steps

### Option B — Railway
- Connect GitHub repo to Railway
- Add Postgres + Redis services
- Deploy from Nixpacks (auto-detected as Next.js)
- Set env vars in Railway dashboard
- For n8n: deploy as separate Railway service

### Option C — VPS with Docker Compose
```bash
# On your VPS (Ubuntu 22.04 recommended)
git clone https://github.com/yourusername/local-lead-ai.git
cd local-lead-ai
cp .env.example .env.local && nano .env.local
docker compose -f docker/docker-compose.prod.yml up -d
```

### Option D — Vercel (App only, no n8n)
```bash
npx vercel --prod
# Add env vars in Vercel dashboard
# Run n8n separately on Railway or VPS
```

---

## Support

- Issues: Open a GitHub issue with reproduction steps
- WhatsApp: +91 97276 86181
- Email: aminshaival@gmail.com
