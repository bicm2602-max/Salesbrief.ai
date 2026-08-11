import type { CookieOptions } from "@supabase/ssr";

/**
 * Production is served exclusively from www.getsalesbrief.com. Host-only
 * session cookies prevent apex/www duplicates with the same Supabase key.
 */
export function getSupabaseCookieOptions(isProduction: boolean): CookieOptions | undefined {
  return isProduction ? { path: "/", sameSite: "lax", secure: true } : undefined;
}

export const CANONICAL_PRODUCTION_HOST = "www.getsalesbrief.com";
export const LEGACY_PRODUCTION_HOST = "getsalesbrief.com";
