import { Env, BillingReport } from './types';
import { getVercelUsage } from './services/vercel';
import { getCloudflareUsage } from './services/cloudflare';
import { getGoogleUsage } from './services/google';
import { sendBillingReport } from './email';

export default {
  // Cron Trigger
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(generateAndSendReport(env));
  },

  // Http Trigger (for testing)
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Basic security check for manual trigger if needed, or just allow for now
    // If you want to protect this, add a secret header check.
    // const auth = request.headers.get('Authorization');
    // if (auth !== `Bearer ${env.ManualToken}`) return new Response('Unauthorized', { status: 401 });

    try {
      await generateAndSendReport(env);
      return new Response('Report sent successfully', { status: 200 });
    } catch (error: any) {
      return new Response(`Failed: ${error.message}`, { status: 500 });
    }
  },
};

async function generateAndSendReport(env: Env) {
  console.log('Starting billing report generation...');
  
  const report: BillingReport = {
    timestamp: new Date().toISOString(),
    vercel: { bandwidth: 0, functionInvocations: 0, buildMinutes: 0, costEstimate: 0 },
    cloudflare: { storageUsed: 0, classAOperations: 0, classBOperations: 0, costEstimate: 0 },
    google: { totalCost: 0, currency: 'USD', services: [] }
  };

  const errors: string[] = [];

  // Run in parallel
  await Promise.all([
    // Vercel
    (async () => {
      if (env.VERCEL_TOKEN) {
        try {
          report.vercel = await getVercelUsage(env.VERCEL_TOKEN);
        } catch (e: any) {
          console.error('Vercel Error:', e);
          errors.push(`Vercel: ${e.message}`);
        }
      }
    })(),

    // Cloudflare
    (async () => {
      if (env.CLOUDFLARE_ANALYTICS_TOKEN && env.CLOUDFLARE_ACCOUNT_ID) {
        try {
          report.cloudflare = await getCloudflareUsage(env.CLOUDFLARE_ANALYTICS_TOKEN, env.CLOUDFLARE_ACCOUNT_ID);
        } catch (e: any) {
          console.error('Cloudflare Error:', e);
          errors.push(`Cloudflare: ${e.message}`);
        }
      }
    })(),

    // Google
    (async () => {
      if (env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        try {
          report.google = await getGoogleUsage(env.GOOGLE_SERVICE_ACCOUNT_JSON);
        } catch (e: any) {
          console.error('Google Error:', e);
          errors.push(`Google: ${e.message}`);
        }
      }
    })()
  ]);

  if (env.RESEND_API_KEY && env.ADMIN_EMAIL) {
    await sendBillingReport(env.RESEND_API_KEY, env.ADMIN_EMAIL, report);
    console.log('Report sent to', env.ADMIN_EMAIL);
  } else {
    console.log('Skipping email: Missing RESEND_API_KEY or ADMIN_EMAIL');
    console.log('Report JSON:', JSON.stringify(report, null, 2));
  }

  if (errors.length > 0) {
    console.error('Errors occurred:', errors);
  }
}

