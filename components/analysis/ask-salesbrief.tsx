"use client";

import * as React from "react";
import { ArrowUp, LoaderCircle, Sparkles } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };

const suggestions = [
  "What are this company’s main priorities?",
  "Who is their ideal customer?",
  "What pain points can I reference safely?",
  "What would be the best outreach angle?",
  "Summarize this company in 3 bullet points.",
];

export function AskSalesBrief({ analysisId }: { analysisId: string }) {
  const [question, setQuestion] = React.useState("");
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const stored = window.sessionStorage.getItem(`salesbrief-analysis-chat-${analysisId}`);
    if (!stored) return;

    const restoreId = window.setTimeout(() => {
      try {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setMessages(parsed.filter(isMessage).slice(-12));
        }
      } catch {
        window.sessionStorage.removeItem(`salesbrief-analysis-chat-${analysisId}`);
      }
    }, 0);
    return () => window.clearTimeout(restoreId);
  }, [analysisId]);

  React.useEffect(() => {
    if (messages.length) {
      window.sessionStorage.setItem(`salesbrief-analysis-chat-${analysisId}`, JSON.stringify(messages.slice(-12)));
    }
  }, [analysisId, messages]);

  async function askQuestion(value = question) {
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Please enter a question.");
      return;
    }
    if (trimmed.length > 500) {
      setError("Please keep questions under 500 characters.");
      return;
    }

    setLoading(true);
    setError(null);
    setQuestion("");
    const nextMessages = limitMessages([...messages, { role: "user" as const, content: trimmed }]);
    setMessages(nextMessages);

    try {
      const response = await fetch(`/api/analyses/${analysisId}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, history: messages.slice(-6) }),
        cache: "no-store",
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok || !hasAnswer(result)) {
        const message = typeof result === "object" && result !== null && "error" in result && typeof result.error === "string"
          ? result.error
          : "The company assistant could not answer right now. Please try again.";
        throw new Error(message);
      }
      setMessages((current) => limitMessages([...current, { role: "assistant", content: result.answer }]));
    } catch (requestError) {
      setMessages(messages);
      setQuestion(trimmed);
      setError(requestError instanceof Error ? requestError.message : "The company assistant could not answer right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] sm:p-7">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-blue-500/10 p-2.5 text-blue-300"><Sparkles className="size-5" /></div>
        <div>
          <h3 className="text-xl font-semibold text-slate-50">Ask SalesBrief</h3>
          <p className="mt-1 text-sm leading-6 text-slate-400">Ask about this company using only the research in this brief.</p>
        </div>
      </div>

      {messages.length ? <div className="mt-6 space-y-3" aria-live="polite">
        {messages.map((message, index) => <div key={`${message.role}-${index}`} className={message.role === "user" ? "ml-auto max-w-2xl rounded-2xl bg-blue-600 px-4 py-3 text-sm leading-6 text-white" : "max-w-2xl rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm leading-6 text-slate-300"}>{message.content}</div>)}
      </div> : <div className="mt-6 flex flex-wrap gap-2">
        {suggestions.map((suggestion) => <button key={suggestion} type="button" disabled={loading} onClick={() => void askQuestion(suggestion)} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-left text-sm text-slate-300 transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:opacity-60">{suggestion}</button>)}
      </div>}

      <div className="mt-6 flex gap-3">
        <label className="sr-only" htmlFor={`ask-salesbrief-${analysisId}`}>Ask a question about this company</label>
        <textarea id={`ask-salesbrief-${analysisId}`} value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={500} rows={2} placeholder="Ask a question about this company…" className="min-h-20 flex-1 resize-y rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-400/60" />
        <button type="button" onClick={() => void askQuestion()} disabled={loading} aria-label="Ask SalesBrief" className="self-end rounded-2xl bg-blue-600 p-3 text-white transition hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:cursor-not-allowed disabled:opacity-60">
          {loading ? <LoaderCircle className="size-5 animate-spin" /> : <ArrowUp className="size-5" />}
        </button>
      </div>
      {error ? <p className="mt-3 text-sm text-rose-300" role="alert">{error}</p> : null}
    </section>
  );
}

function limitMessages(messages: Message[]) {
  return messages.slice(-12);
}

function isMessage(value: unknown): value is Message {
  return typeof value === "object" && value !== null
    && "role" in value && (value.role === "user" || value.role === "assistant")
    && "content" in value && typeof value.content === "string" && value.content.length > 0 && value.content.length <= 1_200;
}

function hasAnswer(value: unknown): value is { answer: string } {
  return typeof value === "object" && value !== null && "answer" in value && typeof value.answer === "string";
}
