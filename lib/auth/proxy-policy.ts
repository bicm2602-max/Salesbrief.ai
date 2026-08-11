import { CANONICAL_PRODUCTION_HOST, LEGACY_PRODUCTION_HOST } from "@/lib/supabase/cookie-options";

const protectedPrefixes = ["/dashboard", "/history", "/settings", "/new-analysis", "/favorites"];

export function isProtectedDashboardPath(pathname: string) {
  return protectedPrefixes.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function shouldRedirectToCanonicalHost(hostname: string, isProduction: boolean) {
  return isProduction && hostname === LEGACY_PRODUCTION_HOST;
}

export function isSupabaseSessionCookie(name: string) {
  return name.startsWith("sb-");
}

export { CANONICAL_PRODUCTION_HOST };
