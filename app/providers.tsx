"use client";

import * as React from "react";
import { ThemeProvider } from "@/providers/theme-provider";
import { ToastProvider } from "@/providers/toast-provider";
import { SupabaseProvider } from "@/providers/supabase-provider";
import { AuthProvider } from "@/providers/auth-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider />
      <SupabaseProvider>
        <AuthProvider>{children}</AuthProvider>
      </SupabaseProvider>
    </ThemeProvider>
  );
}
