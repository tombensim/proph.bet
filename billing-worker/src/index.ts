import { Env } from './types';
import { generateReport } from './report';
import { sendBillingReport } from './email';

export default {
  // Cron Trigger
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    // Cron runs for the last 7 days usually, or we can customize.
    // Default behavior of services is 7 days if no dates provided.
    // Or we can explicitly set it to last week.
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    ctx.waitUntil(
      generateReport(env, sevenDaysAgo, now).then(async (report) => {
        if (env.RESEND_API_KEY && env.ADMIN_EMAIL) {
          await sendBillingReport(env.RESEND_API_KEY, env.ADMIN_EMAIL, report);
          console.log('Report sent to', env.ADMIN_EMAIL);
        } else {
          console.log('Skipping email: Missing RESEND_API_KEY or ADMIN_EMAIL');
        }
      })
    );
  },

  // Http Trigger
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Security Check
    const auth = request.headers.get('Authorization');
    const expectedAuth = env.BILLING_ACCESS_TOKEN ? `Bearer ${env.BILLING_ACCESS_TOKEN}` : null;
    
    if (expectedAuth && auth !== expectedAuth) {
      return new Response('Unauthorized', { status: 401 });
    }

    try {
      const url = new URL(request.url);
      const fromParam = url.searchParams.get('from');
      const toParam = url.searchParams.get('to');

      let from: Date | undefined;
      let to: Date | undefined;

      if (fromParam) from = new Date(fromParam);
      if (toParam) to = new Date(toParam);

      // If valid dates provided, verify they are valid dates
      if (from && isNaN(from.getTime())) return new Response('Invalid from date', { status: 400 });
      if (to && isNaN(to.getTime())) return new Response('Invalid to date', { status: 400 });

      // If no dates provided, default logic applies (last 7 days in services, or we can default here)
      // For admin dashboard, we might want "Current Month" as default if nothing passed, 
      // but usually the client passes the dates. 
      // If client passes nothing, let's default to "Month to Date" to be useful?
      // Or just let the services handle their defaults (7 days).
      // Let's stick to service defaults (7 days) if undefined.

      const report = await generateReport(env, from, to);
      
      return new Response(JSON.stringify(report), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error: any) {
      return new Response(`Failed: ${error.message}`, { status: 500 });
    }
  },
};
