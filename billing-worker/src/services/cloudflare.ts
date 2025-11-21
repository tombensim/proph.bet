import { BillingReport } from '../types';

export async function getCloudflareUsage(
  token: string,
  accountId: string
): Promise<BillingReport['cloudflare']> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  // Format: YYYY-MM-DD
  const dateStart = sevenDaysAgo.toISOString().split('T')[0];
  const dateEnd = now.toISOString().split('T')[0];

  const query = `
    query R2Usage($accountTag: string!, $dateStart: Date!, $dateEnd: Date!) {
      viewer {
        accounts(filter: { accountTag: $accountTag }) {
          r2StorageAdaptiveGroups(
            limit: 1000,
            filter: { date_geq: $dateStart, date_leq: $dateEnd }
          ) {
            sum {
              payloadSize
            }
          }
          r2OperationsAdaptiveGroups(
            limit: 1000,
            filter: { date_geq: $dateStart, date_leq: $dateEnd }
          ) {
            sum {
              requests
            }
            dimensions {
              actionType
            }
          }
        }
      }
    }
  `;

  const response = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables: {
        accountTag: accountId,
        dateStart,
        dateEnd,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Cloudflare GraphQL API failed: ${response.statusText}`);
  }

  const result = await response.json() as any;

  if (result.errors && result.errors.length > 0) {
    console.error('Cloudflare GraphQL Errors:', result.errors);
    throw new Error('Cloudflare GraphQL returned errors');
  }

  const data = result.data?.viewer?.accounts?.[0];
  if (!data) {
    return {
        storageUsed: 0,
        classAOperations: 0,
        classBOperations: 0,
        costEstimate: 0
    };
  }

  // Calculate Storage (Average or Max over the period? Usually we want current or average)
  // The API returns sum of payloadSize. R2 storage is billed by GB-month.
  // If we sum daily snapshots, we need to average them.
  // For simplicity, let's take the latest or average.
  // Actually, `payloadSize` in adaptive groups might be total bytes stored * time?
  // Let's check standard R2 metrics. Usually `storageSummary` is better but `r2StorageAdaptiveGroups` works.
  // Assuming payloadSize is bytes-stored-snapshot. 
  
  const storageGroups = data.r2StorageAdaptiveGroups || [];
  let maxStorageBytes = 0;
  storageGroups.forEach((g: any) => {
      if (g.sum?.payloadSize > maxStorageBytes) {
          maxStorageBytes = g.sum.payloadSize;
      }
  });
  const storageGB = maxStorageBytes / (1024 * 1024 * 1024);

  // Calculate Operations
  const operationsGroups = data.r2OperationsAdaptiveGroups || [];
  let classA = 0;
  let classB = 0;

  // Class A: ListBuckets, PutBucket, ListObjects, PutObject, CopyObject, CompleteMultipartUpload, CreateMultipartUpload, UploadPart, UploadPartCopy
  // Class B: GetObject, HeadBucket, HeadObject
  // We need to map actionType to Class A/B.
  // This is a simplification.
  
  const classAActions = ['PutObject', 'CopyObject', 'ListObjects', 'ListBuckets']; 
  // Note: Complete/Create Multipart are also Class A but let's stick to main ones for now or assume 'Object' writes are A.
  
  operationsGroups.forEach((g: any) => {
    const action = g.dimensions?.actionType;
    const count = g.sum?.requests || 0;
    
    // Very rough classification
    if (action && (action.startsWith('Put') || action.startsWith('List') || action.startsWith('Copy') || action.startsWith('Delete'))) {
        classA += count;
    } else if (action && (action.startsWith('Get') || action.startsWith('Head'))) {
        classB += count;
    } else {
        // Default to B or ignore
        classB += count;
    }
  });

  return {
    storageUsed: parseFloat(storageGB.toFixed(2)),
    classAOperations: classA,
    classBOperations: classB,
    costEstimate: 0 // Calculator logic can be added
  };
}

