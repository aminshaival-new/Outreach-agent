# Local Lead AI — Setup Guide

Complete step-by-step instructions to get the project running locally and configured with all third-party services.

---

## Prerequisites

- Node.js 20+ (`node --version`)
- npm 10+ (`npm --version`)
- Git
- A Supabase account (free tier works)
- An Apify account (free tier: 5 USD credit on signup)
- A Meta Developer account (for WhatsApp Cloud API)
- An Anthropic account (for Claude API)
- Optional: Google Cloud account (for Drive export)
- Optional: Docker Desktop (for n8n locally)

---

## Step 1 — Clone the Repository

```bash
git clone https://github.com/yourusername/local-lead-ai.git
cd local-lead-ai
```

---

## Step 2 — Install Dependencies

```bash
npm install
```

If you see peer dependency warnings with React 19, they're safe to ignore or use:
```bash
npm install --legacy-peer-deps
```

---

## Step 3 — Set Up Supabase

### 3a. Create a Supabase project

1. Go to [app.supabase.com](https://app.supabase.com)
2. Click **New Project**
3. Name it `local-lead-ai`, pick a strong database password (save it)
4. Choose the region closest to you (e.g. ap-south-1 for India)
5. Wait ~2 min for the project to provision

### 3b. Get your API keys

1. Go to **Project Settings → API**
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role / secret key** → `SUPABASE_SERVICE_ROLE_KEY`

### 3c. Run migrations

1. In your Supabase project, go to **SQL Editor**
2. Open `database/migrations/001_initial.sql` from this repo
3. Paste the entire file contents and click **Run**
4. Open `database/migrations/002_indexes.sql`, paste and **Run**
5. Verify tables exist: go to **Table Editor** and confirm you see `businesses`, `pipeline_leads`, `messages`, `campaigns`

### 3d. Enable Row Level Security (RLS)

The migrations already enable RLS policies. If you're building a multi-tenant app, review the policies in `001_initial.sql`. For single-user (personal tool), the service role key bypasses RLS from the server.

---

## Step 4 — Configure WhatsApp Cloud API (Meta)

This is the most involved step. Follow carefully.

### 4a. Create a Meta Developer Account & App

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Click **My Apps → Create App**
3. Select **Other** as app type → **Next**
4. Select **Business** → **Next**
5. Name it `Local Lead AI`, enter your email → **Create App**

### 4b. Add WhatsApp Product

1. In your app dashboard, scroll to find **WhatsApp** → click **Set up**
2. Select or create a **Meta Business Account**
3. You'll land on the **WhatsApp → Getting Started** page
4. Note the **temporary access token** (valid 24h) — use for testing only
5. Note the **Phone Number ID** → save as `WHATSAPP_PHONE_NUMBER_ID`
6. The test number is `+1 555-XXX-XXXX` — it can send to up to 5 recipient numbers

### 4c. Add your personal number as a test recipient

1. Under **API Setup**, click **To** → **Manage phone number list**
2. Add your WhatsApp number (Indian: `+91 97276 86181`)
3. Verify with the OTP sent to that number

### 4d. Create a Permanent System User Token

The temporary token expires in 24 hours. For production:

1. Go to [business.facebook.com](https://business.facebook.com)
2. Navigate to **Settings → System Users**
3. Click **Add** → Name: `local-lead-bot`, Role: **Employee**
4. Click the system user → **Add Assets**
5. Select **Apps** → choose your app → assign **Full Control**
6. Click **Generate Token** on the system user
7. Select your app → enable `whatsapp_business_messaging` and `whatsapp_business_management`
8. Copy the token → save as `WHATSAPP_ACCESS_TOKEN`

### 4e. Configure the Webhook

1. In your Meta App → **WhatsApp → Configuration**
2. Under **Webhook**, click **Edit**
3. **Callback URL**: `https://YOUR_APP_DOMAIN/api/webhooks/whatsapp`
   - For local dev, use [ngrok](https://ngrok.com): `ngrok http 3000` and use the HTTPS URL
4. **Verify Token**: any string you choose → save as `WHATSAPP_VERIFY_TOKEN`
5. Click **Verify and Save**
6. Under **Webhook Fields**, subscribe to: `messages`

### 4f. Go Live (for production use)

To message non-test numbers, your app needs to go live:
1. Meta App → **App Review** → submit for review
2. Required permissions: `whatsapp_business_messaging`
3. This can take 1–7 business days

For personal use / testing, the test phone number can message up to 5 verified numbers without review.

---

## Step 5 — Get Apify API Token

1. Sign up at [apify.com](https://apify.com)
2. Go to [console.apify.com/account/integrations](https://console.apify.com/account/integrations)
3. Copy **Personal API token** → save as `APIFY_API_TOKEN`
4. The default actor is `compass/google-maps-scraper` (leave `APIFY_ACTOR_ID` as-is)
5. On the free plan you get $5 credit. A typical scrape of 500 leads costs ~$0.25–$0.50.

---

## Step 6 — Set Up Google Drive API Credentials

Skip this step if you don't need Google Drive export.

### 6a. Create a Google Cloud Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project: **local-lead-ai**
3. Enable APIs:
   - Search for **Google Drive API** → Enable
   - Search for **Google Sheets API** → Enable

### 6b. Create OAuth 2.0 Credentials

1. Go to **APIs & Services → Credentials**
2. Click **Create Credentials → OAuth client ID**
3. Configure consent screen if prompted:
   - App name: `Local Lead AI`, User type: **External**
   - Add your Google account as a test user
4. Application type: **Web application**
5. Add authorized redirect URI: `http://localhost:3000/api/auth/google/callback`
6. Copy **Client ID** → `GOOGLE_CLIENT_ID`
7. Copy **Client Secret** → `GOOGLE_CLIENT_SECRET`

### 6c. Get a Refresh Token

Run this one-time OAuth flow to generate a refresh token:

```bash
# Replace YOUR_CLIENT_ID
curl "https://accounts.google.com/o/oauth2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=urn:ietf:wg:oauth:2.0:oob&response_type=code&scope=https://www.googleapis.com/auth/drive.file"
```

Or use the OAuth Playground at [developers.google.com/oauthplayground](https://developers.google.com/oauthplayground):
1. Gear icon → check **Use your own OAuth credentials** → enter client ID + secret
2. Scope: `https://www.googleapis.com/auth/drive.file`
3. Authorize → Exchange code → copy **Refresh token** → `GOOGLE_REFRESH_TOKEN`

### 6d. Get Drive Folder ID

1. Open [drive.google.com](https://drive.google.com)
2. Create a folder named `Local Lead AI Exports`
3. Open the folder → copy the folder ID from the URL:
   `https://drive.google.com/drive/folders/`**`1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms`**
4. Save as `GOOGLE_DRIVE_FOLDER_ID`

---

## Step 7 — Get Claude API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Navigate to **Settings → API Keys**
3. Click **Create Key** → name it `local-lead-ai`
4. Copy the key (shown only once) → save as `CLAUDE_API_KEY`
5. Add billing: $5 credit easily covers thousands of lead analyses

---

## Step 8 — Configure n8n and Import Workflows

### 8a. Run n8n locally with Docker

```bash
docker compose -f docker/docker-compose.yml up n8n -d
# Open: http://localhost:5678
# Login: admin / changeme123
```

### 8b. Import the four workflows

1. In n8n, click the **+** to create a workflow (or go to **Workflows**)
2. Click the three-dot menu → **Import from File**
3. Import each file from `n8n/workflows/`:
   - `01-morning-prompt.json`
   - `02-whatsapp-webhook.json`
   - `03-outreach-engine.json`
   - `04-followup-engine.json`

### 8c. Set up n8n credentials

In each workflow, you'll see credential nodes that need to be configured:

1. **Supabase**: use Supabase URL + service role key
2. **WhatsApp**: use your phone number ID + access token
3. **HTTP Request to Next.js**: set `N8N_WEBHOOK_SECRET` header

### 8d. Activate workflows

Toggle each workflow to **Active** in the n8n UI.

### 8e. Configure n8n in Next.js

Set in `.env.local`:
```env
N8N_BASE_URL=http://localhost:5678
N8N_WEBHOOK_SECRET=your-secret-matches-n8n-config
```

---

## Step 9 — Set Up Environment Variables

Copy the example file:
```bash
cp .env.example .env.local
```

Open `.env.local` and fill in all values you collected in steps 3–8. See `.env.example` for descriptions of each variable.

Verify the file is complete:
```bash
# Check no placeholder values remain
grep "your-" .env.local
# Should return empty if all values are filled
```

---

## Step 10 — Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Verify the setup:**
1. Dashboard loads without errors
2. Go to **Scrape** → enter a search (e.g. "dentists in Ahmedabad") → click **Start Scrape**
3. Check the Apify console to see the run start
4. After ~2 min, click **Import Results**
5. Leads should appear in the **Pipeline** kanban
6. Click a lead → **Generate Message** → verify Claude responds
7. Click **Send on WhatsApp** → check your phone

---

## Step 11 — Deploy to Production

See `docs/DEPLOYMENT.md` for full production deployment instructions covering:
- VPS with Docker Compose + nginx + SSL
- Coolify one-click deploy
- Railway
- Vercel (app only)
