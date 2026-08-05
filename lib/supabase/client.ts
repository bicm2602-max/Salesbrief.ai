import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

export function createClientSupabaseBrowser() {
  const cookieOptions = typeof window !== "undefined" && window.location.hostname.endsWith("getsalesbrief.com")
    ? { domain: ".getsalesbrief.com", path: "/", sameSite: "lax" as const, secure: window.location.protocol === "https:" }
    : undefined;
  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { cookieOptions });
}
