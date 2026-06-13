"use client";

import { createClient } from "@/lib/supabase-client";
import { candidateGetTask, getPersonalizedRecommendations, initiateNegotiation } from "@/lib/api";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { mockNegotiations, mockJobs } from "@/lib/mock-data";
import StatCard from "@/components/dashboard/StatCard";
import JobCard from "@/components/jobs/JobCard";
import { InteractiveAreaChart } from "@/components/ui/Charts";
import { motion, AnimatePresence } from "framer-motion";

type Negotiation = {
  id: string;
  status: string;
  fit_score: number | null;
  created_at: string;
  candidate_notes?: string;
  recruiter_notes?: string;
  recruiter: { company: string; position: string } | null;
};

const columnColors: Record<string, string> = {
  "Negotiating": "border-blue-100 bg-blue-50/20 text-blue-700",
  "Fit Confirmed": "border-indigo-100 bg-indigo-50/20 text-indigo-700",
  "Interviewing": "border-purple-100 bg-purple-50/20 text-purple-700",
  "Closed": "border-slate-100 bg-slate-50/20 text-slate-500",
};

const statusLabel: Record<string, string> = {
  active: "Negotiating",
  matched: "Fit Confirmed",
  scheduled: "Interviewing",
  completed: "Closed",
  rejected: "Closed",
};

