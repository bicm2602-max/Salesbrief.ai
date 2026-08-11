import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

async function loadPolicy() {
  const source = (await readFile(new URL("../lib/auth/proxy-policy.ts", import.meta.url), "utf8"))
    .replace(/import .*? from "@\/lib\/supabase\/cookie-options";\r?\n/, 'const CANONICAL_PRODUCTION_HOST = "www.getsalesbrief.com"; const LEGACY_PRODUCTION_HOST = "getsalesbrief.com";\n');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  Function("exports", "module", compiled)(exports, { exports });
  return exports;
}

test("authenticated dashboard routes are all protected by the same central policy", async () => {
  const { isProtectedDashboardPath } = await loadPolicy();
  for (const path of ["/dashboard", "/dashboard/new-analysis", "/dashboard/history", "/dashboard/favorites", "/dashboard/settings", "/dashboard/plans"]) assert.equal(isProtectedDashboardPath(path), true, path);
});

test("public routes are not treated as dashboard routes", async () => {
  const { isProtectedDashboardPath } = await loadPolicy();
  for (const path of ["/", "/login", "/register", "/pricing"]) assert.equal(isProtectedDashboardPath(path), false, path);
});

test("only the legacy apex host redirects to the canonical www host in production", async () => {
  const { shouldRedirectToCanonicalHost, CANONICAL_PRODUCTION_HOST } = await loadPolicy();
  assert.equal(CANONICAL_PRODUCTION_HOST, "www.getsalesbrief.com");
  assert.equal(shouldRedirectToCanonicalHost("getsalesbrief.com", true), true);
  assert.equal(shouldRedirectToCanonicalHost("www.getsalesbrief.com", true), false);
  assert.equal(shouldRedirectToCanonicalHost("getsalesbrief.com", false), false);
});

test("session cookies use a host-only production policy", async () => {
  const source = await readFile(new URL("../lib/supabase/cookie-options.ts", import.meta.url), "utf8");
  assert.match(source, /path: "\/"/);
  assert.match(source, /sameSite: "lax"/);
  assert.match(source, /secure: true/);
  assert.doesNotMatch(source, /domain:/);
});

test("proxy migrates validated legacy cookies and preserves server-side guards", async () => {
  const source = await readFile(new URL("../proxy.ts", import.meta.url), "utf8");
  assert.match(source, /response\.cookies\.set\(cookie\.name, cookie\.value, cookieOptions\)/);
  assert.match(source, /Domain=\.getsalesbrief\.com; Max-Age=0/);
  assert.match(source, /protected route rejected/);
  assert.match(source, /await supabase\.auth\.getUser\(\)/);
});

test("login, logout, and server clients retain server-side session handling", async () => {
  const auth = await readFile(new URL("../lib/server/auth.ts", import.meta.url), "utf8");
  const server = await readFile(new URL("../lib/supabase/server.ts", import.meta.url), "utf8");
  assert.match(auth, /signInWithPassword/);
  assert.match(auth, /redirect\(next\)/);
  assert.match(auth, /auth\.signOut\(\)/);
  assert.match(server, /cookieStore\.set/);
});
