import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  email: z.string().trim().email().max(320),
});

const notConfirmed = () => NextResponse.json({ confirmed: false }, { headers: { "Cache-Control": "no-store" } });

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return notConfirmed();
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return notConfirmed();
  }

  try {
    const admin = createAdminSupabaseClient();
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id")
      .ilike("email", parsed.data.email)
      .maybeSingle();

    if (profileError || !profile) {
      return notConfirmed();
    }

    const { data, error } = await admin.auth.admin.getUserById(profile.id);
    if (error || !data.user) {
      return notConfirmed();
    }

    return NextResponse.json(
      { confirmed: Boolean(data.user.email_confirmed_at ?? data.user.confirmed_at) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return notConfirmed();
  }
}
