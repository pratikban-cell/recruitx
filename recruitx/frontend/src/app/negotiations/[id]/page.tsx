"use client";

import { createClient } from "@/lib/supabase-client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { mockMessages, mockProfile as mockProfileData } from "@/lib/mock-data";
import {
  createNegotiationWebSocket,
  pauseNegotiation,
  resumeNegotiation,
  updateNegotiationStatus,
} from "@/lib/api";

type Message = {
  id: string;
  sender_role: "candidate" | "recruiter" | "system";
  content: string;
  created_at: string;
};

export default function NegotiationPage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [negotiation, setNegotiation] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectCategory, setRejectCategory] = useState("salary_mismatch");
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(profile || mockProfileData);

      const { data: neg } = await supabase
        .from("negotiations")
        .select("*, candidate:candidates(*), recruiter:recruiters(*)")
        .eq("id", id)
        .single();

      if (neg) {
        setNegotiation(neg);
        const match = (neg.candidate_notes || "").match(/[a-f0-9\-]{36}/);
        if (match) {
          const jobId = match[0];
          const { data: job } = await supabase
            .from("jobs")
            .select("*")
            .eq("id", jobId)
            .single();
          if (job) {
            const recruiterObj = Array.isArray(neg.recruiter)
              ? neg.recruiter[0]
              : neg.recruiter;
            const updatedRecruiter = {
              ...recruiterObj,
              company: job.company,
              position: job.title,
            };
            setNegotiation((prev: any) => ({
              ...prev,
              recruiter: [updatedRecruiter],
            }));
          }
        }
      } else {
        setNegotiation({
          id,
          status: "active",
          fit_score: 92,
          candidate: [
            {
              title: "Senior Frontend Engineer",
              skills: ["React", "TypeScript"],
            },
          ],
          recruiter: [
            { company: "Stripe", position: "Senior Backend Engineer" },
          ],
        });
      }

      const { data: msgs } = await supabase
        .from("messages")
        .select("*")
        .eq("negotiation_id", id)
        .order("created_at", { ascending: true });
      const isMockNeg = typeof id === "string" && id.startsWith("mock");
      setMessages(
        msgs && msgs.length > 0 ? msgs : isMockNeg ? mockMessages : [],
      );

      setLoading(false);
    };
    load();
  }, [id]);

  useEffect(() => {
    if (!id || loading) return;

    const ws = createNegotiationWebSocket(id as string, (data: any) => {
      if (data) {
        const msgContent = data.content || data.message?.parts?.[0]?.text;
        const msgRole =
          data.sender_role ||
          (data.message?.role === 1
            ? "candidate"
            : data.message?.role === 2
              ? "recruiter"
              : "system");

        if (msgContent) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === data.id)) return prev;
            return [
              ...prev,
              {
                id: data.id || crypto.randomUUID(),
                sender_role:
                  msgRole === "candidate" ||
                  msgRole === "recruiter" ||
                  msgRole === "system"
                    ? msgRole
                    : "system",
                content: msgContent,
                created_at: data.created_at || new Date().toISOString(),
              },
            ];
          });
        }
      }
    });

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [id, loading]);

  const isCandidate = profile?.role === "candidate";

  const isPaused =
    (negotiation?.candidate_notes || "").includes("paused") ||
    (negotiation?.recruiter_notes || "").includes("paused");

  const handlePause = async () => {
    if (!profile) return;
    try {
      const data = await pauseNegotiation(id as string, profile.role);
      if (data.status === "paused") {
        setNegotiation((prev: any) => ({
          ...prev,
          [profile.role === "candidate"
            ? "candidate_notes"
            : "recruiter_notes"]: "paused",
        }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleResume = async () => {
    try {
      const data = await resumeNegotiation(id as string);
      if (data.status === "resumed") {
        setNegotiation((prev: any) => ({
          ...prev,
          candidate_notes: "",
          recruiter_notes: "",
        }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || !negotiation || !profile) return;
    setSending(true);

    const newMsg = {
      id: crypto.randomUUID(),
      negotiation_id: id as string,
      sender_role: profile.role,
      content: inputText,
      created_at: new Date().toISOString(),
    };

    try {
      await supabase.from("messages").insert({
        id: newMsg.id,
        negotiation_id: newMsg.negotiation_id,
        sender_role: newMsg.sender_role,
        content: newMsg.content,
      });

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(newMsg));
      }

      setMessages((prev) => [...prev, newMsg]);
      setInputText("");
    } catch (e) {
      console.error(e);
    }
    setSending(false);
  };

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-subtle">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );

  const recruiter = Array.isArray(negotiation?.recruiter)
    ? negotiation?.recruiter[0]
    : negotiation?.recruiter;
  const candidate = Array.isArray(negotiation?.candidate)
    ? negotiation?.candidate[0]
    : negotiation?.candidate;

  const otherParty = isCandidate
    ? { name: recruiter?.company || "Recruiter", role: "Recruiter Agent" }
    : { name: candidate?.title || "Candidate", role: "Candidate Agent" };

  return (
    <div className="min-h-screen bg-subtle">
      <nav className="border-b border-card-border bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href={
                isCandidate ? "/dashboard/candidate" : "/dashboard/recruiter"
              }
              className="text-sm text-muted hover:text-foreground transition-colors"
            >
              &larr; Dashboard
            </Link>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent-gradient shadow-sm">
              <span className="text-sm font-bold text-white">H</span>
            </div>
            <span className="text-lg font-semibold text-foreground">
              recruitx
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                negotiation?.status === "active"
                  ? "text-blue-600 bg-blue-50"
                  : negotiation?.status === "matched"
                    ? "text-green-600 bg-green-50"
                    : "text-gray-600 bg-gray-50"
              }`}
            >
              {negotiation?.status}
            </span>
            <button
              onClick={() =>
                supabase.auth.signOut().then(() => router.push("/"))
              }
              className="text-sm text-muted hover:text-foreground transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              {isCandidate ? "Negotiation with " : "Negotiating with "}
              {otherParty.name}
              {isCandidate && (
                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-600 flex items-center gap-1 shadow-sm whitespace-nowrap">
                  🛡️ KYC Verified ✓
                </span>
              )}
            </h1>
            <p className="text-sm text-muted mt-0.5">
              {otherParty.role} ·{" "}
              {negotiation?.fit_score
                ? `${negotiation.fit_score}% fit score`
                : "Awaiting evaluation"}
            </p>
          </div>

          {negotiation?.status === "active" && (
            <div className="flex items-center gap-3">
              {isPaused ? (
                <>
                  <span className="rounded-lg bg-yellow-50 px-3 py-1.5 text-xs font-semibold text-yellow-800 border border-yellow-100">
                    ⚠️ Takeover Mode Active
                  </span>
                  <button
                    onClick={handleResume}
                    className="rounded-lg bg-accent px-4 py-1.5 text-xs font-semibold text-white hover:bg-accent/90 transition-all shadow-sm"
                  >
                    Resume Agent
                  </button>
                </>
              ) : (
                <>
                  <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 border border-blue-100">
                    🤖 Agent Negotiating...
                  </span>
                  <button
                    onClick={handlePause}
                    className="rounded-lg bg-foreground px-4 py-1.5 text-xs font-semibold text-white hover:bg-foreground/90 transition-all shadow-sm"
                  >
                    Pause & Take Over
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-card-border bg-white shadow-card overflow-hidden">
          <div className="flex items-center gap-3 border-b border-card-border bg-subtle/50 px-5 py-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-[10px] font-bold text-accent">
              Y
            </div>
            <span className="text-xs font-medium text-muted">Your Agent</span>
            <span className="text-muted/30 mx-2">|</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-gradient text-[10px] font-bold text-white">
              T
            </div>
            <span className="text-xs font-medium text-muted">
              {otherParty.name} Agent
            </span>
          </div>

          <div className="space-y-4 p-5 h-[400px] overflow-y-auto">
            {messages.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-muted">
                  Negotiation hasn&apos;t started yet. Agents will begin
                  shortly.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const fromMe = isCandidate
                  ? msg.sender_role === "candidate"
                  : msg.sender_role === "recruiter";
                return (
                  <div
                    key={msg.id}
                    className={`flex ${fromMe ? "justify-end" : msg.sender_role === "system" ? "justify-center" : "justify-start"}`}
                  >
                    {msg.sender_role === "system" ? (
                      <div className="rounded-lg bg-accent/5 border border-accent/10 px-4 py-2">
                        <p className="text-xs text-accent-dark font-medium">
                          {msg.content}
                        </p>
                      </div>
                    ) : (
                      <div
                        className={`max-w-[80%] rounded-2xl p-3.5 ${
                          fromMe
                            ? "rounded-br-sm bg-accent/5 border border-accent/10"
                            : "rounded-bl-sm bg-background border border-card-border"
                        }`}
                      >
                        <p
                          className={`text-sm leading-relaxed ${fromMe ? "text-accent-dark font-medium" : "text-foreground"}`}
                        >
                          {msg.content}
                        </p>
                        <p className="mt-1 text-[10px] font-medium text-muted/60">
                          {fromMe ? "You" : otherParty.name} ·{" "}
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {isPaused && negotiation?.status === "active" && (
            <div className="flex items-center gap-3 p-4 border-t border-card-border bg-subtle/20">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Type your message as human takeover..."
                className="flex-1 rounded-lg border border-card-border bg-white px-4 py-2.5 text-sm text-foreground placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
              <button
                onClick={handleSend}
                disabled={sending || !inputText.trim()}
                className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50 transition-all shadow-sm"
              >
                {sending ? "Sending..." : "Send"}
              </button>
            </div>
          )}
        </div>

        {/* Recruiter Decision Panel */}
        {!isCandidate &&
          negotiation?.status !== "matched" &&
          negotiation?.status !== "rejected" && (
            <div className="mt-6 rounded-2xl border border-card-border bg-white p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                  ⚡ Recruiter Decision Panel
                </h3>
                <p className="text-xs text-muted mt-1">
                  Take definitive actions on this candidate. Hiring updates the
                  job status to &quot;filled&quot; and the candidate application
                  status to &quot;accepted&quot;. Rejecting updates the
                  application status to &quot;rejected&quot;.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    if (
                      confirm(
                        "Select & Hire Candidate?\n\nThis will mark the negotiation as matched/hired, set the associated job to filled, and accept the application.",
                      )
                    ) {
                      const res = await updateNegotiationStatus(
                        id as string,
                        "matched",
                      );
                      if (res.status === "updated") {
                        setNegotiation((prev: any) => ({
                          ...prev,
                          status: "matched",
                        }));
                      }
                    }
                  }}
                  className="rounded-lg bg-green-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-green-700 transition-colors shadow-sm"
                >
                  🎉 Select & Hire Candidate
                </button>
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(true)}
                  className="rounded-lg bg-red-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors shadow-sm animate-in fade-in"
                >
                  ❌ Reject Candidate
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (confirm("Mark Process as Completed?")) {
                      const res = await updateNegotiationStatus(
                        id as string,
                        "completed",
                      );
                      if (res.status === "updated") {
                        setNegotiation((prev: any) => ({
                          ...prev,
                          status: "completed",
                        }));
                      }
                    }
                  }}
                  className="rounded-lg bg-white border border-card-border px-5 py-2.5 text-xs font-semibold text-muted hover:text-foreground hover:bg-subtle/50 transition-all shadow-sm"
                >
                  🏁 Mark Process Completed
                </button>
              </div>
            </div>
          )}
      </div>

      {/* Reject Modal */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 text-left">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-sm tracking-tight flex items-center gap-2">
                ❌ Reject Candidate Feedback
              </h3>
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Rejection Category</label>
                <select
                  value={rejectCategory}
                  onChange={(e) => setRejectCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 bg-white focus:outline-none focus:border-slate-350"
                >
                  <option value="salary_mismatch">Salary expectation mismatch</option>
                  <option value="skill_gap_verified">Skill gap (Verified)</option>
                  <option value="skill_gap_unverified">Skill gap (Unverified)</option>
                  <option value="availability_mismatch">Availability mismatch (Notice period)</option>
                  <option value="culture_mismatch">Culture mismatch</option>
                  <option value="dealbreaker_triggered">Dealbreaker triggered</option>
                  <option value="experience_level_mismatch">Experience level mismatch</option>
                </select>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Constructive Feedback (Rejection Reason)</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Salary expectation mismatch. Your target is NPR 120,000 but market range is NPR 85,000-100,000."
                  rows={4}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-slate-350 placeholder-slate-400"
                />
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setSending(true);
                  try {
                    const res = await updateNegotiationStatus(
                      id as string,
                      "rejected",
                      rejectReason || "Manually rejected by recruiter",
                      [rejectCategory]
                    );
                    if (res.status === "updated") {
                      setNegotiation((prev: any) => ({
                        ...prev,
                        status: "rejected",
                      }));
                      setIsRejectModalOpen(false);
                    }
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setSending(false);
                  }
                }}
                disabled={sending}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-all cursor-pointer shadow-sm disabled:opacity-50"
              >
                {sending ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