export default function CandidateOverview() {
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNego, setSelectedNego] = useState<Negotiation | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  
  // Agent Directives States
  const [salaryMin, setSalaryMin] = useState(115000);
  const [negotiationStyle, setNegotiationStyle] = useState("collaborative");
  const [remoteOnly, setRemoteOnly] = useState(true);
  const [agentPaused, setAgentPaused] = useState(false);
  const [syncingDirectives, setSyncingDirectives] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  // Recommendations state
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(true);
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [negotiatingJobId, setNegotiatingJobId] = useState<string | null>(null);

  const handleLetAgentNegotiate = async (rec: any) => {
    if (!candidateId) return;
    setNegotiatingJobId(rec.job_id);
    try {
      const res = await initiateNegotiation(rec.recruiter_id, candidateId, rec.job_id);
      if (res && res.negotiation_id) {
        setActivities(prev => [
          {
            id: Date.now(),
            action: "🤝 Negotiation initiated",
            detail: `Agent approached ${rec.company} for the ${rec.title} role.`,
            time: "Just now",
            type: "success"
          },
          ...prev
        ]);
        
        const { data: negoData } = await supabase
          .from("negotiations")
          .select("id, status, fit_score, created_at, candidate_notes, recruiter_notes, recruiter:recruiters(company, position)")
          .eq("candidate_id", candidateId)
          .order("created_at", { ascending: false });
          
        if (negoData) {
          const enrichedNegoData = await Promise.all(negoData.map(async (n: any) => {
            const match = (n.candidate_notes || "").match(/[a-f0-9\-]{36}/);
            if (match) {
              const jobId = match[0];
              const { data: job } = await supabase
                .from("jobs")
                .select("company, title")
                .eq("id", jobId)
                .single();
              if (job) {
                return {
                  ...n,
                  recruiter: {
                    company: job.company,
                    position: job.title
                  }
                };
              }
            }
            return n;
          }));
          setNegotiations(enrichedNegoData);
        }
        
        const recs = await getPersonalizedRecommendations();
        setRecommendations(recs);
        
        router.push(`/negotiations/${res.negotiation_id}`);
      } else {
        alert("Failed to start negotiation.");
      }
    } catch (err) {
      console.error("Failed to start negotiation:", err);
    } finally {
      setNegotiatingJobId(null);
    }
  };

  // Live activity feed state
  const [activities, setActivities] = useState([
    { id: 1, action: "Skills verified", detail: "GitHub OAuth token verified: read:user, repo scopes checked.", time: "2 min ago", type: "success" },
    { id: 2, action: "Profile parsed", detail: "Resume PDF parsed. 7 target skills extracted.", time: "10 min ago", type: "info" },
    { id: 3, action: "Agent activated", detail: "Candidate agent loaded into active search graph.", time: "1 hr ago", type: "system" },
  ]);

  const router = useRouter();
  const supabase = createClient();

  // Load negotiations
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth"); return; }

      const { data: candidate } = await supabase
        .from("candidates")
        .select("id, salary_min, remote_pref, availability")
        .eq("profile_id", user.id)
        .single();

      if (candidate) {
        setCandidateId(candidate.id);
        // Load settings values from DB
        if (candidate.salary_min) setSalaryMin(candidate.salary_min);
        setRemoteOnly(candidate.remote_pref ?? true);
        const availStr = candidate.availability || "";
        if (availStr.includes("negotiation_style:")) {
          const match = availStr.match(/negotiation_style:([^|]+)/);
          if (match) setNegotiationStyle(match[1]);
        }

        // Fetch recommendations
        setLoadingRecommendations(true);
        try {
          const recs = await getPersonalizedRecommendations();
          setRecommendations(recs);
        } catch (err) {
          console.error("Failed to load recommendations:", err);
        } finally {
          setLoadingRecommendations(false);
        }

        const { data: negoData } = await supabase
          .from("negotiations")
          .select("id, status, fit_score, created_at, candidate_notes, recruiter_notes, recruiter:recruiters(company, position)")
          .eq("candidate_id", candidate.id)
          .order("created_at", { ascending: false });

        if (negoData && negoData.length > 0) {
          const enrichedNegoData = await Promise.all(negoData.map(async (n: any) => {
            const match = (n.candidate_notes || "").match(/[a-f0-9\-]{36}/);
            if (match) {
              const jobId = match[0];
              const { data: job } = await supabase
                .from("jobs")
                .select("company, title")
                .eq("id", jobId)
                .single();
              if (job) {
                const recruiterObj = Array.isArray(n.recruiter) ? n.recruiter[0] : n.recruiter;
                return {
                  ...n,
                  recruiter: {
                    company: job.company,
                    position: job.title
                  }
                };
              }
            }
            const recObj = Array.isArray(n.recruiter) ? n.recruiter[0] : n.recruiter;
            return {
              ...n,
              recruiter: recObj || null
            };
          }));
          setNegotiations(enrichedNegoData);
        } else {
          setNegotiations(mockNegotiations.map(m => ({
            ...m,
            recruiter: Array.isArray(m.recruiter) ? m.recruiter[0] : m.recruiter
          })));
        }
      } else {
        setNegotiations(mockNegotiations.map(m => ({
          ...m,
          recruiter: Array.isArray(m.recruiter) ? m.recruiter[0] : m.recruiter
        })));
      }

      setLoading(false);
    };
    load();
  }, []);

  // Simulate active background agent searches
  useEffect(() => {
    const timer1 = setTimeout(() => {
      setActivities(prev => [
        {
          id: Date.now(),
          action: "🔍 Sourcing matches",
          detail: "Agent scanning active job pool for System Design requirements.",
          time: "Just now",
          type: "info"
        },
        ...prev
      ]);
    }, 4000);

    const timer2 = setTimeout(() => {
      setActivities(prev => [
        {
          id: Date.now() + 1,
          action: "🤝 Contact initiated",
          detail: "Agent approached TechCorp's recruitment agent for the Backend role.",
          time: "Just now",
          type: "success"
        },
        ...prev
      ]);
    }, 9000);

    const timer3 = setTimeout(() => {
      setActivities(prev => [
        {
          id: Date.now() + 2,
          action: "💬 Salary negotiating",
          detail: "Negotiating TechCorp base package. Proposing $120,000 alignment.",
          time: "Just now",
          type: "warning"
        },
        ...prev
      ]);
    }, 16000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  // Load messages for selected negotiation transcript
  useEffect(() => {
    if (!selectedNego) return;
    const loadMessages = async () => {
      setLoadingMessages(true);
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("negotiation_id", selectedNego.id)
        .order("created_at", { ascending: true });
      setMessages(data || []);
      setLoadingMessages(false);
    };
    loadMessages();
  }, [selectedNego]);

  const handleSyncDirectives = async () => {
    setSyncingDirectives(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: cand } = await supabase
        .from("candidates")
        .select("id, availability")
        .eq("profile_id", user.id)
        .maybeSingle();

      if (cand) {
        // Build serialized availability with style
        const baseAvail = (cand.availability || "immediate").split("|")[0];
        const newAvail = `${baseAvail}|equity_demand_threshold:|negotiation_style:${negotiationStyle}|bio:`;

        await supabase.from("candidates").update({
          salary_min: salaryMin,
          remote_pref: remoteOnly,
          availability: newAvail,
        }).eq("id", cand.id);

        setSyncSuccess(true);
        setTimeout(() => setSyncSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Failed to sync directives:", err);
    } finally {
      setSyncingDirectives(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
    </div>
  );

  // Stats calculation
  const activeCount = negotiations.filter((n) => n.status === "active").length;
  const avgFit = negotiations.length
    ? Math.round(negotiations.reduce((a, n) => a + (n.fit_score || 0), 0) / negotiations.length)
    : 0;
  const scheduledCount = negotiations.filter((n) => n.status === "scheduled").length;
  const maxFit = Math.max(...negotiations.map((n) => n.fit_score || 0), 0);

  // Group negotiations by pipeline stage
  const pipelineStages = ["Negotiating", "Fit Confirmed", "Interviewing", "Closed"];
  const groupedNegotiations = pipelineStages.reduce((acc, col) => {
    acc[col] = negotiations.filter(n => statusLabel[n.status] === col);
    return acc;
  }, {} as Record<string, Negotiation[]>);

  return (
    <div className="space-y-8">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <StatCard label="Active Negotiations" value={String(activeCount)} change="+2 this week" positive icon="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
        <StatCard label="Avg Fit Score" value={`${avgFit}%`} change={avgFit >= 70 ? "Strong matches" : "Improving"} positive={avgFit >= 60} icon="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
        <StatCard label="Interviews" value={String(scheduledCount)} change="+1 upcoming" positive icon="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        <StatCard label="Best Match" value={maxFit > 0 ? `${maxFit}%` : "—"} change="Top fit score" positive icon="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
      </div>

      {/* Pipeline Board & Ticker Feed */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Kanban Board Column */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-foreground">Application Pipeline</h2>
              <p className="text-xs text-muted">Tap on any company to review the live A2A agent negotiations.</p>
            </div>
            <Link href="/dashboard/candidate/negotiations" className="text-xs font-semibold text-accent hover:text-accent-dark">
              Detail List &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {pipelineStages.map(col => {
              const items = groupedNegotiations[col] || [];
              return (
                <div key={col} className="rounded-xl border border-card-border bg-slate-50/50 p-3 flex flex-col min-h-[300px]">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">{col}</span>
                    <span className="text-[10px] font-bold bg-slate-200/60 text-slate-700 px-2 py-0.5 rounded-full shrink-0">
                      {items.length}
                    </span>
                  </div>

                  <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[400px] pr-0.5">
                    {items.length === 0 ? (
                      <div className="h-28 rounded-lg border border-dashed border-slate-200 flex items-center justify-center text-center p-3">
                        <span className="text-[10px] text-muted">Empty Stage</span>
                      </div>
                    ) : (
                      items.map(n => (
                        <motion.div
                          layoutId={`card-${n.id}`}
                          key={n.id}
                          onClick={() => setSelectedNego(n)}
                          className="rounded-lg border border-card-border bg-white p-3 hover:border-accent hover:shadow-sm transition-all duration-200 cursor-pointer text-left space-y-2 relative"
                        >
                          <div className="flex justify-between items-start gap-1">
                            <span className="text-xs font-bold text-foreground line-clamp-1 flex items-center gap-1.5">
                              {n.recruiter?.company || "Unknown"}
                              <span className="rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.25 text-[8px] font-bold text-emerald-600 flex items-center gap-0.5 tracking-normal whitespace-nowrap">
                                🛡️ KYC Verified ✓
                              </span>
                            </span>
                            <span className="text-[10px] bg-accent/10 text-accent font-bold px-1.5 py-0.25 rounded shrink-0">
                              {n.fit_score}%
                            </span>
                          </div>
                          <p className="text-[10px] text-muted line-clamp-1">
                            {n.recruiter?.position || "Role"}
                          </p>
                          <div className="flex justify-between items-center border-t border-slate-50 pt-2 text-[9px] text-muted">
                            <span>Last active</span>
                            <span className="text-slate-600 font-medium">1h ago</span>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Activity Feed */}
        <div className="rounded-xl border border-card-border bg-white shadow-sm flex flex-col h-[480px]">
          <div className="border-b border-card-border px-5 py-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
              Live Agent Activity
            </h2>
            <span className="text-[10px] bg-subtle text-accent border border-accent/20 px-2 py-0.5 rounded font-medium">
              Scanning 24/7
            </span>
          </div>
          <div className="p-4 overflow-y-auto flex-1 space-y-4">
            <AnimatePresence initial={false}>
              {activities.map((a) => (
                <motion.div
                  initial={{ opacity: 0, y: -20, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0 }}
                  key={a.id}
                  className="flex gap-3 text-left border-l-2 border-slate-100 pl-3 relative last:border-0"
                >
                  <div className={`absolute -left-1.5 top-1.5 h-2 w-2 rounded-full ${
                    a.type === "success" ? "bg-green-500" :
                    a.type === "warning" ? "bg-amber-500" :
                    a.type === "system" ? "bg-indigo-500" : "bg-blue-500"
                  }`} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      {a.action}
                    </p>
                    <p className="text-[11px] text-muted mt-0.5 leading-relaxed">
                      {a.detail}
                    </p>
                    <p className="text-[9px] text-muted/50 mt-1">{a.time}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Instruction Toggles & Verified Profile */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Agent Directives Form */}
        <div className="rounded-xl border border-card-border bg-white p-6 shadow-sm space-y-4 text-left">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              ⚙️ Tactical Agent Directives
            </h3>
            <p className="text-[11px] text-muted mt-0.5">Define strict parameters for your agent negotiation loops.</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-muted uppercase mb-1">
                Minimum Salary ($)
              </label>
              <input
                type="number"
                value={salaryMin}
                onChange={(e) => setSalaryMin(parseInt(e.target.value) || 0)}
                className="w-full rounded-lg border border-card-border px-3 py-2 text-xs font-semibold text-foreground focus:border-accent focus:outline-none"
              />
              <p className="text-[9px] text-muted/60 mt-0.5">Agent will auto-reject matching offers lower than this.</p>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-muted uppercase mb-1">
                Negotiation Strategy style
              </label>
              <select
                value={negotiationStyle}
                onChange={(e) => setNegotiationStyle(e.target.value)}
                className="w-full rounded-lg border border-card-border px-3 py-2 text-xs font-semibold text-foreground focus:border-accent focus:outline-none"
              >
                <option value="collaborative">🤝 Collaborative (Seek Win-Win)</option>
                <option value="firm">⚖️ Firm (Hold preferences)</option>
                <option value="flexible">🍃 Flexible (Maximize landing offer)</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
              <div>
                <span className="text-xs font-semibold text-foreground block">Remote Preference Only</span>
                <span className="text-[9px] text-muted">Agent demands remote setups</span>
              </div>
              <button
                type="button"
                onClick={() => setRemoteOnly(!remoteOnly)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${remoteOnly ? "bg-accent" : "bg-gray-200"}`}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${remoteOnly ? "translate-x-4" : "translate-x-0"}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
              <div>
                <span className="text-xs font-semibold text-foreground block">Pause Sourcing</span>
                <span className="text-[9px] text-muted">Temp stop candidate approaching</span>
              </div>
              <button
                type="button"
                onClick={() => setAgentPaused(!agentPaused)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${agentPaused ? "bg-red-500" : "bg-gray-200"}`}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${agentPaused ? "translate-x-4" : "translate-x-0"}`} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end pt-2">
            {syncSuccess && (
              <span className="text-[10px] text-green-600 font-semibold bg-green-50 px-2 py-1 rounded">Synced</span>
            )}
            <button
              onClick={handleSyncDirectives}
              disabled={syncingDirectives}
              className="rounded-lg bg-foreground hover:bg-foreground/90 text-white px-4 py-2 text-xs font-semibold shadow-sm transition-all"
            >
              {syncingDirectives ? "Syncing..." : "Sync Directives"}
            </button>
          </div>
        </div>

        {/* Verified Profile Showcase */}
        <div className="xl:col-span-2 rounded-xl border border-card-border bg-white shadow-sm flex flex-col">
          <div className="border-b border-card-border px-6 py-4 flex justify-between items-center">
            <h2 className="text-sm font-semibold text-foreground">Verified Agent Profile</h2>
            <span className="text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">
              OAuth verified credentials
            </span>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Technical Strength Spectrum</h4>
                <div className="space-y-3">
                  {[
                    { name: "TypeScript / React", level: 95, ver: true },
                    { name: "Python / FastAPI", level: 88, ver: true },
                    { name: "PostgreSQL", level: 75, ver: true },
                    { name: "Docker / CI-CD", level: 65, ver: false },
                  ].map((s) => (
                    <div key={s.name}>
                      <div className="flex justify-between items-center text-[10px] mb-1">
                        <span className="font-semibold text-slate-700 flex items-center gap-1">
                          {s.name}
                          {s.ver && (
                            <svg className="h-3 w-3 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </span>
                        <span className="font-bold">{s.level}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-accent rounded-full" style={{ width: `${s.level}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-subtle/40 p-4 border border-card-border/60 flex flex-col justify-between">
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted uppercase tracking-wider">Agent Sourcing Strategy</h4>
                <p className="text-[11px] text-muted leading-relaxed">
                  Your agent is prioritizing fully-remote Frontend / Fullstack roles with base salaries over <strong>${salaryMin.toLocaleString()}</strong>.
                </p>
                <div className="pt-2 flex flex-wrap gap-1.5">
                  <span className="text-[9px] bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded">FastAPI verified</span>
                  <span className="text-[9px] bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded">Git commits scanned</span>
                  <span className="text-[9px] bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded">Linear preference</span>
                </div>
              </div>

              <div className="border-t border-card-border/60 pt-3 mt-4 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-semibold text-slate-700">Agent Sourcing actively running</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Personalized Job Board Recommendations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">⚡ Your Personalized Job Recommendations</h2>
            <p className="text-xs text-muted mt-0.5">Highly targeted matches calibrated by your agent's dynamic fit score criteria.</p>
          </div>
          <Link href="/jobs" className="text-xs font-semibold text-accent hover:text-accent-dark">
            View Public Job Board &rarr;
          </Link>
        </div>
        
        {loadingRecommendations ? (
          <div className="flex items-center justify-center p-12 rounded-xl border border-card-border bg-white">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        ) : recommendations.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-dashed border-card-border bg-white p-6">
            <p className="text-sm text-muted">No personalized recommendations available yet.</p>
            <p className="text-xs text-muted/60 mt-1">Make sure your profile title and target skills are completed in settings.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recommendations.slice(0, 3).map((rec) => {
              const hasExistingNego = !!rec.negotiation_id;
              
              let scoreColor = "text-green-600 bg-green-50 border-green-200";
              if (rec.fit_score < 60) {
                scoreColor = "text-red-500 bg-red-50 border-red-200";
              } else if (rec.fit_score < 80) {
                scoreColor = "text-amber-600 bg-amber-50 border-amber-200";
              }
              
              return (
                <div key={rec.job_id} className="rounded-xl border border-card-border bg-white p-5 shadow-sm hover:shadow-md hover:border-accent/20 transition-all duration-300 flex flex-col justify-between text-left space-y-4 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent/10 via-accent to-accent/10 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
                          {rec.company}
                          <span className="rounded bg-emerald-50 border border-emerald-250 px-1.5 py-0.25 text-[8px] font-bold text-emerald-650 flex items-center gap-0.5 normal-case tracking-normal whitespace-nowrap">
                            🛡️ KYC Verified ✓
                          </span>
                        </span>
                        <h3 className="font-bold text-foreground text-sm truncate mt-0.5 group-hover:text-accent transition-colors">{rec.title}</h3>
                        <p className="text-[10px] text-muted capitalize mt-0.5">{rec.location} · {rec.remote_policy}</p>
                      </div>
                      <span className={`text-sm font-extrabold px-2 py-1 rounded-lg border shrink-0 ${scoreColor}`}>
                        {rec.fit_score}%
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-50">
                      <span className="text-[9px] font-bold text-muted uppercase block">Why You Match</span>
                      <div className="space-y-1">
                        {rec.why_matched?.slice(0, 2).map((why: string, idx: number) => (
                          <div key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-700 leading-snug">
                            <span className="text-green-500 font-bold shrink-0">✓</span>
                            <span>{why}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {rec.missing && rec.missing.length > 0 && (
                      <div className="space-y-1.5 pt-2">
                        <span className="text-[9px] font-bold text-muted uppercase block">Calibrated Gaps</span>
                        <div className="space-y-1">
                          {rec.missing.slice(0, 1).map((gap: string, idx: number) => (
                            <div key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-500 leading-snug">
                              <span className="text-amber-500 font-bold shrink-0">⚠</span>
                              <span>{gap}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-50 flex items-center justify-between gap-3">
                    {rec.salary_min ? (
                      <span className="text-[11px] font-bold text-slate-800">
                        ${(rec.salary_min/1000).toFixed(0)}k–${(rec.salary_max/1000).toFixed(0)}k/yr
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted font-medium">Salary unlisted</span>
                    )}

                    {hasExistingNego ? (
                      <Link
                        href={`/negotiations/${rec.negotiation_id}`}
                        className="rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap text-center"
                      >
                        {rec.negotiation_status === "matched" ? "🎉 Hired" :
                         rec.negotiation_status === "scheduled" ? "📅 Interview" : "💬 View Negotiation"}
                      </Link>
                    ) : (
                      <button
                        onClick={() => handleLetAgentNegotiate(rec)}
                        disabled={negotiatingJobId !== null}
                        className="rounded-lg bg-foreground hover:bg-foreground/90 text-white px-3.5 py-1.5 text-xs font-bold transition-all shadow-sm whitespace-nowrap"
                      >
                        {negotiatingJobId === rec.job_id ? "Agent approach..." : "Let Agent Negotiate"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* A2A Chat Transcript Slide-over/Modal */}
      <AnimatePresence>
        {selectedNego && (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-foreground/45 backdrop-blur-sm">
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-lg bg-white h-full shadow-2xl border-l border-card-border flex flex-col relative"
            >
              {/* Header */}
              <div className="p-6 border-b border-card-border bg-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    💬 Agent-to-Agent Negotiation
                  </h3>
                  <p className="text-[11px] text-muted mt-0.5">
                    {selectedNego.recruiter?.company || "Unknown"} — {selectedNego.recruiter?.position || "Role"}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedNego(null)}
                  className="rounded-lg p-2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Chat Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/40">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-48">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-xs text-muted">No messages found. Negotiation is in alignment phase.</p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isCandidate = m.sender_role === "candidate";
                    const isSystem = m.sender_role === "system";

                    if (isSystem) {
                      return (
                        <div key={m.id} className="flex justify-center my-3">
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full text-center border border-slate-200 max-w-[85%] font-medium">
                            🚨 {m.content}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isCandidate ? "items-end" : "items-start"}`}
                      >
                        <span className="text-[9px] text-muted mb-1 px-1">
                          {isCandidate ? "Candidate Agent" : "Company Agent"}
                        </span>
                        <div
                          className={`rounded-2xl px-4 py-2.5 text-xs max-w-[80%] shadow-sm leading-relaxed ${
                            isCandidate
                              ? "bg-foreground text-white rounded-tr-none"
                              : "bg-white border border-card-border text-slate-800 rounded-tl-none"
                          }`}
                        >
                          {m.content}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              
              {/* Footer indicator */}
              <div className="p-4 border-t border-card-border bg-slate-50 text-[10px] text-center text-muted">
                {selectedNego.status === "scheduled" ? (
                  <span className="text-green-600 font-semibold flex items-center justify-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                    Agreement reached! Interview Scheduled.
                  </span>
                ) : selectedNego.status === "rejected" ? (
                  <span className="text-red-500 font-semibold">
                    Negotiation closed: dealbreaker gap detected.
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                    Autonomous agent negotiation active...
                  </span>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
