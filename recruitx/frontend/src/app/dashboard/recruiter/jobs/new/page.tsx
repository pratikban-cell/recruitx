"use client";

import { apiFetch } from "@/lib/api";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-client";

// ── Types ──────────────────────────────────────────────

interface Message {
  role: "agent" | "recruiter";
  content: string;
}

interface JobFormData {
  title: string;
  company: string;
  location: string;
  remote_policy: string;
  salary_min: string;
  salary_max: string;
  stack: string;
  description: string;
  culture_signals: string;
  experience_required: string;
  dealbreaker_flexibility: string;
}

const emptyForm: JobFormData = {
  title: "",
  company: "",
  location: "",
  remote_policy: "remote",
  salary_min: "",
  salary_max: "",
  stack: "",
  description: "",
  culture_signals: "",
  experience_required: "",
  dealbreaker_flexibility: "",
};

const initialSuggestions = [
  "Senior Backend Engineer, Series A startup, 12 engineers",
  "Platform Engineer, growing team, developer tooling",
  "Full Stack Engineer, design-led product team",
];

// ── Shared save function ───────────────────────────────

async function saveJobToSupabase(data: {
  title: string;
  company: string;
  location: string;
  remote_policy: string;
  salary_min: number | null;
  salary_max: number | null;
  stack: string[];
  description: string;
  culture_signals: string;
  dealbreaker_flexibility: string;
  experience_required: string;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: rec } = await supabase
    .from("recruiters")
    .select("id")
    .eq("profile_id", user.id)
    .single();
  if (!rec)
    throw new Error(
      "Recruiter profile not found. Complete your profile in Settings first.",
    );

  const { error } = await supabase.from("jobs").insert({
    recruiter_id: rec.id,
    company: data.company,
    title: data.title,
    location: data.location,
    remote_policy: data.remote_policy,
    salary_min: data.salary_min,
    salary_max: data.salary_max,
    stack: data.stack,
    description: data.description,
    culture_signals: data.culture_signals,
    dealbreaker_flexibility: data.dealbreaker_flexibility,
    experience_required: data.experience_required,
    status: "active",
  });

  if (error) throw error;
}

// ── Chat sub-components ────────────────────────────────

