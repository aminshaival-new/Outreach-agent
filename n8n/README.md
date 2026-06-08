# Local Lead AI — n8n Workflows

Five automation workflows that power the Local Lead AI WhatsApp-driven outreach system.

---

## Workflows Overview

| File | Name | Trigger |
|------|------|---------|
| `01-morning-prompt.json` | Morning Prompt | Cron — Mon-Fri 09:00 IST (03:30 UTC) |
| `02-whatsapp-webhook.json` | WhatsApp Incoming | Webhook POST `/whatsapp-incoming` |
| `03-outreach-engine.json` | Outreach Engine | Webhook POST `/start-outreach` |
| `04-followup-engine.json` | Follow-Up Engine | Cron — every 4 hours |
| `05-apify-completion-webhook.json` | Apify Completion | Webhook POST `/apify-webhook` |

---

## Step 1: Environment Variables in n8n

Go to **Settings → Environment Variables** in your n8n instance and add:

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_APP_URL` | Your deployed app base URL | `https://app.localleadai.com` |
| `N8N_WEBHOOK_SECRET` | Shared secret for webhook auth | `your-random-secret-here` |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp Cloud API phone number ID | `123456789012345` |
| `WHATSAPP_ACCESS_TOKEN` | WhatsApp Cloud API permanent token | `EAABwz...` |
| `WHATSAPP_OWNER_PHONE` | Owner WhatsApp number | `919727686181` |
| `APIFY_API_TOKEN` | Apify API token | `apify_api_...` |

> In n8n Cloud or self-hosted, environment variables are accessed in expressions as `{{ $env.VARIABLE_NAME }}`.
> For self-hosted n8n, you can also set them in the `.env` file in the n8n root directory.

---

## Step 2: Import Workflows

### Via n8n UI
1. Open n8n → go to **Workflows**
2. Click **Import from File** (or use the `+` → Import)
3. Upload each `.json` file from `n8n/workflows/` one at a time
4. Repeat for all 5 files

### Via n8n CLI (self-hosted)
```bash
n8n import:workflow --input=/path/to/n8n/workflows/01-morning-prompt.json
n8n import:workflow --input=/path/to/n8n/workflows/02-whatsapp-webhook.json
n8n import:workflow --input=/path/to/n8n/workflows/03-outreach-engine.json
n8n import:workflow --input=/path/to/n8n/workflows/04-followup-engine.json
n8n import:workflow --input=/path/to/n8n/workflows/05-apify-completion-webhook.json
```

After import, **activate** each workflow using the toggle in the top-right of the workflow editor.

---

## Step 3: Note Your Webhook URLs

After importing, n8n generates webhook URLs. Find them by opening each workflow and clicking the webhook node. They follow this pattern:

| Workflow | Webhook Path | Full URL |
|----------|-------------|----------|
| 02 - WhatsApp Incoming | `/whatsapp-incoming` | `https://<your-n8n-host>/webhook/whatsapp-incoming` |
| 03 - Outreach Engine | `/start-outreach` | `https://<your-n8n-host>/webhook/start-outreach` |
| 05 - Apify Completion | `/apify-webhook` | `https://<your-n8n-host>/webhook/apify-webhook` |

> For **test/inactive** workflows, n8n uses a `/webhook-test/` prefix. Switch to the **Production URL** by activating the workflow.

---

## Step 4: Configure WhatsApp Cloud API Webhook

