# Local Lead AI — Production Deployment Guide

---

## VPS Requirements

| Resource | Minimum | Recommended |
|---|---|---|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 4 GB | 8 GB |
| Storage | 40 GB SSD | 80 GB SSD |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |
| Open ports | 22, 80, 443 | 22, 80, 443 |

**Recommended providers:** Hetzner (best price/performance), DigitalOcean, Linode, Vultr

---

## Option A — VPS with Docker Compose (Recommended)

### A1. Provision the VPS

```bash
# SSH into your new VPS
ssh root@YOUR_VPS_IP

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker && systemctl start docker

# Install Docker Compose plugin
apt install -y docker-compose-plugin

# Verify
docker --version
docker compose version
```

### A2. Create a deploy user (security best practice)

```bash
adduser deploy
usermod -aG docker deploy
usermod -aG sudo deploy

# Copy your SSH key to deploy user
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh

# Switch to deploy user for all remaining steps
su - deploy
```

### A3. Clone the repository

```bash
git clone https://github.com/yourusername/local-lead-ai.git /home/deploy/local-lead-ai
cd /home/deploy/local-lead-ai
```

### A4. Configure environment variables

```bash
cp .env.example .env.local
nano .env.local
# Fill in all production values — especially:
# - NEXT_PUBLIC_APP_URL=https://YOUR_APP_DOMAIN
# - NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
# - All API keys
# - DOMAIN=app.yourdomain.com
# - N8N_DOMAIN=n8n.yourdomain.com
# - POSTGRES_PASSWORD=<strong-random-password>
# - N8N_BASIC_AUTH_PASSWORD=<strong-password>
# - N8N_ENCRYPTION_KEY=<32-char-random-string>
```

Generate strong random secrets:
```bash
# For N8N_ENCRYPTION_KEY and N8N_WEBHOOK_SECRET
openssl rand -hex 16   # generates 32 hex chars
```

### A5. Configure nginx domain names

```bash
# Replace YOUR_APP_DOMAIN and YOUR_N8N_DOMAIN in nginx.conf
sed -i 's/YOUR_APP_DOMAIN/app.yourdomain.com/g' docker/nginx.conf
sed -i 's/YOUR_N8N_DOMAIN/n8n.yourdomain.com/g' docker/nginx.conf
```

### A6. Set up DNS

Before obtaining SSL certs, point your DNS records to the VPS IP:

| Type | Name | Value |
|---|---|---|
| A | `app` | `YOUR_VPS_IP` |
| A | `n8n` | `YOUR_VPS_IP` |

Wait for DNS propagation (usually 5–15 min). Verify:
```bash
dig +short app.yourdomain.com
# Should return YOUR_VPS_IP
```

### A7. Obtain SSL certificates

```bash
# Install certbot on host (for initial cert issuance)
apt install -y certbot

# Stop any existing port 80 listeners
# Obtain certs for both domains
certbot certonly --standalone \
  -d app.yourdomain.com \
  -d n8n.yourdomain.com \
  --email your@email.com \
  --agree-tos \
  --no-eff-email

# Certs saved to /etc/letsencrypt/live/
# Copy them into the docker volumes directory (so nginx container can read them)
mkdir -p docker/certs
cp -r /etc/letsencrypt docker/certs/letsencrypt
```

Alternatively, let the certbot container in docker-compose handle renewal (it uses webroot challenge).

### A8. First deploy

```bash
cd /home/deploy/local-lead-ai

# Build and start all services
docker compose -f docker/docker-compose.prod.yml up -d --build

# Check all services are up
docker compose -f docker/docker-compose.prod.yml ps

# Follow logs
docker compose -f docker/docker-compose.prod.yml logs -f app
```

Expected output:
```
Name                    Status
local-lead-nginx        running
local-lead-ai-app       running (healthy)
local-lead-ai-n8n       running (healthy)
local-lead-postgres     running (healthy)
local-lead-certbot      running
```

### A9. Verify the deployment

```bash
# App health check
curl https://app.yourdomain.com/api/health

# Expected:
# {"status":"ok","timestamp":"2024-06-08T...","db":"connected"}
```

Open `https://app.yourdomain.com` in browser.

---

## Option B — Coolify (Easiest Self-hosting)

Coolify is an open-source Heroku/Netlify alternative that handles Docker deployments with a UI.

