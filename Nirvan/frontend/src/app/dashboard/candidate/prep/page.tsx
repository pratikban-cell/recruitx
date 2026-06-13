"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-client";
import { getCoaching } from "@/lib/api";

type NegotiationOption = {
  id: string;
  company: string;
  status: string;
  updated_at: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export default function CandidatePrepRoom() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [negs, setNegs] = useState<NegotiationOption[]>([]);
  const [selectedNegId, setSelectedNegId] = useState<string>("");
  
  // Coaching content & chat states
  const [report, setReport] = useState<string>("");
  const [reportLoading, setReportLoading] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: cand } = await supabase
        .from("candidates")
        .select("id")
        .eq("profile_id", user.id)
        .single();

      if (cand) {
        // Fetch all active or scheduled negotiations
        const { data: list } = await supabase
          .from("negotiations")
          .select("id, status, updated_at, recruiter:recruiters(company)")
          .eq("candidate_id", cand.id)
          .order("updated_at", { ascending: false });

        if (list && list.length > 0) {
          const mapped = list.map((item: any) => ({
            id: item.id,
            company: item.recruiter?.company || "Unknown Company",
            status: item.status,
            updated_at: item.updated_at,
          }));
          setNegs(mapped);
          setSelectedNegId(mapped[0].id);
        }
      }
      setLoading(false);
    };
    load();
  }, []);

  // Fetch initial coach report when selected negotiation changes
  useEffect(() => {
    if (!selectedNegId) return;

    const fetchInitialReport = async () => {
      setReportLoading(true);
      setReport("");
      setChatMessages([]);
      try {
        const res = await getCoaching(selectedNegId);
        if (res && res.response) {
          setReport(res.response);
        } else {
          setReport("Failed to generate coach report. Please check if the negotiation has active messages.");
        }
      } catch (err) {
        console.error(err);
        setReport("An error occurred while communicating with the AI Coach.");
      }
      setReportLoading(false);
    };

    fetchInitialReport();
  }, [selectedNegId]);

  const handleSendMessage = async (customMsg?: string) => {
    const textToSend = customMsg || chatInput;
    if (!textToSend.trim() || !selectedNegId) return;

    if (!customMsg) setChatInput("");
    
    const newMsg: ChatMessage = { role: "user", content: textToSend };
    setChatMessages((prev) => [...prev, newMsg]);
    setChatLoading(true);

    try {
      const updatedHistory = [...chatMessages, newMsg];
      const res = await getCoaching(selectedNegId, textToSend, chatMessages);
      if (res && res.response) {
        setChatMessages((prev) => [...prev, { role: "assistant", content: res.response }]);
      } else {
        setChatMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I encountered an issue parsing that request." }]);
      }
    } catch (err) {
      console.error(err);
      setChatMessages((prev) => [...prev, { role: "assistant", content: "Error connecting to server." }]);
    }
    setChatLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Sidebar Controls */}
      <div className="lg:col-span-1 space-y-6">
        <div className="rounded-xl border border-card-border bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Select Target Deal</h2>
          <div>
            <label className="block text-xs font-medium text-muted mb-2">Negotiation Partner</label>
            {negs.length === 0 ? (
              <p className="text-xs text-muted">No negotiations available for coaching. Start or accept a deal matching scan to initialize negotiations.</p>
            ) : (
              <select
                value={selectedNegId}
                onChange={(e) => setSelectedNegId(e.target.value)}
                className="w-full rounded-lg border border-card-border bg-white px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              >
                {negs.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.company} ({n.status})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Quick prep templates */}
        {selectedNegId && (
          <div className="rounded-xl border border-card-border bg-white p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Quick Prompts</h3>
            <button
              onClick={() => handleSendMessage("What hard questions should I expect from the recruiter based on their requirements?")}
              className="w-full text-left rounded-lg border border-card-border/60 hover:border-accent/50 p-2.5 text-xs text-foreground hover:bg-accent/5 transition-all"
            >
              ❓ Predict Hard Questions
            </button>
            <button
              onClick={() => handleSendMessage("How can I justify my target salary floor in this conversation?")}
              className="w-full text-left rounded-lg border border-card-border/60 hover:border-accent/50 p-2.5 text-xs text-foreground hover:bg-accent/5 transition-all"
            >
              💰 Defend Salary Demands
            </button>
            <button
              onClick={() => handleSendMessage("Explain what parts of the deal recruiter agent didn't seem fully aligned with.")}
              className="w-full text-left rounded-lg border border-card-border/60 hover:border-accent/50 p-2.5 text-xs text-foreground hover:bg-accent/5 transition-all"
            >
              🔎 Identify Deal Friction
            </button>
          </div>
        )}
      </div>

      {/* Main Coach Workspace */}
      <div className="lg:col-span-2 space-y-6">
        {/* Report tab */}
        <div className="rounded-xl border border-card-border bg-white shadow-sm overflow-hidden flex flex-col min-h-[400px]">
          <div className="border-b border-card-border bg-subtle/40 px-5 py-3.5 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/10 text-[10px] text-accent font-bold">📋</span>
              Strategic Deal Prep Report
            </h3>
            {reportLoading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />}
          </div>
          <div className="p-6 flex-1 overflow-y-auto max-h-[500px]">
            {reportLoading ? (
              <div className="flex flex-col gap-2.5 py-6">
                <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse" />
                <div className="h-4 w-1/2 bg-gray-100 rounded animate-pulse" />
                <div className="h-4 w-5/6 bg-gray-100 rounded animate-pulse" />
              </div>
            ) : report ? (
              <div className="prose prose-sm text-xs text-foreground/80 space-y-4 whitespace-pre-wrap leading-relaxed">
                {report}
              </div>
            ) : (
              <div className="text-center py-12 text-muted text-xs">
                Select a deal negotiation on the left to review your AI coach report.
              </div>
            )}
          </div>
        </div>

        {/* Coach chat workspace */}
        {selectedNegId && (
          <div className="rounded-xl border border-card-border bg-white shadow-sm flex flex-col h-[400px] overflow-hidden">
            <div className="border-b border-card-border bg-subtle/40 px-5 py-3.5 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/10 text-[10px] text-accent font-bold">💬</span>
                Interactive Coach Chat
              </h3>
            </div>
            
            {/* Chat message listing */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
              {chatMessages.length === 0 ? (
                <div className="text-center text-xs text-muted py-12">
                  Ask Coach recruitx anything about the deal strategy or live interview tactics.
                </div>
              ) : (
                chatMessages.map((m, idx) => (
                  <div key={idx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-xl px-4 py-2.5 text-xs whitespace-pre-wrap leading-relaxed shadow-sm ${
                        m.role === "user"
                           ? "bg-accent text-white rounded-tr-none"
                           : "bg-subtle text-foreground border border-card-border rounded-tl-none"
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))
              )}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-subtle border border-card-border rounded-xl rounded-tl-none px-4 py-2.5 text-xs text-muted flex items-center gap-2 shadow-sm">
                    <div className="flex gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-muted animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-muted animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-muted animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    Coach recruitx is thinking...
                  </div>
                </div>
              )}
            </div>

            {/* Input Form */}
            <div className="border-t border-card-border p-3 bg-gray-50/50 flex gap-2">
              <input
                type="text"
                placeholder="Ask Coach recruitx..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                disabled={chatLoading}
                className="flex-1 rounded-lg border border-card-border bg-white px-3 py-2 text-xs text-foreground placeholder:text-muted/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={chatLoading || !chatInput.trim()}
                className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white hover:bg-accent/90 transition-all shadow-sm disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
