import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const confirmationTypes = new Set<EmailOtpType>(["signup", "email"]);

function loginRedirect(request: NextRequest, params: Record<string, string>) {
  const url = new URL("/login", request.url);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const response = NextResponse.redirect(loginRedirect(request, { confirmed: "true" }));

  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  let error: Error | null = null;

  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    error = exchangeError;
  } else if (tokenHash && type && confirmationTypes.has(type as EmailOtpType)) {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });
    error = verifyError;
  } else {
    error = new Error("Missing or invalid confirmation credentials.");
  }

  if (error) {
    console.warn("[auth-confirmation] verification failed", { name: error.name, message: error.message });
    response.headers.set("Location", loginRedirect(request, { error: "confirmation_failed" }).toString());
    return response;
  }

  // Confirmation may establish a short-lived session. End it so the user reaches
  // the login screen instead of being immediately redirected to the dashboard.
  const { error: signOutError } = await supabase.auth.signOut();
  if (signOutError) {
    console.warn("[auth-confirmation] session cleanup failed", { name: signOutError.name, message: signOutError.message });
  }

  return response;
}
