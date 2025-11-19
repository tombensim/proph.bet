# Deployment Guide: Vercel + Supabase

## Prerequisites

- A [Vercel](https://vercel.com) account.
- A [Supabase](https://supabase.com) account.

## 1. Supabase Setup

1. Create a new project in Supabase.
2. Go to **Project Settings > Database** to find your Connection String.
   - Use the **Transaction Pooler** connection string (port 6543) for `DATABASE_URL`.
3. Go to **Storage** and create a new public bucket named `prophbet-evidence` (or your preferred name).
4. Go to **Project Settings > Storage** to find your S3 credentials (`S3_ACCESS_KEY` and `S3_SECRET_KEY`) and Endpoint.

## 2. Vercel Setup

1. Import your repository into Vercel.
2. In the **Configure Project** step, expand **Environment Variables** and add the following:

| Variable | Description | Example Value |
| :--- | :--- | :--- |
| `DATABASE_URL` | Postgres Connection String (Transaction Pooler) | `postgres://postgres.xxxx:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true` |
| `NEXTAUTH_SECRET` | Random string for encryption | `(generate with openssl rand -base64 32)` |
| `NEXTAUTH_URL` | Production URL | `https://your-app.vercel.app` |
| `S3_REGION` | Region of your bucket | `us-east-1` (or check Supabase settings) |
| `S3_ENDPOINT` | S3 Endpoint URL | `https://your-project-ref.supabase.co/storage/v1/s3` |
| `S3_ACCESS_KEY` | S3 Access Key | `(from Supabase Storage settings)` |
| `S3_SECRET_KEY` | S3 Secret Key | `(from Supabase Storage settings)` |
| `S3_BUCKET_NAME` | Bucket Name | `prophbet-evidence` |
| `CRON_SECRET` | Secret to secure cron jobs | `(generate a strong random string)` |

3. Deploy the project.

## 3. Post-Deployment Steps

After the deployment is successful, you need to set up the database schema and seed initial data.

1. **Push Schema to Production DB:**
   Run this command locally (replace `DATABASE_URL` with your production connection string):
   ```bash
   DATABASE_URL="your_production_connection_string" npx prisma db push
   ```

2. **Seed Initial Data:**
   Run the seed script to create the "Global Arena":
   ```bash
   DATABASE_URL="your_production_connection_string" npx tsx prisma/seed-migration.ts
   ```

## Troubleshooting

- **Build Fails on Prisma:** Ensure `postinstall`: `prisma generate` is running. Vercel should handle this automatically with the script added to `package.json`.
- **Cron Jobs:** Check Vercel Dashboard > Settings > Cron Jobs to verify the schedule.

