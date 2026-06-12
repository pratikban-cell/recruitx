"use client";

import { createClient } from "@/lib/supabase-client";
import { candidateGetTask } from "@/lib/api";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { mockNegotiations, mockProfile as mockProfileData, mockJobs } from "@/lib/mock-data";
import StatCard from "@/components/dashboard/StatCard";
import JobCard from "@/components/jobs/JobCard";
import { InteractiveAreaChart } from "@/components/ui/Charts";
import { motion } from "framer-motion";

type Negotiation = {
  id: string;
  status: string;
  fit_score: number | null;
  created_at: string;
  recruiter: { company: string; position: string }[] | null;
};

const statusColor: Record<string, string> = {
  active: "text-blue-600 bg-blue-50",
  matched: "text-green-600 bg-green-50",
  scheduled: "text-purple-600 bg-purple-50",
  completed: "text-gray-600 bg-gray-50",
  rejected: "text-red-600 bg-red-50",
};

const statusLabel: Record<string, string> = {
  active: "Active",
  matched: "Match",
  scheduled: "Interview",
  completed: "Done",
  rejected: "Passed",
};

const activityFeed = [
  { action: "Fit score improved", detail: "Stripe negotiation — 92% match, salary band agreed", time: "2 min ago" },
  { action: "Skills verified", detail: "Python, TypeScript confirmed via GitHub API", time: "15 min ago" },
  { action: "Counter-offer received", detail: "Vercel adjusted band to $90k–$110k", time: "1 hr ago" },
  { action: "Interview scheduled", detail: "Linear — Thursday 2pm with hiring manager", time: "3 hr ago" },
  { action: "Profile updated", detail: "Added Kubernetes to verified skills", time: "5 hr ago" },
];

const verifiedSkills = [
  { name: "TypeScript", level: 95, verified: true },
  { name: "React", level: 92, verified: true },
  { name: "Python", level: 88, verified: true },
  { name: "PostgreSQL", level: 75, verified: true },
  { name: "Kubernetes", level: 60, verified: false },
];

