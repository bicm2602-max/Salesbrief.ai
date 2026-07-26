import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export function createAdminSupabaseClient() {
  if (!env.SUPABASE_SERVICE_ROLE) {
    throw new Error("SUPABASE_SERVICE_ROLE is not configured");
  }

  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
