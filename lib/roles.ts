/**
 * Re-export admin configuration from the centralized module.
 * This file exists for backwards compatibility with existing imports.
 * 
 * @deprecated Import directly from "@/lib/admin-config" instead.
 */
export { isSystemAdmin, getSystemAdminEmails } from "./admin-config"