1. Go to [Meta for Developers](https://developers.facebook.com/) → your WhatsApp app
2. Navigate to **WhatsApp → Configuration → Webhooks**
3. Set **Callback URL** to:
   ```
   https://<your-n8n-host>/webhook/whatsapp-incoming
   ```
4. Set **Verify Token** to any string (e.g., `localleadai-verify`)
5. Subscribe to the `messages` webhook field

> **Note:** WhatsApp requires HTTPS with a valid SSL certificate. Use n8n Cloud, or put your self-hosted n8n behind nginx/Caddy with Let's Encrypt.

> **Webhook Verification:** WhatsApp sends a GET request to verify the webhook. n8n's webhook node handles POST only. You may need a small middleware in your app (`/api/whatsapp/verify`) that handles the GET verification challenge, then proxies POST messages to n8n. See your app's `POST /api/whatsapp/relay` endpoint for this pattern.

---

## Step 5: Configure Apify Webhook

When triggering an Apify scraping run via your app, set the webhook URL to:
```
https://<your-n8n-host>/webhook/apify-webhook
```

In Apify, webhooks are configured per Actor run. Your app's `/api/scrape/trigger` endpoint should include this when calling Apify:
```json
{
  "webhooks": [
    {
      "eventTypes": ["ACTOR.RUN.SUCCEEDED", "ACTOR.RUN.FAILED"],
      "requestUrl": "https://<your-n8n-host>/webhook/apify-webhook"
    }
  ]
}
```

---

## Step 6: Configure Your App to Call n8n Webhooks

Your app needs to call the following n8n webhooks at the right moments:

### After Scraping Completes (from Apify webhook handler)
The `05-apify-completion-webhook` workflow calls your app's `/api/scrape/apify-complete`, which should then call:
```
POST https://<your-n8n-host>/webhook/start-outreach
Body: {
  "scrape_job_id": "uuid",
  "lead_ids": ["uuid1", "uuid2"],
  "industry": "Salon",
  "location": "South Bopal"
}
```

### App Environment Variable
Add to your app's `.env`:
```
N8N_OUTREACH_WEBHOOK_URL=https://<your-n8n-host>/webhook/start-outreach
N8N_WEBHOOK_SECRET=your-random-secret-here
```

---

## Workflow Details

### 01 - Morning Prompt
- Fires **Mon–Fri at 09:00 IST** (03:30 UTC cron)
- Calls `POST /api/scrape/morning-prompt` on your app
- Your app sends the WhatsApp message to the owner and logs the prompt

### 02 - WhatsApp Incoming Webhook
- All incoming WhatsApp messages arrive here
- **Owner messages** (from `919727686181`): parsed for industry + location → triggers scrape
- **Lead messages** (all other numbers): forwarded to `/api/conversations/inbound` for AI reply
- Sends confirmation back to owner when a scrape is triggered

### 03 - Outreach Engine
- Called after scraping completes (by your app)
- Loops through all lead IDs one at a time with a 3-second delay between each
- For each lead: gets details → generates personalized message (AI) → sends WhatsApp → schedules follow-ups
- Sends a summary WhatsApp to the owner when all leads are processed

### 04 - Follow-Up Engine
- Runs **every 4 hours** (00:00, 04:00, 08:00, 12:00, 16:00, 20:00 UTC)
- Fetches all follow-ups where `scheduled_at <= now` from your app
- Executes each one with a 5-second delay between calls
- Errors are logged (captured in the error output branch) rather than crashing the loop

### 05 - Apify Completion Webhook
- Apify calls this when a run SUCCEEDS or FAILS
- On success: notifies your app → app processes data → calls outreach engine
- On failure: notifies your app + sends WhatsApp alert to owner

---

## Troubleshooting

### Webhook not receiving messages
- Ensure the workflow is **Active** (not just saved)
- Check that you're using the **production webhook URL** (`/webhook/` not `/webhook-test/`)
- Verify SSL is valid on your n8n host

### Environment variables not resolving
- In n8n expressions, use `{{ $env.VARIABLE_NAME }}` syntax
- Restart n8n after adding new env vars to `.env` file

### Execution timeouts
- The outreach engine has long-running loops. In n8n settings, increase **Execution Timeout** under Settings → General if needed
- Default n8n execution timeout is 1 hour; for large lead lists increase this

### Apify webhook not firing
- In Apify, verify the webhook URL is correct and the Actor run's event types include `ACTOR.RUN.SUCCEEDED`
- Test manually: use the n8n webhook test URL and send a mock POST body

### WhatsApp verification failing
- WhatsApp Cloud API sends a GET request for verification that n8n cannot handle natively
- Add a dedicated verification endpoint in your app at `/api/whatsapp/verify` that responds to the `hub.challenge` parameter
- Then relay POST messages to this n8n webhook URL

---

## Security Notes

- All app API calls include an `x-webhook-secret` header. Validate this in every API route on your app.
- Never expose `N8N_WEBHOOK_SECRET` or `WHATSAPP_ACCESS_TOKEN` in public repositories.
- Consider IP allowlisting n8n's outbound IPs in your app's firewall if self-hosting both.
