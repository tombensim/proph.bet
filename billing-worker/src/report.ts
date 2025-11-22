import { Env, BillingReport } from './types';
import { getVercelUsage } from './services/vercel';
import { getCloudflareUsage } from './services/cloudflare';
import { getGoogleUsage } from './services/google';

export async function generateReport(env: Env, from?: Date, to?: Date): Promise<BillingReport> {
  const now = new Date();
  const timestamp = now.toISOString();

  const report: BillingReport = {
    timestamp,
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
          report.vercel = await getVercelUsage(env.VERCEL_TOKEN, from, to);
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
          report.cloudflare = await getCloudflareUsage(env.CLOUDFLARE_ANALYTICS_TOKEN, env.CLOUDFLARE_ACCOUNT_ID, from, to);
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
          report.google = await getGoogleUsage(env.GOOGLE_SERVICE_ACCOUNT_JSON, from, to);
        } catch (e: any) {
          console.error('Google Error:', e);
          errors.push(`Google: ${e.message}`);
        }
      }
    })()
  ]);

  if (errors.length > 0) {
    console.error('Errors occurred during report generation:', errors);
    // We could add errors to the report object if we wanted to surface them to the UI
  }

  return report;
}

