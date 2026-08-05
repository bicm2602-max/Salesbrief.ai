import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const cookieOptions = env.isProduction && env.NEXT_PUBLIC_SITE_URL === "https://www.getsalesbrief.com"
    ? { domain: ".getsalesbrief.com", path: "/", sameSite: "lax" as const, secure: true }
    : undefined;

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
