import type { User } from "@supabase/supabase-js";

export type AdminRole = "full" | "notams";

/** Full admin unless app_metadata.admin_role is explicitly "notams". */
export function resolveAdminRole(user: User | null | undefined): AdminRole {
  if (user?.app_metadata?.admin_role === "notams") return "notams";
  return "full";
}

export function canAccessAdminTab(role: AdminRole, tab: string): boolean {
  if (role === "full") return true;
  return tab === "notams";
}