### B1. Install Coolify on VPS

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
# Opens Coolify UI at: http://YOUR_VPS_IP:8000
```

### B2. Add your source

1. In Coolify → **Sources** → Add GitHub
2. Connect your GitHub account
3. Select the `local-lead-ai` repository

### B3. Create a new service

1. **Projects** → New Project → `local-lead-ai`
2. Add Service → **Docker Compose**
3. Select your repo + branch (`main`)
4. Docker Compose file path: `docker/docker-compose.prod.yml`
5. Port: `3000`

### B4. Set environment variables

In Coolify's **Environment Variables** section, add all variables from `.env.example`. Coolify encrypts them at rest.

### B5. Enable automatic SSL

1. In the service settings → **Domains**
2. Add: `app.yourdomain.com`
3. Enable **Let's Encrypt** → Coolify handles cert issuance and renewal automatically

### B6. Deploy

Click **Deploy** — Coolify builds, pushes, and starts all containers. Watch logs in the Coolify UI.

### B7. Auto-deploy on push

Enable the GitHub webhook in Coolify settings for automatic deploys on every `git push` to main.

---

## Option C — Railway

Best for: getting running fast without VPS management. More expensive at scale.

### C1. Deploy the Next.js app

```bash
npm install -g @railway/cli
railway login
railway init   # in project root
railway up
```

Or connect via Railway dashboard:
1. [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select `local-lead-ai` repo
3. Railway auto-detects Next.js and builds with Nixpacks

### C2. Add environment variables

Railway Dashboard → your service → **Variables** → add all from `.env.example`

### C3. Add a custom domain

Railway Dashboard → service → **Settings → Domains** → add your domain

### C4. Deploy n8n on Railway

1. New service → Docker Image → `docker.n8n.io/n8nio/n8n:latest`
2. Add PostgreSQL plugin for n8n's database
3. Set environment variables:
   ```
   DB_TYPE=postgresdb
   DB_POSTGRESDB_DATABASE=${{Postgres.PGDATABASE}}
   DB_POSTGRESDB_HOST=${{Postgres.PGHOST}}
   DB_POSTGRESDB_PORT=${{Postgres.PGPORT}}
   DB_POSTGRESDB_USER=${{Postgres.PGUSER}}
   DB_POSTGRESDB_PASSWORD=${{Postgres.PGPASSWORD}}
   WEBHOOK_URL=https://n8n.yourdomain.com
   N8N_ENCRYPTION_KEY=<your-32-char-key>
   ```

---

## SSL Setup with Let's Encrypt (Manual Renewal)

If not using Coolify's auto-SSL, set up auto-renewal on the VPS:

```bash
# Test renewal
certbot renew --dry-run

# Set up cron for twice-daily renewal check
crontab -e
# Add:
0 2,14 * * * certbot renew --quiet --post-hook "docker compose -f /home/deploy/local-lead-ai/docker/docker-compose.prod.yml exec nginx nginx -s reload"
```

---

## Updating the Application

### Pull latest code and redeploy

```bash
cd /home/deploy/local-lead-ai

# Pull changes
git pull origin main

# Rebuild and restart (zero-downtime not guaranteed with single-container setup)
docker compose -f docker/docker-compose.prod.yml up -d --build app

# If nginx config changed:
docker compose -f docker/docker-compose.prod.yml up -d --build nginx
```

### Rolling restart (minimal downtime)

```bash
# Rebuild the app image
docker compose -f docker/docker-compose.prod.yml build app

# Replace the container (nginx keeps serving during build, brief gap on restart)
docker compose -f docker/docker-compose.prod.yml up -d --no-deps app
```

---

## Environment Variables in Production

**Never** put secrets in docker-compose files or nginx configs. Always use:
- `.env.local` file (not committed to git) — for Docker `env_file`
- Coolify's encrypted Variables UI
- Railway's Variables panel
- A secrets manager (AWS Secrets Manager, Doppler, etc.) for team setups

Verify no secrets are in the built image:
```bash
docker inspect local-lead-ai-app | grep -i key
# Should return nothing sensitive
```

---

## n8n Setup on Production

### Import workflows via CLI

```bash
# Copy workflows into the running n8n container
docker cp n8n/workflows/. local-lead-ai-n8n:/workflows/

# Import via n8n CLI inside container
docker exec local-lead-ai-n8n n8n import:workflow --input=/workflows/01-morning-prompt.json
docker exec local-lead-ai-n8n n8n import:workflow --input=/workflows/02-whatsapp-webhook.json
docker exec local-lead-ai-n8n n8n import:workflow --input=/workflows/03-outreach-engine.json
docker exec local-lead-ai-n8n n8n import:workflow --input=/workflows/04-followup-engine.json
```

### Configure n8n credentials

1. Open `https://n8n.yourdomain.com`
2. Log in with your `N8N_BASIC_AUTH_USER` / `N8N_BASIC_AUTH_PASSWORD`
3. For each workflow, open it and re-connect credentials:
   - **HTTP Request nodes**: set `Authorization: Bearer YOUR_N8N_WEBHOOK_SECRET` header
   - **Supabase nodes**: enter URL and service role key
   - **WhatsApp nodes**: enter phone number ID and access token

