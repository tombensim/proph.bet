/**
 * System admin configuration
 * 
 * Add system admin emails via the SYSTEM_ADMIN_EMAILS environment variable.
 * Multiple emails can be specified, separated by commas.
 * 
 * Example: SYSTEM_ADMIN_EMAILS=admin@example.com,owner@example.com
 * 
 * In development mode, dev@genoox.com is automatically included as a system admin.
 */

let cachedAdminEmails: string[] | null = null

/**
 * Get the list of system admin emails from environment variables.
 * Results are cached for performance.
 */
export function getSystemAdminEmails(): string[] {
  if (cachedAdminEmails !== null) {
    return cachedAdminEmails
  }

  const envAdmins = process.env.SYSTEM_ADMIN_EMAILS || ""
  const parsed = envAdmins
    .split(",")
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
  
  // Always include dev admin in development
  if (process.env.NODE_ENV === "development") {
    const devEmail = "dev@genoox.com"
    if (!parsed.includes(devEmail)) {
      parsed.push(devEmail)
    }
  }
  
  cachedAdminEmails = parsed
  return parsed
}

/**
 * Check if the given email belongs to a system admin.
 */
export function isSystemAdmin(email?: string | null): boolean {
  if (!email) return false
  const adminEmails = getSystemAdminEmails()
  return adminEmails.includes(email.toLowerCase())
}

/**
 * Clear the cached admin emails (useful for testing)
 */
export function clearAdminEmailsCache(): void {
  cachedAdminEmails = null
}

