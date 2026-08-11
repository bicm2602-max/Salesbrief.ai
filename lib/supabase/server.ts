import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const cookieOptions = getSupabaseCookieOptions(env.isProduction);

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookieOptions,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // The `setAll` method can throw if called from a Server Component.
        }
      },
    },
  });
}
