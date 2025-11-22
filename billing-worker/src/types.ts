export interface BillingReport {
  vercel: {
    bandwidth: number; // in GB
    functionInvocations: number;
    buildMinutes: number;
    costEstimate: number; // Rough estimate if possible, or just usage
  };
  cloudflare: {
    storageUsed: number; // in GB
    classAOperations: number;
    classBOperations: number;
    costEstimate: number;
  };
  google: {
    totalCost: number;
    currency: string;
    services: {
      name: string;
      cost: number;
    }[];
  };
  timestamp: string;
}

export interface Env {
  VERCEL_TOKEN: string;
  CLOUDFLARE_ANALYTICS_TOKEN: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  GOOGLE_SERVICE_ACCOUNT_JSON: string;
  RESEND_API_KEY: string;
  ADMIN_EMAIL: string;
  BILLING_ACCESS_TOKEN?: string;
}

