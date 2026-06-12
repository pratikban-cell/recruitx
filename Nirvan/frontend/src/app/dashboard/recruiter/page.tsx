"use client";

import { createClient } from "@/lib/supabase-client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { mockRecruiterNegotiations } from "@/lib/mock-data";
import StatCard from "@/components/dashboard/StatCard";
import { InteractiveBarChart } from "@/components/ui/Charts";

type Negotiation = {
  id: string;
  status: string;
  fit_score: number | null;
  created_at: string;
  candidate: { title: string; skills: string[]; salary_min: number }[] | null;
};

const statusColor: Record<string, string> = {
  active: "text-blue-600 bg-blue-50",
  matched: "text-green-600 bg-green-50",
  scheduled: "text-purple-600 bg-purple-50",
  completed: "text-gray-600 bg-gray-50",
  rejected: "text-red-600 bg-red-50",
};

const statusLabel: Record<string, string> = {
  active: "Negotiating",
  matched: "Match Found",
  scheduled: "Interview Set",
  completed: "Done",
  rejected: "Passed",
};

// Initial fallback activity feed
const initialActivityFeed = [
  { action: "Candidate matched", detail: "Senior Frontend Engineer — 92% fit with your requirements", time: "2 min ago" },
  { action: "Salary negotiation", detail: "Band agreed: $95k–$110k with equity discussion pending", time: "15 min ago" },
  { action: "Skills verified", detail: "Python, FastAPI — 3yrs experience confirmed on GitHub", time: "1 hr ago" },
  { action: "New candidate in pipeline", detail: "ML Engineer — PyTorch, AWS, 87% fit score", time: "3 hr ago" },
  { action: "Interview scheduled", detail: "Backend Engineer — Thursday 2pm with hiring manager", time: "5 hr ago" },
];

const roles = [
  { title: "Senior Backend Engineer", company: "Stripe", candidates: 12, active: 4 },
  { title: "Platform Engineer", company: "Vercel", candidates: 8, active: 3 },
  { title: "Full Stack Engineer", company: "Linear", candidates: 15, active: 6 },
];

const weeklyData = [
  { day: "Mon", matches: 3, interviews: 1 },
  { day: "Tue", matches: 5, interviews: 2 },
  { day: "Wed", matches: 2, interviews: 1 },
  { day: "Thu", matches: 7, interviews: 3 },
  { day: "Fri", matches: 4, interviews: 2 },
  { day: "Sat", matches: 1, interviews: 0 },
  { day: "Sun", matches: 0, interviews: 0 },
];

