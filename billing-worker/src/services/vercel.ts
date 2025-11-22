import { BillingReport } from '../types';

export async function getVercelUsage(token: string, fromDate?: Date, toDate?: Date): Promise<BillingReport['vercel']> {
  const projectId = ''; // Optional: if we want to filter by project, but usually usage is team/account wide or we can iterate. 
  // However, without a specific team ID or project ID, it might default to the user's personal account. 
  // For now, we will assume the token has access to the relevant scope.
  
  // We need to calculate the start and end date for the "last week" or provided range.
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const from = fromDate ? fromDate.toISOString() : sevenDaysAgo.toISOString();
  const to = toDate ? toDate.toISOString() : now.toISOString();

  // https://vercel.com/docs/rest-api/endpoints/usage#get-usage
  // Note: The endpoint might require teamId if it's a team.
  const url = `https://api.vercel.com/v1/usage?from=${from}&to=${to}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    console.error(`Vercel API failed: ${response.status} ${response.statusText}`);
    const text = await response.text();
    console.error('Response:', text);
    throw new Error(`Failed to fetch Vercel usage: ${response.statusText}`);
  }

  const data = await response.json() as any;

  // Helper to sum up metrics if they are broken down by project
  // The structure usually has top level metrics or a 'metrics' object.
  // Let's try to extract common fields. 
  // Based on Vercel API, it returns an object with usage keys.
  
  // Example response structure (simplified):
  // {
  //   "bandwidth": { "tx": 1024, "rx": 2048 },
  //   "serverlessDuration": 1000,
  //   "buildHours": 0.5
  // }
  // Note: The API structure changes periodically, but we'll look for standard keys.

  // Metrics are often in:
  // data.bandwidth.tx (bytes)
  // data.functionInvocationDuration (ms?) or similar
  // data.buildHours

  // Let's convert bytes to GB
  const bandwidthBytes = (data.bandwidth?.tx || 0) + (data.bandwidth?.rx || 0);
  const bandwidthGB = bandwidthBytes / (1024 * 1024 * 1024);

  // Functions
  const functionInvocations = data.totalFunctionsInvocations || 0;

  // Build minutes (often returned as buildHours or similar)
  const buildMinutes = (data.buildHours || 0) * 60;

  return {
    bandwidth: parseFloat(bandwidthGB.toFixed(2)),
    functionInvocations,
    buildMinutes: parseFloat(buildMinutes.toFixed(2)),
    costEstimate: 0, // Hard to calculate without pricing tier logic, leaving as 0 for now or we can add rough math later.
  };
}

