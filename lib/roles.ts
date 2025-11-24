export const SYSTEM_ADMIN_EMAIL = "tombensim@gmail.com"
export const DEV_ADMIN_EMAIL = "dev@genoox.com"

export function isSystemAdmin(email?: string | null) {
  if (!email) return false
  const normalizedEmail = email.toLowerCase()
  
  // In development, also allow dev@genoox.com
  if (process.env.NODE_ENV === "development" && normalizedEmail === DEV_ADMIN_EMAIL.toLowerCase()) {
    return true
  }
  
  return normalizedEmail === SYSTEM_ADMIN_EMAIL.toLowerCase()
}