export default function RecruiterOverview() {
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<any[]>(initialActivityFeed);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const handleActivity = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.message) {
        setActivities(prev => [
          {
            action: customEvent.detail.type === "success" ? "🤝 Agreement Reached" : "🤖 Agent Update",
            detail: customEvent.detail.message,
            time: "Just now",
            isNew: true
          },
          ...prev.slice(0, 4)
        ]);
      }
    };
    
    window.addEventListener("nirvan-toast", handleActivity);
    
    // Simulating background match events to make the dashboard feel actively negotiated
    const simulations = [
      { action: "🔍 Scanning Talent Pool", detail: "Found 12 candidate profiles matching 'FastAPI, AWS'", time: "Just now" },
      { action: "🤖 Agent Negotiation", detail: "Luffy's Agent negotiating mentoring allowance with Leapfrog", time: "Just now" },
      { action: "📊 Weight Assessment", detail: "Calculated fit score of 81% for Chopper on BioMed", time: "Just now" },
      { action: "⚡ Matching scans completed", detail: "Vercel Platform role: 8 candidate matches generated successfully", time: "Just now" }
    ];
    
    let index = 0;
    const interval = setInterval(() => {
      setActivities(prev => [
        { ...simulations[index], isNew: true },
        ...prev.slice(0, 4)
      ]);
      index = (index + 1) % simulations.length;
    }, 15000);

    return () => {
      window.removeEventListener("nirvan-toast", handleActivity);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth"); return; }

      const { data: recruiter } = await supabase
        .from("recruiters")
        .select("id")
        .eq("profile_id", user.id)
        .single();

      if (recruiter) {
        const { data: negoData } = await supabase
          .from("negotiations")
          .select("id, status, fit_score, created_at, candidate:candidates(title, skills, salary_min)")
          .eq("recruiter_id", recruiter.id)
          .order("created_at", { ascending: false });
        if (negoData && negoData.length > 0) setNegotiations(negoData);
        else setNegotiations(mockRecruiterNegotiations);
      } else {
        setNegotiations(mockRecruiterNegotiations);
      }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
    </div>
  );

  const activeCount = negotiations.filter((n) => n.status === "active").length;
  const avgFit = negotiations.length
    ? Math.round(negotiations.reduce((a, n) => a + (n.fit_score || 0), 0) / negotiations.length)
    : 0;
  const bookedCount = negotiations.filter((n) => n.status === "scheduled").length;
  const maxY = Math.max(...weeklyData.map((d) => Math.max(d.matches, d.interviews)), 1);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-4 gap-5">
        <StatCard label="Active Negotiations" value={String(activeCount)} change="+3 this week" positive icon="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
        <StatCard label="Avg Candidate Fit" value={`${avgFit}%`} change={avgFit >= 70 ? "Strong pipeline" : "Refine criteria"} positive={avgFit >= 60} icon="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
        <StatCard label="Interviews Set" value={String(bookedCount)} change="+2 this week" positive icon="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        <StatCard label="Market Scan" value="Active" change="200+ profiles scanned" positive icon="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 rounded-xl border border-card-border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-card-border px-6 py-4">
            <h2 className="text-sm font-semibold text-foreground">Candidate Pipeline</h2>
            <Link href="/dashboard/recruiter/candidates" className="text-xs font-medium text-accent hover:text-accent/80">View all &rarr;</Link>
          </div>
          <div className="divide-y divide-card-border/60">
            {negotiations.map((n) => {
              const candidate = Array.isArray(n.candidate) ? n.candidate[0] : n.candidate;
              return (
                <Link key={n.id} href={`/negotiations/${n.id}`} className="flex items-center justify-between px-6 py-4 hover:bg-subtle/50 transition-colors">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 text-sm font-bold text-accent shrink-0">{candidate?.title?.[0] || "?"}</div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{candidate?.title || "Candidate"}</p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {candidate?.skills?.slice(0, 3).map((s: string) => (
                          <span key={s} className="rounded-full bg-accent/5 px-2 py-0.5 text-[10px] font-medium text-accent">{s}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    {n.fit_score && (
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-14 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent/60" style={{ width: `${n.fit_score}%` }} />
                        </div>
                        <span className="text-sm font-semibold text-foreground w-7 text-right">{n.fit_score}%</span>
                      </div>
                    )}
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${statusColor[n.status] || "bg-gray-50 text-gray-600"}`}>{statusLabel[n.status] || n.status}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-card-border bg-white shadow-sm">
          <div className="border-b border-card-border px-6 py-4">
            <h2 className="text-sm font-semibold text-foreground">Agent Activity</h2>
          </div>
          <div className="divide-y divide-card-border/60 max-h-[350px] overflow-y-auto">
            {activities.map((a, i) => (
              <div key={i} className={`px-5 py-3 transition-colors duration-500 ${a.isNew ? "bg-accent/5" : ""}`}>
                <div className="flex items-start gap-3">
                  <div className="relative mt-1.5 flex h-2 w-2 shrink-0 items-center justify-center">
                    {a.isNew && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                    )}
                    <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${a.isNew ? "bg-accent" : "bg-slate-300"}`}></span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                      {a.action}
                      {a.isNew && (
                        <span className="rounded bg-accent/10 px-1 py-0.2 text-[8px] font-bold uppercase tracking-wider text-accent animate-pulse-subtle">
                          New
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{a.detail}</p>
                    <p className="text-[9px] text-muted/50 mt-1 font-medium">{a.time}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 rounded-xl border border-card-border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-card-border px-6 py-4">
            <h2 className="text-sm font-semibold text-foreground">Weekly Activity</h2>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 font-medium text-slate-500">
                <span className="h-2 w-2 rounded-full bg-accent" />
                Matches
              </span>
              <span className="flex items-center gap-1.5 font-medium text-slate-500">
                <span className="h-2 w-2 rounded-full bg-indigo-300" />
                Interviews
              </span>
            </div>
          </div>
          <div className="p-6">
            <InteractiveBarChart
              data={weeklyData.map((d) => ({
                label: d.day,
                value: d.matches,
                secondary: d.interviews,
              }))}
              primaryColor="#266df0"
              secondaryColor="#a5b4fc"
              primaryLabel="Matches"
              secondaryLabel="Interviews"
              height={180}
            />
          </div>
        </div>

        <div className="rounded-xl border border-card-border bg-white shadow-sm">
          <div className="border-b border-card-border px-6 py-4">
            <h2 className="text-sm font-semibold text-foreground">Open Roles</h2>
          </div>
          <div className="divide-y divide-card-border/60">
            {roles.map((r) => (
              <div key={r.title} className="px-5 py-4">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-medium text-foreground truncate">{r.title}</p>
                  <span className="text-xs text-muted shrink-0 ml-2">{r.company}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted">
                  <span>{r.candidates} candidates</span>
                  <span className="text-accent font-medium">{r.active} active</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
