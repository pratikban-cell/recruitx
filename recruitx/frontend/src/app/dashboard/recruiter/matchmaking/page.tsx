"use client";

import { createClient } from "@/lib/supabase-client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getTalentPool, initiateNegotiation } from "@/lib/api";

type Job = {
  id: string;
  title: string;
  company: string;
  remote_policy: string;
  salary_min?: number;
  salary_max?: number;
  stack?: string[];
  status: string;
};

type CandidateProfile = {
  id: string;
  name: string;
  title: string | null;
  skills: string[];
  salary_min: number | null;
  remote_pref: boolean;
  bio: string;
  email: string;
  github_verified?: boolean;
  human_verified?: boolean;
  category?: string;
  experience_level?: string;
  availability_days?: string;
  fit_score?: number;
  why_matched?: string[];
  missing?: string[];
};

export default function MatchmakingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  
  // Recruiter profile state
  const [recruiterId, setRecruiterId] = useState<string>("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  
  // Talent matches state
  const [matches, setMatches] = useState<CandidateProfile[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [initiatingId, setInitiatingId] = useState<string | null>(null);

  // Load recruiter profile & jobs
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth");
        return;
      }

      const { data: recruiter } = await supabase
        .from("recruiters")
        .select("id")
        .eq("profile_id", user.id)
        .single();

      if (recruiter) {
        setRecruiterId(recruiter.id);
        
        // Fetch active jobs posted by this recruiter
        const { data: jobsData } = await supabase
          .from("jobs")
          .select("*")
          .eq("recruiter_id", recruiter.id)
          .eq("status", "active")
          .order("created_at", { ascending: false });

        if (jobsData && jobsData.length > 0) {
          setJobs(jobsData);
          setSelectedJobId(jobsData[0].id);
        }
      }
      setLoading(false);
    };
    load();
  }, []);

  // Fetch talent pool matched specifically to selectedJobId
  useEffect(() => {
    if (!selectedJobId) {
      setMatches([]);
      return;
    }

    const fetchMatches = async () => {
      setLoadingMatches(true);
      try {
        const res = await getTalentPool({
          jobId: selectedJobId
        });
        if (res && res.talent) {
          setMatches(res.talent);
        }
      } catch (err) {
        console.error("Failed to query talent matches:", err);
      } finally {
        setLoadingMatches(false);
      }
    };
    fetchMatches();
  }, [selectedJobId]);

  const handleInitiate = async (candidateId: string) => {
    if (!recruiterId || !selectedJobId) return;
    setInitiatingId(candidateId);
    try {
      const res = await initiateNegotiation(recruiterId, candidateId, selectedJobId);
      if (res && res.negotiation_id) {
        // Trigger client-side event for visual toast alert
        const event = new CustomEvent("recruitx-toast", {
          detail: { message: "Autonomous agent negotiating has been successfully triggered!", type: "success" }
        });
        window.dispatchEvent(event);
        
        // Redirect to live negotiations pipeline
        router.push(`/dashboard/recruiter/candidates`);
      } else {
        alert("Failed to initiate negotiation: " + (res?.detail || "Unknown error"));
      }
    } catch (err) {
      console.error(err);
      alert("Failed to start negotiation backend query.");
    } finally {
      setInitiatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  const selectedJob = jobs.find(j => j.id === selectedJobId);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-card-border pb-5">
        <div className="text-left">
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            ⚡ Calibrated Matchmaking
            <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">
              Job-Specific Sourcing
            </span>
          </h1>
          <p className="text-sm text-muted">
            Select one of your job openings to view the ranked list of candidates matching its specific stack and parameters.
          </p>
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-card-border rounded-xl bg-white p-8 space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center text-accent text-xl">
            📂
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-foreground text-sm">No Active Job Postings</h3>
            <p className="text-xs text-muted max-w-md mx-auto">
              You need to post at least one active job opening to use the job-specific talent matchmaking board.
            </p>
          </div>
          <Link
            href="/dashboard/recruiter/jobs/new"
            className="inline-flex rounded-lg bg-foreground px-4 py-2 text-xs font-bold text-white hover:bg-foreground/90 transition-all shadow-sm"
          >
            Post a Job opening
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* Job Select Sidebar */}
          <div className="md:col-span-1 bg-white border border-card-border rounded-xl p-5 shadow-sm text-left space-y-4">
            <div>
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">Currently Sourcing For</span>
              <div className="relative mt-2">
                <select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="w-full rounded-lg border border-card-border bg-white px-3.5 py-2.5 text-xs font-bold text-foreground focus:border-accent focus:outline-none"
                >
                  {jobs.map(j => (
                    <option key={j.id} value={j.id}>{j.title}</option>
                  ))}
                </select>
              </div>
            </div>

            {selectedJob && (
              <div className="space-y-4 pt-4 border-t border-slate-50">
                <div>
                  <span className="text-[10px] font-bold text-muted uppercase block">Company</span>
                  <span className="text-xs font-bold text-slate-800">{selectedJob.company}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted uppercase block">Remote policy</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 inline-block mt-0.5">
                    {selectedJob.remote_policy === "remote" ? "Fully Remote" : selectedJob.remote_policy === "hybrid" ? "Hybrid" : "On-site"}
                  </span>
                </div>
                {selectedJob.salary_min && (
                  <div>
                    <span className="text-[10px] font-bold text-muted uppercase block">Budget Range</span>
                    <span className="text-xs font-semibold text-slate-800">
                      ${selectedJob.salary_min.toLocaleString()} – ${selectedJob.salary_max?.toLocaleString()}/yr
                    </span>
                  </div>
                )}
                {selectedJob.stack && selectedJob.stack.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold text-muted uppercase block mb-1.5">Required Tech Stack</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedJob.stack.map(s => (
                        <span key={s} className="rounded-lg bg-accent/5 border border-accent/10 px-2 py-0.5 text-[9px] font-bold text-accent">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Calibrated Matches feed */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex justify-between items-center text-left">
              <div>
                <h2 className="text-sm font-bold text-foreground">Matched Candidates</h2>
                <p className="text-xs text-muted">Ranked list of verified candidate agents that match this job opening.</p>
              </div>
              <span className="text-[10px] bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-bold">
                {matches.length} matches
              </span>
            </div>

            {loadingMatches ? (
              <div className="flex items-center justify-center py-16 border border-dashed border-card-border rounded-xl bg-white">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              </div>
            ) : matches.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-card-border rounded-xl bg-white p-6">
                <p className="text-sm text-muted">No candidate agents match this job parameters.</p>
                <p className="text-xs text-muted/60 mt-1">Try updating the job details or required tech stack.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {matches.map(t => {
                  const anonymizedId = `Candidate #${t.id.slice(0, 4).toUpperCase()}`;
                  
                  let scoreColor = "text-green-600 bg-green-50 border-green-200";
                  if (t.fit_score && t.fit_score < 60) {
                    scoreColor = "text-red-500 bg-red-50 border-red-200";
                  } else if (t.fit_score && t.fit_score < 80) {
                    scoreColor = "text-amber-600 bg-amber-50 border-amber-200";
                  }

                  const availabilityText = t.availability_days === "immediate" ? "Available Immediately" : `Available in ${t.availability_days} Days`;

                  let weightingText = "Conversational AI only (100%)";
                  if (t.github_verified && t.human_verified) {
                    weightingText = "GitHub (30%) + Expert CV (40%) + Conversation (30%)";
                  } else if (t.github_verified) {
                    weightingText = "GitHub (50%) + Conversation (50%)";
                  } else if (t.human_verified) {
                    weightingText = "Expert CV (60%) + Conversation (40%) (Loophole Resolved)";
                  }

                  return (
                    <div
                      key={t.id}
                      className="rounded-xl border border-card-border bg-white p-5 shadow-sm flex flex-col sm:flex-row sm:items-start justify-between gap-6 hover:shadow-md transition-shadow relative overflow-hidden group"
                    >
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent/5 via-accent/30 to-accent/5 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                      
                      <div className="space-y-3 max-w-xl text-left flex-1">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 border border-card-border text-sm font-bold text-slate-700">
                            🤖
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-foreground text-sm">
                                {anonymizedId}
                              </h3>
                              <span className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full font-medium">
                                {t.category || "Generalist"} · {t.experience_level || "Mid"}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-accent mt-0.5">
                              {t.title || "Software Engineer"}
                            </p>
                          </div>
                        </div>

                        {t.bio && (
                          <p className="text-xs text-muted/80 leading-relaxed">
                            {t.bio}
                          </p>
                        )}

                        {/* Dynamic weights badge */}
                        <div className="text-[10px] text-muted flex items-center gap-1.5 bg-slate-50/80 px-2.5 py-1.5 rounded-lg border border-slate-100 w-fit">
                          <span className="font-bold text-slate-600">⚖️ Calibrated Score Weighting:</span>
                          <span className="font-medium text-slate-500">{weightingText}</span>
                        </div>

                        <div className="flex flex-wrap gap-1.5 pt-0.5 items-center">
                          {t.github_verified && (
                            <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[9px] font-bold text-blue-600 flex items-center gap-1">
                              GitHub Verified ✓
                            </span>
                          )}
                          {t.human_verified && (
                            <>
                              <span className="rounded-full bg-purple-50 border border-purple-200 px-2.5 py-0.5 text-[9px] font-bold text-purple-600 flex items-center gap-1">
                                Human Expert CV Verified ✓
                              </span>
                              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[9px] font-bold text-emerald-600 flex items-center gap-1">
                                🛡️ Identity Verified ✓
                              </span>
                            </>
                          )}
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[9px] font-medium text-slate-600">
                            📅 {availabilityText}
                          </span>
                          {t.remote_pref && (
                            <span className="rounded-full bg-green-50 border border-green-200 px-2.5 py-0.5 text-[9px] font-bold text-green-600">
                              🏠 Remote
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {t.skills.slice(0, 5).map((s) => (
                            <span
                              key={s}
                              className="rounded-lg bg-slate-50 border border-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
                            >
                              {s}
                            </span>
                          ))}
                        </div>

                        {/* Match Insights & Gaps */}
                        {t.why_matched && t.why_matched.length > 0 && (
                          <div className="pt-2 border-t border-slate-50 space-y-1">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Match Insights</span>
                            <div className="space-y-1">
                              {t.why_matched.map((w, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-700">
                                  <span className="text-emerald-500 font-bold shrink-0">✓</span>
                                  <span>{w}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {t.missing && t.missing.length > 0 && (
                          <div className="pt-1.5 space-y-1">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Gaps & Focus areas</span>
                            <div className="space-y-1">
                              {t.missing.map((m, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-500">
                                  <span className="text-amber-500 font-bold shrink-0">⚠</span>
                                  <span>{m}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-3 sm:text-right self-stretch justify-between shrink-0">
                        <div className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <span className="text-[10px] text-muted font-medium">calibrated fit</span>
                            <span className={`text-xs font-extrabold px-2 py-0.5 rounded-lg border ${scoreColor}`}>
                              {t.fit_score}%
                            </span>
                          </div>
                          {t.salary_min && (
                            <span className="text-xs font-bold text-slate-800 block mt-1">
                              Salary Floor: ${t.salary_min.toLocaleString()}/yr
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => handleInitiate(t.id)}
                          disabled={initiatingId !== null}
                          className="rounded-lg bg-foreground hover:bg-foreground/90 px-4 py-2 text-xs font-bold text-white disabled:opacity-50 transition-all shadow-sm whitespace-nowrap cursor-pointer mt-auto"
                        >
                          {initiatingId === t.id
                            ? "Initiating A2A Loop..."
                            : "Initiate AI Match"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
