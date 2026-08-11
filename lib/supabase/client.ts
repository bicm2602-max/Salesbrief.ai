import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";

export function createClientSupabaseBrowser() {
  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { cookieOptions: getSupabaseCookieOptions(env.isProduction) });
}
