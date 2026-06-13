"use client";

import { createClient } from "@/lib/supabase-client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { InteractiveBarChart, InteractiveRadialChart } from "@/components/ui/Charts";
import { motion } from "framer-motion";

type Negotiation = {
  id: string;
  status: string;
  fit_score: number | null;
  created_at: string;
  recruiter: { company: string } | { company: string }[] | null;
};

// Monthly data mapping initialized with baseline mock values
const baselineMonthly = {
  Jan: { matches: 2, interviews: 0 },
  Feb: { matches: 4, interviews: 1 },
  Mar: { matches: 3, interviews: 1 },
  Apr: { matches: 5, interviews: 2 },
  May: { matches: 8, interviews: 3 },
  Jun: { matches: 10, interviews: 4 },
};

export default function CandidateAnalytics() {
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/auth"); return; }
        
        const { data: candidate } = await supabase.from("candidates").select("id").eq("profile_id", user.id).single();
        if (candidate) {
          const { data: negoData } = await supabase
            .from("negotiations")
            .select("id, status, fit_score, created_at, recruiter:recruiters(company)")
            .eq("candidate_id", candidate.id)
            .order("created_at", { ascending: false });
          if (negoData && negoData.length > 0) {
            setNegotiations(negoData);
          }
        }
      } catch (err) {
        console.error("Failed to load analytics:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>;

  if (negotiations.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-card-border bg-white p-12 text-center max-w-xl mx-auto mt-8 shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
          <svg className="h-7 w-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v5.25c0 .621-.504 1.125-1.125 1.125h-2.25A1.125 1.125 0 013 18.375v-5.25zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125v-9.75zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v14.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-foreground">No Live Matches Yet</h3>
        <p className="mt-2 text-xs text-muted max-w-sm mx-auto leading-relaxed">
          Your analytics will populate once your agent matches and initiates negotiations with recruiters. Make sure you activate your agent in settings!
        </p>
        <div className="mt-6">
          <Link href="/dashboard/candidate/settings" className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white hover:bg-accent/90 transition-all shadow-sm">
            Activate Agent in Settings &rarr;
          </Link>
        </div>
      </div>
    );
  }

  // Dynamically compute monthly trends based on active data and baselines
  const monthlyDataMap = { ...baselineMonthly };
  negotiations.forEach((n) => {
    const date = new Date(n.created_at);
    const monthName = date.toLocaleString("en-US", { month: "short" });
    if (monthName in monthlyDataMap) {
      const key = monthName as keyof typeof monthlyDataMap;
      monthlyDataMap[key].matches++;
      if (n.status === "scheduled" || n.status === "completed") {
        monthlyDataMap[key].interviews++;
      }
    }
  });

  const dynamicMonthlyData = Object.entries(monthlyDataMap).map(([month, data]) => ({
    label: month,
    value: data.matches,
    secondary: data.interviews,
  }));

  const avgFit = negotiations.length ? Math.round(negotiations.reduce((a, n) => a + (n.fit_score || 0), 0) / negotiations.length) : 0;
  const successRate = negotiations.length ? Math.round((negotiations.filter((n) => n.status !== "rejected").length / negotiations.length) * 100) : 0;

  // Status Distribution for donut chart
  const statusColors: Record<string, string> = {
    active: "#3b82f6",     // Blue
    matched: "#10b981",    // Green
    scheduled: "#8b5cf6",  // Purple
    completed: "#64748b",  // Slate
    rejected: "#ef4444",   // Red
  };

  const statusLabels: Record<string, string> = {
    active: "Negotiating",
    matched: "Match Found",
    scheduled: "Interview Set",
    completed: "Done",
    rejected: "Passed",
  };

  const statusDistributionData = ["active", "matched", "scheduled", "completed", "rejected"].map((status) => {
    const count = negotiations.filter((n) => n.status === status).length;
    return {
      label: statusLabels[status] || status,
      value: count,
      color: statusColors[status] || "#cbd5e1",
    };
  });

  return (
    <div className="space-y-6">
      {/* Top Cards with framer-motion stagger */}
      <div className="grid grid-cols-4 gap-5">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-xl border border-card-border bg-white p-5 shadow-sm hover:border-accent/20 transition-all duration-300"
        >
          <p className="text-xs font-semibold text-muted tracking-wider uppercase mb-1">Total Matches</p>
          <p className="text-3xl font-extrabold text-foreground">{negotiations.length}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="rounded-xl border border-card-border bg-white p-5 shadow-sm hover:border-accent/20 transition-all duration-300"
        >
          <p className="text-xs font-semibold text-muted tracking-wider uppercase mb-1">Avg Fit Score</p>
          <p className="text-3xl font-extrabold text-foreground">{avgFit}%</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-xl border border-card-border bg-white p-5 shadow-sm hover:border-accent/20 transition-all duration-300"
        >
          <p className="text-xs font-semibold text-muted tracking-wider uppercase mb-1">Success Rate</p>
          <p className="text-3xl font-extrabold text-foreground">{successRate}%</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="rounded-xl border border-card-border bg-white p-5 shadow-sm hover:border-accent/20 transition-all duration-300"
        >
          <p className="text-xs font-semibold text-muted tracking-wider uppercase mb-1">Interviews</p>
          <p className="text-3xl font-extrabold text-foreground">{negotiations.filter((n) => n.status === "scheduled").length}</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Monthly Activity interactive bar chart */}
        <div className="rounded-xl border border-card-border bg-white shadow-sm hover:shadow-card transition-all duration-300">
          <div className="flex items-center justify-between border-b border-card-border px-6 py-4">
            <h2 className="text-sm font-semibold text-foreground">Monthly Activity</h2>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-accent" />Matches</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-indigo-300" />Interviews</span>
            </div>
          </div>
          <div className="p-6">
            <InteractiveBarChart
              data={dynamicMonthlyData}
              primaryColor="#266df0"
              secondaryColor="#a5b4fc"
              primaryLabel="Matches"
              secondaryLabel="Interviews"
              height={200}
            />
          </div>
        </div>

        {/* Fit Score Breakdown with animating progress bars */}
        <div className="rounded-xl border border-card-border bg-white shadow-sm hover:shadow-card transition-all duration-300">
          <div className="border-b border-card-border px-6 py-4">
            <h2 className="text-sm font-semibold text-foreground">Fit Score Breakdown</h2>
          </div>
          <div className="p-6 space-y-4 max-h-[260px] overflow-y-auto">
            {negotiations.map((n, i) => {
              const recruiterObj = Array.isArray(n.recruiter) ? n.recruiter[0] : n.recruiter;
              const companyName = recruiterObj?.company || "Unknown";
              return (
                <div key={n.id} className="group">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-slate-700 transition-colors group-hover:text-accent">
                      {companyName}
                    </span>
                    <span className="text-xs font-bold text-slate-800">{n.fit_score || 0}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${n.fit_score || 0}%` }}
                      transition={{ duration: 0.8, delay: i * 0.05, ease: "easeOut" }}
                      className={`h-full rounded-full ${
                        (n.fit_score || 0) >= 70
                          ? "bg-emerald-500"
                          : (n.fit_score || 0) >= 50
                          ? "bg-amber-500"
                          : "bg-rose-500"
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Donut Status Distribution */}
      <div className="rounded-xl border border-card-border bg-white shadow-sm p-6 hover:shadow-card transition-all duration-300">
        <h2 className="text-sm font-semibold text-foreground mb-4">Status Distribution</h2>
        <div className="border-t border-slate-100/60 pt-4">
          <InteractiveRadialChart
            data={statusDistributionData}
            centerLabel="Total Matches"
            centerValue={String(negotiations.length)}
          />
        </div>
      </div>
    </div>
  );
}
