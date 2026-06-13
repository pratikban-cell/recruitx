"use client";

import { createClient } from "@/lib/supabase-client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getRejectionInsights } from "@/lib/api";

type Pattern = {
  reason: string;
  count: number;
  total: number;
  details: string;
  recommendation: string;
};

type SkillMapItem = {
  skill: string;
  status: string;
  strength: number;
  average_requirement_pct: number;
};

type NextStep = {
  priority: number;
  impact: string;
  action: string;
  how: string;
  rationale: string;
  time_estimate: string;
};

type InsightsReport = {
  summary: string;
  patterns: Pattern[];
  skills_map: SkillMapItem[];
  next_steps: NextStep[];
  insufficient_data?: boolean;
  message?: string;
};

export default function RejectionInsightsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [candidateId, setCandidateId] = useState<string>("");
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [report, setReport] = useState<InsightsReport | null>(null);
  const [fetchingReport, setFetchingReport] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState<string | null>(null);

  useEffect(() => {
    const loadCandidate = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth");
        return;
      }

      const { data: cand } = await supabase
        .from("candidates")
        .select("id")
        .eq("profile_id", user.id)
        .single();

      if (cand) {
        setCandidateId(cand.id);
      } else {
        setLoading(false);
      }
    };
    loadCandidate();
  }, []);

  useEffect(() => {
    if (!candidateId) return;

    const fetchReport = async () => {
      setFetchingReport(true);
      try {
        const res = await getRejectionInsights(candidateId, isDemoMode);
        if (res) {
          setReport(res);
          if (res.patterns && res.patterns.length > 0) {
            setSelectedPattern(res.patterns[0].reason);
          }
        }
      } catch (err) {
        console.error("Failed to fetch rejection insights:", err);
      } finally {
        setFetchingReport(false);
        setLoading(false);
      }
    };

    fetchReport();
  }, [candidateId, isDemoMode]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!candidateId) {
    return (
      <div className="text-center py-16 border border-dashed border-card-border rounded-xl bg-white p-8">
        <p className="text-sm text-muted">Please activate your candidate profile in settings first.</p>
      </div>
    );
  }

  // Get matching mock company lists for pattern analysis details
  const getMockCompaniesForPattern = (reason: string): string[] => {
    const reasonLower = reason.toLowerCase();
    if (reasonLower.includes("salary")) {
      return ["Stripe", "WebFlow", "ViteCorp"];
    }
    if (reasonLower.includes("kubernetes") || reasonLower.includes("skill")) {
      return ["TechCorp", "Logpoint"];
    }
    if (reasonLower.includes("availability") || reasonLower.includes("notice")) {
      return ["Logpoint"];
    }
    return ["Partner Platform"];
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto text-left">
      {/* Title Header with Demo Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-card-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            🛡️ Candidate Rejection Intelligence
            <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-600 border border-rose-100 animate-pulse-subtle">
              AI Connected
            </span>
          </h1>
          <p className="text-sm text-muted">
            Analyze historical rejections and get detailed, actionable recommendations to optimize your candidate profile.
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50 shadow-sm shrink-0">
          <button
            onClick={() => setIsDemoMode(true)}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              isDemoMode
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Demo Pitch Mode 🚀
          </button>
          <button
            onClick={() => setIsDemoMode(false)}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              !isDemoMode
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Live DB Mode 🔌
          </button>
        </div>
      </div>

      {fetchingReport ? (
        <div className="flex items-center justify-center py-20 border border-dashed border-card-border rounded-xl bg-white">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : report?.insufficient_data ? (
        <div className="text-center py-16 border border-dashed border-card-border rounded-xl bg-white p-8 space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xl">
            📊
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-foreground text-sm">Insufficient Data</h3>
            <p className="text-xs text-muted max-w-md mx-auto">
              {report.message || "We need at least 3 historical rejections on the platform to calibrate rejection patterns."}
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => setIsDemoMode(true)}
              className="inline-flex rounded-lg bg-accent px-4 py-2 text-xs font-bold text-white hover:bg-accent/90 transition-all shadow-sm cursor-pointer"
            >
              Toggle Demo Pitch Mode to view reports
            </button>
          </div>
        </div>
      ) : report ? (
        <div className="space-y-6">
          {/* PANEL 1: Summary Card */}
          <div className="rounded-xl border border-rose-100 bg-rose-50/20 p-5 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="absolute left-0 top-0 h-full w-1.5 bg-rose-500" />
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Your Last 30 Days Summary</span>
              <p className="text-sm font-bold text-slate-800">
                {report.summary}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-center bg-white border border-rose-100 rounded-xl px-4 py-2.5 shadow-sm">
                <span className="text-2xl font-extrabold text-rose-600 block leading-none">
                  {isDemoMode ? "78%" : `${Math.round(((report.patterns?.[0]?.total || 4) / 9) * 100)}%`}
                </span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Rejection Rate</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* PANEL 2: Pattern Breakdown */}
            <div className="bg-white border border-card-border rounded-xl p-5 shadow-sm space-y-4">
              <div>
                <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider">
                  ⚠️ Primary Rejection Blocker Patterns
                </h3>
                <p className="text-[11px] text-muted">Frequency analysis of blockers triggered across failed negotiations.</p>
              </div>

              <div className="space-y-3">
                {report.patterns.map((p) => {
                  const percentage = Math.round((p.count / p.total) * 100);
                  const isSelected = selectedPattern === p.reason;
                  return (
                    <div
                      key={p.reason}
                      onClick={() => setSelectedPattern(p.reason)}
                      className={`p-3 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? "border-rose-200 bg-rose-50/35"
                          : "border-slate-100 hover:border-slate-200 bg-slate-50/50"
                      }`}
                    >
                      <div className="flex justify-between items-center text-xs font-bold mb-1">
                        <span className="text-slate-700">{p.reason}</span>
                        <span className="text-rose-600">{p.count} of {p.total} ({percentage}%)</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mb-2">
                        <div
                          className="h-full bg-rose-500 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                        {p.details}
                      </p>
                      
                      {isSelected && (
                        <div className="mt-2.5 pt-2 border-t border-rose-100 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                          <div className="text-[10px] text-slate-600">
                            <span className="font-bold text-rose-500 block mb-0.5">Recommendation:</span>
                            {p.recommendation}
                          </div>
                          <div className="flex flex-wrap gap-1 items-center mt-1">
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Triggered at:</span>
                            {getMockCompaniesForPattern(p.reason).map((c) => (
                              <span key={c} className="bg-white border border-rose-100 px-1.5 py-0.5 rounded text-[9px] font-semibold text-rose-700">
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PANEL 3: Skill Weakness Map */}
            <div className="bg-white border border-card-border rounded-xl p-5 shadow-sm space-y-4">
              <div>
                <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider">
                  📊 Skill Strength & Target Market Gap Map
                </h3>
                <p className="text-[11px] text-muted">Comparison of verified, claimed, and missing skills vs target roles.</p>
              </div>

              <div className="space-y-3.5">
                {report.skills_map.map((item) => {
                  let barColor = "bg-emerald-500";
                  let badgeColor = "bg-emerald-50 border-emerald-200 text-emerald-700";
                  if (item.strength === 0) {
                    barColor = "bg-rose-500";
                    badgeColor = "bg-rose-50 border-rose-200 text-rose-700";
                  } else if (item.strength < 50) {
                    barColor = "bg-amber-500";
                    badgeColor = "bg-amber-50 border-amber-200 text-amber-700";
                  } else if (item.strength < 80) {
                    barColor = "bg-blue-500";
                    badgeColor = "bg-blue-50 border-blue-200 text-blue-700";
                  }

                  return (
                    <div key={item.skill} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-700">{item.skill}</span>
                          <span className={`text-[9px] font-bold border px-2 py-0.5 rounded-full ${badgeColor}`}>
                            {item.status}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-semibold">
                          Target demand: {item.average_requirement_pct}%
                        </span>
                      </div>
                      
                      <div className="relative">
                        <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${barColor}`}
                            style={{ width: `${item.strength}%` }}
                          />
                        </div>
                        {/* Target line indicator */}
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-slate-400 z-10"
                          style={{ left: `${item.average_requirement_pct}%` }}
                          title={`Target requirement boundary (${item.average_requirement_pct}%)`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-[10px] text-slate-500 leading-normal flex items-start gap-2">
                <span className="text-sm">💡</span>
                <div>
                  <span className="font-bold text-slate-700 block mb-0.5">Critical Gap Detected:</span>
                  The grey vertical lines represent target job requirements. Skills where your bar falls behind the vertical line represent high-priority optimization gaps.
                </div>
              </div>
            </div>
          </div>

          {/* PANEL 4: Actionable Next Steps */}
          <div className="bg-white border border-card-border rounded-xl p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider">
                ✅ Ranked Actionable Next Steps
              </h3>
              <p className="text-[11px] text-muted">Follow these specific instructions ordered by highest hiring impact first.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {report.next_steps.map((step) => {
                let badgeTheme = "bg-rose-50 text-rose-700 border-rose-200";
                if (step.impact === "HIGH IMPACT") {
                  badgeTheme = "bg-purple-50 text-purple-700 border-purple-200";
                } else if (step.impact === "MEDIUM IMPACT") {
                  badgeTheme = "bg-blue-50 text-blue-700 border-blue-200";
                } else if (step.impact === "QUICK WIN") {
                  badgeTheme = "bg-emerald-50 text-emerald-700 border-emerald-200";
                }

                return (
                  <div
                    key={step.priority}
                    className="border border-card-border rounded-xl p-4 space-y-3 bg-slate-50/30 flex flex-col justify-between hover:shadow-sm transition-shadow relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 bg-slate-100/80 px-2.5 py-1 rounded-bl-xl border-l border-b border-card-border text-[10px] font-bold text-slate-500">
                      #{step.priority}
                    </div>

                    <div className="space-y-1.5 text-left">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold px-2 py-0.5 border rounded ${badgeTheme}`}>
                          {step.impact}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400">⏱️ {step.time_estimate}</span>
                      </div>
                      <h4 className="font-bold text-slate-800 text-xs">
                        {step.action}
                      </h4>
                      <p className="text-xs text-slate-600 leading-normal">
                        {step.how}
                      </p>
                      <p className="text-[10px] text-slate-400 italic font-medium">
                        ↳ {step.rationale}
                      </p>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={() => {
                          if (step.action.toLowerCase().includes("salary") || step.action.toLowerCase().includes("notice")) {
                            router.push("/dashboard/candidate/settings");
                          } else {
                            router.push("/dashboard/candidate/prep");
                          }
                        }}
                        className="w-full text-center rounded-lg border border-slate-200 hover:border-slate-300 bg-white py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-sm"
                      >
                        {step.action.toLowerCase().includes("salary") || step.action.toLowerCase().includes("notice")
                          ? "Configure settings →"
                          : "Prep Room →"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-sm text-muted">Failed to generate insights report.</p>
        </div>
      )}
    </div>
  );
}
