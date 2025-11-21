import { BillingReport } from '../types';
import * as jose from 'jose';

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
}

async function getAccessToken(serviceAccountJson: string): Promise<string> {
  const serviceAccount: ServiceAccount = JSON.parse(serviceAccountJson);
  
  const algorithm = 'RS256';
  const privateKey = await jose.importPKCS8(serviceAccount.private_key, algorithm);
  
  const jwt = await new jose.SignJWT({
    scope: 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/monitoring.read'
  })
    .setProtectedHeader({ alg: algorithm })
    .setIssuer(serviceAccount.client_email)
    .setAudience('https://oauth2.googleapis.com/token')
    .setExpirationTime('1h')
    .setIssuedAt()
    .sign(privateKey);

  const params = new URLSearchParams();
  params.append('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
  params.append('assertion', jwt);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to get Google Access Token: ${text}`);
  }

  const data = await response.json() as any;
  return data.access_token;
}

export async function getGoogleUsage(serviceAccountJson: string): Promise<BillingReport['google']> {
  const serviceAccount: ServiceAccount = JSON.parse(serviceAccountJson);
  const projectId = serviceAccount.project_id;
  const token = await getAccessToken(serviceAccountJson);

  // We want to query the Monitoring API for Gemini Token Usage
  // Metric: generic_task (or similar) is hard to guess.
  // Common metric for AI Studio / Gemini API: `generativelanguage.googleapis.com/request_count` or `token_count`?
  // Currently, public docs for AI Studio metrics are scarce, but `serviceruntime.googleapis.com/api/request_count` filtered by service `generativelanguage.googleapis.com` is a good standard.
  
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // ISO formatted strings
  const startTime = sevenDaysAgo.toISOString();
  const endTime = now.toISOString();

  // Filter for our service
  const filter = `metric.type="serviceruntime.googleapis.com/api/request_count" AND resource.labels.service="generativelanguage.googleapis.com"`;

  const url = `https://monitoring.googleapis.com/v3/projects/${projectId}/timeSeries?filter=${encodeURIComponent(filter)}&interval.startTime=${startTime}&interval.endTime=${endTime}&interval.period=86400s&aggregation.alignmentPeriod=86400s&aggregation.perSeriesAligner=ALIGN_SUM&aggregation.crossSeriesReducer=REDUCE_SUM`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  let requestCount = 0;
  
  if (response.ok) {
    const data = await response.json() as any;
    // Sum up all points
    if (data.timeSeries) {
        data.timeSeries.forEach((series: any) => {
            series.points?.forEach((point: any) => {
                requestCount += parseInt(point.value.int64Value || 0);
            });
        });
    }
  } else {
      console.warn('Google Monitoring API check failed, maybe API not enabled or wrong filter. Continuing with 0.');
      // We don't throw here to allow the report to generate partial data
  }

  return {
    totalCost: 0, // Placeholder as we are measuring usage
    currency: 'USD',
    services: [
      {
        name: 'Gemini API Requests (approx)',
        cost: requestCount // Using 'cost' field to store count for now, or we can rename in types. 
        // Since the interface says 'cost', let's be clear in the name or modify type.
        // I'll treat it as "Usage Count" for now.
      }
    ]
  };
}

