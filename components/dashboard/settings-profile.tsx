"use client";

import * as React from "react";
import { updateProfileName } from "@/app/dashboard/actions";

export function SettingsProfile({ initialName, email, companyName }: { initialName: string; email: string; companyName: string }) {
  const [name, setName] = React.useState(initialName); const [saving, setSaving] = React.useState(false); const [message, setMessage] = React.useState<string | null>(null);
  async function save() { setSaving(true); setMessage(null); const result = await updateProfileName(name); setMessage(result.success ? "Profile saved." : result.error); setSaving(false); }
  return <section className="rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]"><h3 className="text-lg font-semibold text-slate-50">Profile</h3><p className="mt-2 text-sm text-slate-400">{email}</p><label className="mt-6 block text-sm text-slate-300">Full name<input value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none" /></label>{companyName ? <p className="mt-4 text-sm text-slate-400">Company: {companyName}</p> : null}<button type="button" disabled={saving} onClick={save} className="mt-6 rounded-full bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-70">{saving ? "Saving…" : "Save profile"}</button>{message ? <p className="mt-3 text-sm text-slate-300">{message}</p> : null}</section>;
}
