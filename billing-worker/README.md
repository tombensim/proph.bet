# Billing Worker

This Cloudflare Worker generates and sends weekly billing reports for your services.

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables

Copy the example env file and fill in your secrets:
```bash
cp .env.example .env
```

#### Getting Your API Keys:

**Vercel Token:**
- Go to https://vercel.com/account/tokens
- Create a new token with appropriate scope

**Cloudflare Analytics Token:**
- Go to https://dash.cloudflare.com/profile/api-tokens
- Use "Read Analytics" template or create Custom Token with:
  - Account > Account Analytics > Read
- Also note your Account ID from the Workers & Pages sidebar
- **Note:** This is stored as `CLOUDFLARE_ANALYTICS_TOKEN` to avoid conflicts with Wrangler's deployment authentication

**Google Service Account JSON:**
- Go to Google Cloud Console > IAM & Admin > Service Accounts
- Create a new service account or use an existing one
- Grant it the "Monitoring Viewer" role
- Create a JSON key
- **IMPORTANT**: Copy the entire JSON content and paste it **on a single line** in your `.env` file
  - The JSON will have `\n` sequences in the private_key - keep them as-is
  - Example: `GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...",...}`

**Resend API Key:**
- Go to https://resend.com/api-keys
- Create a new API key

**Admin Email:**
- Set this to the email address where you want to receive the reports

### 3. Upload Secrets to Cloudflare

Use the helper script to automatically upload all secrets from your `.env` file:
```bash
./scripts/upload-secrets.sh
```

This will read your `.env` file and upload each secret to Cloudflare Workers using `wrangler secret put`.

### 4. Deploy

```bash
npm run deploy
```

## Testing

You can manually trigger the worker for testing:
```bash
npx wrangler dev
```

Then visit `http://localhost:8787` to trigger a report generation.

## Scheduled Runs

The worker is configured to run automatically every Monday at 9 AM UTC (see `wrangler.toml`).

## What Gets Tracked

- **Vercel**: Bandwidth, Function Invocations, Build Minutes (last 7 days)
- **Cloudflare R2**: Storage used, Class A/B operations (last 7 days)  
- **Google Gemini**: API request counts (last 7 days)

The report is sent via Resend to your configured admin email.

