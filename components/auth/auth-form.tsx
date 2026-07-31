"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, type FieldErrors, type Resolver } from "react-hook-form";
import { z } from "zod";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { motion } from "framer-motion";

interface AuthFormProps {
  mode: "login" | "register" | "forgot-password" | "reset-password";
  onSubmit: (values: Record<string, string>) => Promise<{ success: boolean; error?: string; message?: string; email?: string } | void>;
  submitLabel: string;
  nextPath?: string;
}

type AuthFormValues = {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  companyName: string;
};

export function AuthForm({ mode, onSubmit, submitLabel, nextPath }: AuthFormProps) {
  const router = useRouter();
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [status, setStatus] = React.useState<{ type: "success" | "error"; message: string } | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [pendingEmail, setPendingEmail] = React.useState<string | null>(null);
  const [checkingConfirmation, setCheckingConfirmation] = React.useState(false);
  const confirmationRequestInFlight = React.useRef(false);

  const checkConfirmation = React.useCallback(async () => {
    if (!pendingEmail || confirmationRequestInFlight.current) return;

    confirmationRequestInFlight.current = true;
    setCheckingConfirmation(true);

    try {
      const response = await fetch("/api/auth/confirmation-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail }),
        cache: "no-store",
      });
      const result: unknown = await response.json().catch(() => null);

      if (response.ok && typeof result === "object" && result !== null && "confirmed" in result && result.confirmed === true) {
        window.sessionStorage.removeItem("salesbrief-pending-confirmation-email");
        router.replace("/login?confirmed=true");
      }
    } catch {
      // Network failures are transient; the scheduled check will retry.
    } finally {
      confirmationRequestInFlight.current = false;
      setCheckingConfirmation(false);
    }
  }, [pendingEmail, router]);

  React.useEffect(() => {
    if (mode !== "register") return;

    const storedEmail = window.sessionStorage.getItem("salesbrief-pending-confirmation-email");
    if (!storedEmail) return;

    const restoreId = window.setTimeout(() => setPendingEmail(storedEmail), 0);
    return () => window.clearTimeout(restoreId);
  }, [mode]);

  React.useEffect(() => {
    if (!pendingEmail) return;

    let stopped = false;
    const check = () => {
      if (!stopped && !document.hidden) void checkConfirmation();
    };
    const intervalId = window.setInterval(check, 4_000);
    const timeoutId = window.setTimeout(() => {
      stopped = true;
      window.clearInterval(intervalId);
    }, 10 * 60_000);
    const onVisibilityChange = () => {
      if (!document.hidden) check();
    };

    check();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stopped = true;
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [checkConfirmation, pendingEmail]);

  const authSchema = React.useMemo(() => {
    const baseSchema = z.object({
      email: z.string().email("Enter a valid email address"),
      password: z.string().optional(),
      confirmPassword: z.string().optional(),
      fullName: z.string().optional(),
      companyName: z.string().optional(),
    });

    if (mode === "register") {
      return baseSchema.extend({
        password: z.string().min(8, "Password must be at least 8 characters"),
        confirmPassword: z.string().min(8, "Confirm your password"),
        fullName: z.string().min(2, "Please enter your full name"),
        companyName: z.string().min(2, "Please enter your company name"),
      });
    }

    if (mode === "login" || mode === "reset-password") {
      return baseSchema.extend({
        password: z.string().min(8, "Password must be at least 8 characters"),
      });
    }

    return baseSchema;
  }, [mode]);

  const resolver = React.useCallback<Resolver<AuthFormValues>>(async (values) => {
    const parsed = authSchema.safeParse(values);
    if (parsed.success) {
      return { values: parsed.data as AuthFormValues, errors: {} };
    }

    const formErrors: Record<string, { type: string; message: string }> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field === "string" && !formErrors[field]) {
        formErrors[field] = { type: issue.code, message: issue.message };
      }
    }

    return { values: {}, errors: formErrors as FieldErrors<AuthFormValues> };
  }, [authSchema]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AuthFormValues>({
    resolver,
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      fullName: "",
      companyName: "",
    },
  });

  if (mode === "register" && pendingEmail) {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-300">
          <p className="font-medium text-emerald-200">Check your email to confirm your account.</p>
          <p className="mt-1 text-emerald-300/80">We sent a confirmation link to {pendingEmail}.</p>
        </div>
        <button type="button" onClick={() => void checkConfirmation()} disabled={checkingConfirmation} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:opacity-70">
          {checkingConfirmation ? <LoaderCircle className="size-4 animate-spin" /> : null}
          I&apos;ve confirmed my email
        </button>
        <Link href="/login" className="block text-center text-sm text-slate-400 transition hover:text-slate-100">Go to sign in</Link>
      </div>
    );
  }

  return (
    <form
      className="space-y-5"
      onSubmit={handleSubmit(async (values) => {
        setLoading(true);
        setStatus(null);
        try {
          const response = await onSubmit({ ...values, next: nextPath ?? "" });
          if (response?.success === false && response.error) {
            setStatus({ type: "error", message: response.error });
          } else if (mode === "register" && response?.success && response.email) {
            window.sessionStorage.setItem("salesbrief-pending-confirmation-email", response.email);
            setPendingEmail(response.email);
          } else if (response?.message) {
            setStatus({ type: "success", message: response.message });
          }
        } catch {
          setStatus({ type: "error", message: "Unable to submit the form. Please try again." });
        } finally {
          setLoading(false);
        }
      })}
    >
      {status ? (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={status.type === "success" ? "rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300" : "rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"}>
          {status.message}
        </motion.div>
      ) : null}

      {mode === "register" ? (
        <>
          <div>
            <label className="mb-2 block text-sm text-slate-300">Full name</label>
            <input {...register("fullName")} className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-100 outline-none" placeholder="Alicia Lewis" />
            {errors.fullName ? <p className="mt-2 text-sm text-rose-300">{errors.fullName.message}</p> : null}
          </div>
          <div>
            <label className="mb-2 block text-sm text-slate-300">Company name</label>
            <input {...register("companyName")} className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-100 outline-none" placeholder="Northstar Studio" />
            {errors.companyName ? <p className="mt-2 text-sm text-rose-300">{errors.companyName.message}</p> : null}
          </div>
        </>
      ) : null}

      <div>
        <label className="mb-2 block text-sm text-slate-300">Email</label>
        <input {...register("email")} type="email" className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-100 outline-none" placeholder="you@company.com" />
        {errors.email ? <p className="mt-2 text-sm text-rose-300">{errors.email.message}</p> : null}
      </div>

      {mode === "login" || mode === "register" ? (
        <div>
          <label className="mb-2 block text-sm text-slate-300">Password</label>
          <div className="flex items-center rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3">
            <input {...register("password")} type={showPassword ? "text" : "password"} className="w-full bg-transparent text-sm text-slate-100 outline-none" placeholder="••••••••" />
            <button type="button" onClick={() => setShowPassword((value) => !value)} className="ml-3 text-slate-400">
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.password ? <p className="mt-2 text-sm text-rose-300">{errors.password.message}</p> : null}
        </div>
      ) : null}

      {mode === "register" ? (
        <div>
          <label className="mb-2 block text-sm text-slate-300">Confirm password</label>
          <div className="flex items-center rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3">
            <input {...register("confirmPassword")} type={showConfirmPassword ? "text" : "password"} className="w-full bg-transparent text-sm text-slate-100 outline-none" placeholder="••••••••" />
            <button type="button" onClick={() => setShowConfirmPassword((value) => !value)} className="ml-3 text-slate-400">
              {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.confirmPassword ? <p className="mt-2 text-sm text-rose-300">{errors.confirmPassword.message}</p> : null}
        </div>
      ) : null}

      {mode === "reset-password" ? (
        <>
          <div>
            <label className="mb-2 block text-sm text-slate-300">New password</label>
            <div className="flex items-center rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3">
              <input {...register("password")} type={showPassword ? "text" : "password"} className="w-full bg-transparent text-sm text-slate-100 outline-none" placeholder="••••••••" />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="ml-3 text-slate-400">
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {errors.password ? <p className="mt-2 text-sm text-rose-300">{errors.password.message}</p> : null}
          </div>
          <div>
            <label className="mb-2 block text-sm text-slate-300">Confirm new password</label>
            <div className="flex items-center rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3">
              <input {...register("confirmPassword")} type={showConfirmPassword ? "text" : "password"} className="w-full bg-transparent text-sm text-slate-100 outline-none" placeholder="••••••••" />
              <button type="button" onClick={() => setShowConfirmPassword((value) => !value)} className="ml-3 text-slate-400">
                {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {errors.confirmPassword ? <p className="mt-2 text-sm text-rose-300">{errors.confirmPassword.message}</p> : null}
          </div>
        </>
      ) : null}

      <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-70">
        {loading ? <LoaderCircle className="size-4 animate-spin" /> : null}
        {submitLabel}
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
        {mode === "login" ? <><Link href="/forgot-password" className="transition hover:text-slate-100">Forgot password?</Link><Link href={nextPath ? `/register?next=${encodeURIComponent(nextPath)}` : "/register"} className="transition hover:text-slate-100">Create account</Link></> : null}
        {mode === "register" ? <Link href={nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login"} className="transition hover:text-slate-100">Already have an account?</Link> : null}
        {mode === "forgot-password" ? <Link href="/login" className="transition hover:text-slate-100">Back to login</Link> : null}
        {mode === "reset-password" ? <Link href="/login" className="transition hover:text-slate-100">Back to login</Link> : null}
      </div>
    </form>
  );
}
