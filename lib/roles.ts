export const SYSTEM_ADMIN_EMAIL = "tombensim@gmail.com"

export function isSystemAdmin(email?: string | null) {
  if (!email) return false
  return email.toLowerCase() === SYSTEM_ADMIN_EMAIL.toLowerCase()
}

