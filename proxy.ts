import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";
import { CANONICAL_PRODUCTION_HOST, isProtectedDashboardPath, isSupabaseSessionCookie, shouldRedirectToCanonicalHost } from "@/lib/auth/proxy-policy";

export async function proxy(request: NextRequest) {
  if (shouldRedirectToCanonicalHost(request.nextUrl.hostname, env.isProduction)) {
    const canonicalUrl = request.nextUrl.clone();
    canonicalUrl.protocol = "https:";
    canonicalUrl.host = CANONICAL_PRODUCTION_HOST;
    return NextResponse.redirect(canonicalUrl, 308);
  }

  let response = NextResponse.next({ request });
  const cookieOptions = getSupabaseCookieOptions(env.isProduction);

  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookieOptions,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, { ...options, ...cookieOptions }));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtectedRoute = isProtectedDashboardPath(request.nextUrl.pathname);

  // Migrate a validated session away from the former shared apex/www cookie
  // scope. This avoids two cookies with the same name being sent on later
  // requests, where cookie parsing can select a stale value.
  if (user && env.isProduction) {
    for (const cookie of request.cookies.getAll().filter((item) => isSupabaseSessionCookie(item.name))) {
      response.cookies.set(cookie.name, cookie.value, cookieOptions);
      response.headers.append("Set-Cookie", `${cookie.name}=; Path=/; Domain=.getsalesbrief.com; Max-Age=0; Secure; SameSite=Lax`);
    }
  }

  if (isProtectedRoute && !user) {
    console.warn("[auth-proxy] protected route rejected", { path: request.nextUrl.pathname, host: request.nextUrl.hostname, hasSupabaseCookie: request.cookies.getAll().some((cookie) => isSupabaseSessionCookie(cookie.name)) });
    const redirectUrl = new URL("/login", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && (request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/register" || request.nextUrl.pathname === "/forgot-password" || request.nextUrl.pathname === "/reset-password")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