### Activate all workflows

Toggle each workflow to **Active** in the n8n UI.

### Update webhook URLs in Meta

After going live, update the Meta webhook callback URL from your ngrok/dev URL to:
`https://app.yourdomain.com/api/webhooks/whatsapp`

---

## Health Checks

### Automated health check endpoint

```bash
curl https://app.yourdomain.com/api/health
# {"status":"ok","timestamp":"...","db":"connected","version":"1.0.0"}
```

### Monitor with UptimeRobot (free)

1. [uptimerobot.com](https://uptimerobot.com) → Add Monitor
2. Type: HTTP(s), URL: `https://app.yourdomain.com/api/health`
3. Interval: 5 minutes
4. Alert contacts: your email/WhatsApp

### Check Docker container health

```bash
# All services
docker compose -f docker/docker-compose.prod.yml ps

# App logs (last 100 lines)
docker compose -f docker/docker-compose.prod.yml logs --tail=100 app

# n8n logs
docker compose -f docker/docker-compose.prod.yml logs --tail=100 n8n

# Real-time all services
docker compose -f docker/docker-compose.prod.yml logs -f
```

### Disk space monitoring

n8n can accumulate execution logs. Set a retention limit:
```env
# Add to n8n environment variables
EXECUTIONS_DATA_PRUNE=true
EXECUTIONS_DATA_MAX_AGE=30    # days
```

---

## Monitoring Tips

1. **Supabase Dashboard** — built-in query performance monitoring at `app.supabase.com`
2. **n8n Execution Logs** — see every workflow run at `https://n8n.yourdomain.com/executions`
3. **Nginx access logs** — `docker compose exec nginx tail -f /var/log/nginx/access.log`
4. **Apify Console** — monitor scraper runs and credit usage at `console.apify.com`
5. **Meta Graph API Explorer** — test WhatsApp messages at [developers.facebook.com/tools/explorer](https://developers.facebook.com/tools/explorer)
6. **Anthropic Console** — monitor API usage and costs at `console.anthropic.com/settings/usage`

---

## Backup Strategy

### Supabase (automatic)

Supabase Pro includes automated daily backups with point-in-time recovery. On free tier, use:
```bash
# Manual backup via pg_dump
pg_dump "postgresql://postgres:PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres" \
  --no-privileges --no-owner > backup_$(date +%Y%m%d).sql
```

### n8n workflows

```bash
# Export all workflows
docker exec local-lead-ai-n8n n8n export:workflow --all --output=/tmp/workflows-backup.json
docker cp local-lead-ai-n8n:/tmp/workflows-backup.json ./n8n/backup_$(date +%Y%m%d).json
```

### n8n credentials (encrypted backup)

```bash
docker exec local-lead-ai-n8n n8n export:credentials --all --output=/tmp/creds-backup.json
docker cp local-lead-ai-n8n:/tmp/creds-backup.json ./n8n/creds-backup_$(date +%Y%m%d).json
# Note: credentials are AES-256 encrypted with N8N_ENCRYPTION_KEY
```

---

## Troubleshooting

### App container keeps restarting

```bash
docker logs local-lead-ai-app --tail=50
# Look for missing env vars, DB connection errors
```

### WhatsApp webhook not receiving messages

1. Check Meta Developer Console → WhatsApp → Configuration → Webhook is active
2. Verify SSL cert is valid: `curl -I https://app.yourdomain.com/api/webhooks/whatsapp`
3. Check nginx logs: `docker compose exec nginx tail -20 /var/log/nginx/error.log`
4. Verify webhook subscription to `messages` field is enabled

### n8n workflows not triggering

1. Ensure workflows are **Active** (toggle in n8n UI)
2. Check n8n execution logs for errors
3. Verify `N8N_BASE_URL` and `N8N_WEBHOOK_SECRET` match between `.env.local` and n8n

### SSL certificate errors

```bash
# Check cert expiry
openssl s_client -connect app.yourdomain.com:443 -servername app.yourdomain.com 2>/dev/null | openssl x509 -noout -dates

# Force renew
docker compose exec certbot certbot renew --force-renewal
docker compose exec nginx nginx -s reload
```

### Out of disk space

```bash
# Check disk usage
df -h

# Clean Docker build cache
docker system prune -a --volumes
# WARNING: this removes stopped containers and unused images
```
