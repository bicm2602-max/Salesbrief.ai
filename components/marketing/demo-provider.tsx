"use client";
import * as React from "react";
import { DemoModal } from "@/components/marketing/demo-modal";
const DemoContext = React.createContext<(() => void) | null>(null);
export function DemoProvider({ children }: { children: React.ReactNode }) { const [open, setOpen] = React.useState(false); const show = React.useCallback(() => setOpen(true), []); return <DemoContext.Provider value={show}>{children}{open ? <DemoModal onClose={() => setOpen(false)} /> : null}</DemoContext.Provider>; }
export function useDemoModal() { const open = React.useContext(DemoContext); if (!open) throw new Error("useDemoModal must be used within DemoProvider"); return open; }