function AgentMessage({
  content,
  onSuggestion,
}: {
  content: string;
  onSuggestion?: (s: string) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-gradient text-xs font-bold text-white shrink-0">
        A
      </div>
      <div className="flex-1">
        <div className="rounded-2xl rounded-tl-sm border border-card-border bg-white p-4 shadow-sm">
          <p className="text-sm text-foreground/80 leading-relaxed">
            {content}
          </p>
        </div>
        {onSuggestion && (
          <div className="flex flex-wrap gap-2 mt-2">
            {initialSuggestions.map((s) => (
              <button
                key={s}
                onClick={() => onSuggestion(s)}
                className="rounded-full border border-card-border bg-white px-3 py-1.5 text-xs text-muted hover:border-accent/30 hover:text-accent transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RecruiterMessage({ content }: { content: string }) {
  return (
    <div className="flex items-start gap-3 justify-end">
      <div className="flex-1 max-w-[80%]">
        <div className="rounded-2xl rounded-tr-sm bg-accent px-4 py-3 shadow-sm">
          <p className="text-sm text-white">{content}</p>
        </div>
      </div>
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/10 text-xs font-bold text-foreground shrink-0">
        R
      </div>
    </div>
  );
}

// ── Chat mode ──────────────────────────────────────────

function ChatMode({ onCreated }: { onCreated: () => void }) {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "agent",
      content:
        "Hey! I'm your hiring agent. Let's discuss the role you're hiring for. No boring forms — just describe the role, company name, tech stack, and salary range, and I'll extract everything dynamically!",
    },
  ]);
  const [input, setInput] = useState("");
  const [complete, setComplete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const reply = text || input.trim();
    if (!reply) return;
    setInput("");

    const userMsg: Message = { role: "recruiter", content: reply };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);

    setSaving(true);
    setError("");
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const res = await apiFetch("/api/intake/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          profile_id: user?.id,
        }),
      });
      const data = await res.json();

      setMessages((prev) => [...prev, { role: "agent", content: data.reply }]);
      if (data.complete) {
        setComplete(true);
        onCreated();
      }
    } catch (err: any) {
      setError(err?.message || "Failed to reach agent intake API.");
    }
    setSaving(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-muted">Intake Agent conversation active</p>
        <div className="h-1.5 w-32 rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`h-full rounded-full bg-accent transition-all ${complete ? "w-full" : "w-1/2 animate-pulse"}`}
            style={{ width: complete ? "100%" : "50%" }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4">
        {messages.map((m, i) =>
          m.role === "agent" ? (
            <AgentMessage
              key={i}
              content={m.content}
              onSuggestion={
                i === 0
                  ? (s) => {
                      handleSend(s);
                    }
                  : undefined
              }
            />
          ) : (
            <RecruiterMessage key={i} content={m.content} />
          ),
        )}
        {complete && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-5 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-5 w-5 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
            </div>
            {error ? (
              <p className="text-sm font-semibold text-red-800">{error}</p>
            ) : (
              <p className="text-sm font-semibold text-green-800">
                Job profile created! Live on the public job board.
              </p>
            )}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {!complete && (
        <div className="flex items-center gap-3 pt-4 border-t border-card-border">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type your response..."
            className="flex-1 rounded-lg border border-card-border bg-white px-4 py-2.5 text-sm text-foreground placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || saving}
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50 transition-all shadow-sm"
          >
            {saving ? "Analyzing..." : "Send"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Manual Form mode ───────────────────────────────────

function ManualForm({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState<JobFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const update = (field: keyof JobFormData, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await saveJobToSupabase({
        title: form.title,
        company: form.company,
        location: form.location,
        remote_policy: form.remote_policy,
        salary_min: form.salary_min ? parseInt(form.salary_min) : null,
        salary_max: form.salary_max ? parseInt(form.salary_max) : null,
        stack: form.stack
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        description: form.description,
        culture_signals: form.culture_signals,
        dealbreaker_flexibility: form.dealbreaker_flexibility,
        experience_required: form.experience_required,
      });
      setSuccess(true);
      onCreated();
    } catch (err: any) {
      setError(err?.message || "Failed to save job.");
    }
    setSaving(false);
  };

  const inputClass =
    "w-full rounded-lg border border-card-border bg-white px-4 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";

  if (success) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-6 w-6 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
        </div>
        <p className="text-sm font-semibold text-green-800">
          Job posted! Live on the public board.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 overflow-y-auto pr-2 max-h-full"
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Job Title *
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            required
            className={inputClass}
            placeholder="Senior Backend Engineer"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Company *
          </label>
          <input
            type="text"
            value={form.company}
            onChange={(e) => update("company", e.target.value)}
            required
            className={inputClass}
            placeholder="Acme Inc."
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Location
          </label>
          <input
            type="text"
            value={form.location}
            onChange={(e) => update("location", e.target.value)}
            className={inputClass}
            placeholder="San Francisco, CA / Remote"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Remote Policy
          </label>
          <select
            value={form.remote_policy}
            onChange={(e) => update("remote_policy", e.target.value)}
            className={inputClass}
          >
            <option value="remote">Fully Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">On-site</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Salary Min ($)
          </label>
          <input
            type="number"
            value={form.salary_min}
            onChange={(e) => update("salary_min", e.target.value)}
            className={inputClass}
            placeholder="140000"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Salary Max ($)
          </label>
          <input
            type="number"
            value={form.salary_max}
            onChange={(e) => update("salary_max", e.target.value)}
            className={inputClass}
            placeholder="180000"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Tech Stack (comma separated)
        </label>
        <input
          type="text"
          value={form.stack}
          onChange={(e) => update("stack", e.target.value)}
          className={inputClass}
          placeholder="Python, FastAPI, PostgreSQL, AWS"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Job Description
        </label>
        <textarea
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          rows={3}
          className={inputClass}
          placeholder="Describe the role and what the candidate will work on..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Culture Signals
        </label>
        <input
          type="text"
          value={form.culture_signals}
          onChange={(e) => update("culture_signals", e.target.value)}
          className={inputClass}
          placeholder="4.2 Glassdoor, async-first, 4-day work week"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Experience Required
        </label>
        <input
          type="text"
          value={form.experience_required}
          onChange={(e) => update("experience_required", e.target.value)}
          className={inputClass}
          placeholder="3+ years (flexible for strong candidates)"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Dealbreaker Flexibility
        </label>
        <input
          type="text"
          value={form.dealbreaker_flexibility}
          onChange={(e) => update("dealbreaker_flexibility", e.target.value)}
          className={inputClass}
          placeholder="Salary flexible, experience less important than ability"
        />
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={saving || !form.title || !form.company}
          className="rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50 transition-all shadow-sm"
        >
          {saving ? "Posting..." : "Post Job"}
        </button>
      </div>
    </form>
  );
}

// ── Main page ──────────────────────────────────────────

export default function CreateJobPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"chat" | "form">("chat");

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Create a Job
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Post a role to the public job board
          </p>
        </div>
        <div className="flex items-center rounded-lg border border-card-border bg-white p-0.5 shadow-sm">
          <button
            onClick={() => setMode("chat")}
            className={`rounded-md px-4 py-2 text-xs font-medium transition-all ${mode === "chat" ? "bg-accent text-white shadow-sm" : "text-muted hover:text-foreground"}`}
          >
            <span className="mr-1.5">&#9670;</span> Chat with Agent
          </button>
          <button
            onClick={() => setMode("form")}
            className={`rounded-md px-4 py-2 text-xs font-medium transition-all ${mode === "form" ? "bg-accent text-white shadow-sm" : "text-muted hover:text-foreground"}`}
          >
            <span className="mr-1.5">&#9744;</span> Manual Form
          </button>
        </div>
      </div>

      <div className="flex-1 rounded-xl border border-card-border bg-white p-6 shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto">
          {mode === "chat" ? (
            <ChatMode onCreated={() => {}} />
          ) : (
            <ManualForm onCreated={() => {}} />
          )}
        </div>
      </div>

      <div className="mt-4 text-center">
        <Link
          href="/dashboard/recruiter/jobs"
          className="text-xs text-muted hover:text-accent transition-colors"
        >
          &larr; Back to jobs
        </Link>
      </div>
    </div>
  );
}