export default function CandidateOverview() {
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth"); return; }

      const { data: candidate } = await supabase
        .from("candidates")
        .select("id")
        .eq("profile_id", user.id)
        .single();

      if (candidate) {
        const { data: negoData } = await supabase
          .from("negotiations")
          .select("id, status, fit_score, created_at, candidate_notes, recruiter:recruiters(company, position)")
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
                  recruiter: [{
                    ...recruiterObj,
                    company: job.company,
                    position: job.title
                  }]
                };
              }
            }
            return n;
          }));
          setNegotiations(enrichedNegoData);
        }
        else setNegotiations(mockNegotiations);
      } else {
        setNegotiations(mockNegotiations);
      }

      try {
        const task = await candidateGetTask("latest");
        if (task.result?.task) {
          const status = task.result.task.status;
          if (status.state === 3) {
            setNegotiations((prev) => prev.length ? prev : mockNegotiations);
          }
        }
      } catch {
        // backend not reachable, mock data is fine
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
  const scheduledCount = negotiations.filter((n) => n.status === "scheduled").length;
  const maxFit = Math.max(...negotiations.map((n) => n.fit_score || 0), 0);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-4 gap-5">
        <StatCard label="Active Negotiations" value={String(activeCount)} change="+2 this week" positive icon="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
        <StatCard label="Avg Fit Score" value={`${avgFit}%`} change={avgFit >= 70 ? "Strong matches" : "Improving"} positive={avgFit >= 60} icon="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
        <StatCard label="Interviews" value={String(scheduledCount)} change="+1 upcoming" positive icon="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        <StatCard label="Best Match" value={maxFit > 0 ? `${maxFit}%` : "—"} change="Top fit score" positive icon="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" delay={0.1} />
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 rounded-xl border border-card-border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-card-border px-6 py-4">
            <h2 className="text-sm font-semibold text-foreground">Negotiation Pipeline</h2>
            <Link href="/dashboard/candidate/negotiations" className="text-xs font-medium text-accent hover:text-accent/80">View all &rarr;</Link>
          </div>
          {negotiations.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm text-muted">No negotiations yet. Complete your profile to start matching.</p>
              <Link href="/dashboard/candidate/settings" className="mt-3 inline-flex items-center rounded-lg bg-foreground px-5 py-2 text-sm font-semibold text-white hover:bg-foreground/90 transition-all shadow-sm">Complete profile</Link>
            </div>
          ) : (
            <div className="divide-y divide-card-border/60">
              {negotiations.map((n) => {
                const recruiter = Array.isArray(n.recruiter) ? n.recruiter[0] : n.recruiter;
                return (
                  <Link key={n.id} href={`/negotiations/${n.id}`} className="flex items-center justify-between px-6 py-4 hover:bg-subtle/50 transition-colors">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 text-sm font-bold text-accent shrink-0">{recruiter?.company?.[0] || "?"}</div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{recruiter?.company || "Unknown"}</p>
                        <p className="text-xs text-muted truncate">{recruiter?.position || "Position"}</p>
                      </div>
                    </div>
                  <div className="flex items-center gap-4 shrink-0">
                    {n.fit_score && (
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent/60" style={{ width: `${n.fit_score}%` }} />
                        </div>
                        <span className="text-sm font-semibold text-foreground w-8 text-right">{n.fit_score}%</span>
                      </div>
                    )}
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${statusColor[n.status] || "bg-gray-50 text-gray-600"}`}>{statusLabel[n.status] || n.status}</span>
                  </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-card-border bg-white shadow-sm">
          <div className="border-b border-card-border px-6 py-4">
            <h2 className="text-sm font-semibold text-foreground">Agent Activity</h2>
          </div>
          <div className="divide-y divide-card-border/60">
            {activityFeed.map((a, i) => (
              <div key={i} className="px-5 py-3">
                <div className="flex items-start gap-3">
                  <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{a.action}</p>
                    <p className="text-xs text-muted mt-0.5 leading-relaxed">{a.detail}</p>
                    <p className="text-[10px] text-muted/50 mt-1">{a.time}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 rounded-xl border border-card-border bg-white shadow-sm hover:shadow-card transition-all duration-300">
          <div className="border-b border-card-border px-6 py-4">
            <h2 className="text-sm font-semibold text-foreground">Verified Skills</h2>
          </div>
          <div className="p-6 space-y-4">
            {verifiedSkills.map((s, i) => (
              <div key={s.name} className="group">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700 transition-colors group-hover:text-accent">{s.name}</span>
                    {s.verified && (
                      <svg className="h-3.5 w-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <span className="text-xs font-bold text-slate-800">{s.level}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden relative">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${s.level}%` }}
                    transition={{ duration: 0.8, delay: i * 0.05, ease: "easeOut" }}
                    className={`h-full rounded-full ${s.verified ? "bg-accent" : "bg-accent/40"}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-card-border bg-white shadow-sm hover:shadow-card transition-all duration-300">
          <div className="border-b border-card-border px-6 py-4">
            <h2 className="text-sm font-semibold text-foreground">Quick Stats</h2>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <p className="text-xs font-semibold text-muted mb-2 tracking-wide uppercase">Fit Score Distribution</p>
              <div className="pt-2">
                <InteractiveAreaChart
                  data={negotiations.map((n) => {
                    const recruiter = Array.isArray(n.recruiter) ? n.recruiter[0] : n.recruiter;
                    return {
                      label: recruiter?.company || "Unknown",
                      value: n.fit_score || 0,
                    };
                  }).reverse()}
                  height={130}
                  lineColor="#266df0"
                  valueSuffix="%"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-card-border/60">
              <div className="rounded-lg bg-subtle p-3 text-center">
                <p className="text-lg font-bold text-foreground">{negotiations.length}</p>
                <p className="text-[10px] font-semibold text-muted uppercase tracking-wider">Total matches</p>
              </div>
              <div className="rounded-lg bg-subtle p-3 text-center">
                <p className="text-lg font-bold text-foreground">{negotiations.filter((n) => n.status !== "rejected").length}</p>
                <p className="text-[10px] font-semibold text-muted uppercase tracking-wider">Active / Done</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Agent-Matched Jobs</h2>
            <p className="text-xs text-muted mt-0.5">Personalized by your agent. Ranked by genuine fit, not recency.</p>
          </div>
          <Link href="/jobs" className="text-xs font-medium text-accent hover:text-accent/80">Browse all &rarr;</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockJobs.slice(0, 6).map((job) => (
            <JobCard key={job.id} job={job} showFit />
          ))}
        </div>
      </div>
    </div>
  );
}
