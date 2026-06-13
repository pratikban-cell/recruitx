"use client";
 
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { mockJobs } from "@/lib/mock-data";
import { createClient } from "@/lib/supabase-client";
import { candidateSendMessage, initiateNegotiation } from "@/lib/api";
import { useEffect, useState } from "react";
 
interface DbJob {
  id: string; company: string; title: string; location?: string;
  remote_policy?: string; salary_min?: number; salary_max?: number;
  stack?: string[]; description?: string; culture_signals?: string;
  experience_required?: string; dealbreaker_flexibility?: string;
  fit_score?: number; created_at?: string;
}
 
export default function JobDetail() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [dbJob, setDbJob] = useState<DbJob | null>(null);
  const [existingNegotiationId, setExistingNegotiationId] = useState<string | null>(null);
  const [existingNegotiationStatus, setExistingNegotiationStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [agentLoading, setAgentLoading] = useState(false);
  const supabase = createClient();
 
  const mockJob = mockJobs.find((j) => j.id === params.id);
 
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      let candId = null;
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        if (profile) {
          setUserRole(profile.role);
        }
        const { data: cand } = await supabase.from("candidates").select("id").eq("profile_id", user.id).single();
        if (cand) {
          setCandidateId(cand.id);
          candId = cand.id;
        }
      }
      const { data: job } = await supabase.from("jobs").select("*").eq("id", params.id).single();
      if (job) {
        setDbJob(job);
        
        // Check for existing negotiation regardless of status
        if (candId && job.recruiter_id) {
          const { data: negs } = await supabase
            .from("negotiations")
            .select("id, status, candidate_notes")
            .eq("candidate_id", candId)
            .eq("recruiter_id", job.recruiter_id);
          if (negs && negs.length > 0) {
            const matchingNeg = negs.find((n: any) => (n.candidate_notes || "").includes(job.id));
            if (matchingNeg) {
              setExistingNegotiationId(matchingNeg.id);
              setExistingNegotiationStatus(matchingNeg.status);
            }
          }
        }
      }
      setLoading(false);
    };
    load();
  }, []);
 
  const job = dbJob || mockJob;
 
  const handleAgentApply = async () => {
    if (existingNegotiationId) {
      router.push(`/negotiations/${existingNegotiationId}`);
      return;
    }
    
    if (!job || !candidateId) {
      alert("Could not load candidate profile. Please make sure your candidate profile is active.");
      return;
    }
    const recId = (job as any).recruiter_id;
    if (!recId) {
      alert("This job does not have an associated recruiter to negotiate with.");
      return;
    }
    setAgentLoading(true);
    try {
      // 1. Create the negotiation match in the DB and start the negotiation loop
      const res = await initiateNegotiation(recId, candidateId, job.id);
      const negId = res?.negotiation_id;

      // 2. Send the message to the candidate's agent to kickstart local context (non-blocking)
      const msg = `I'm interested in the ${job?.title} role at ${job?.company}. My profile is ready — let's negotiate.`;
      candidateSendMessage(msg).catch((err) => console.error("A2A context initialization failed:", err));

      if (negId) {
        router.push(`/negotiations/${negId}`);
      } else {
        router.push("/dashboard/candidate/negotiations");
      }
    } catch (err) {
      console.error(err);
      router.push("/dashboard/candidate");
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-subtle">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
    </div>
  );

  if (!job) return (
    <div className="min-h-screen flex items-center justify-center bg-subtle">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground">Job not found</h2>
        <Link href="/jobs" className="mt-3 inline-flex text-sm text-accent hover:underline">&larr; Back to job board</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-subtle">
      <nav className="border-b border-card-border bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent-gradient shadow-sm">
              <span className="text-sm font-bold text-white">H</span>
            </div>
            <span className="text-lg font-semibold text-foreground">recruitx</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/jobs" className="text-sm text-muted hover:text-foreground transition-colors">&larr; All jobs</Link>
            {!user ? (
              <Link href="/auth" className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-white hover:bg-foreground/90 transition-all shadow-sm">Sign in to apply</Link>
            ) : null}
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="rounded-xl border border-card-border bg-white shadow-sm overflow-hidden">
          <div className="p-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/10 to-accent/5 text-2xl font-bold text-accent">{job.company[0]}</div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{job.title}</h1>
                  <p className="text-muted mt-0.5">{job.company} · {job.location || (job.remote_policy === "remote" ? "Remote" : job.remote_policy === "hybrid" ? "Hybrid" : "On-site")}</p>
                </div>
              </div>
              {job.fit_score && (
                <div className="text-center">
                  <div className="text-3xl font-bold text-gradient">{job.fit_score}%</div>
                  <p className="text-xs text-muted mt-0.5">Your agent&apos;s fit score</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap mb-8">
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                job.remote_policy === "remote" ? "bg-green-50 text-green-700" : job.remote_policy === "hybrid" ? "bg-blue-50 text-blue-700" : "bg-orange-50 text-orange-700"
              }`}>{job.remote_policy === "remote" ? "Fully Remote" : job.remote_policy === "hybrid" ? "Hybrid" : "On-site"}</span>
              {job.salary_min && (
                <span className="rounded-full bg-accent/5 px-3 py-1 text-xs font-medium text-accent">
                  ${(job.salary_min / 1000).toFixed(0)}k{job.salary_max ? ` – $${(job.salary_max / 1000).toFixed(0)}k` : ""}
                </span>
              )}
              {job.stack?.map((s) => (
                <span key={s} className="rounded-full bg-subtle px-3 py-1 text-xs font-medium text-muted">{s}</span>
              ))}
            </div>

            <div className="space-y-6">
              <section>
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-2">About the role</h2>
                <p className="text-sm text-foreground/80 leading-relaxed">{job.description}</p>
              </section>

              <section className="grid grid-cols-2 gap-6">
                <div className="rounded-lg bg-subtle p-4">
                  <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Team</h3>
                  <p className="text-sm text-foreground">{job.culture_signals?.split(",")[0] || "Growing team"}</p>
                </div>
                <div className="rounded-lg bg-subtle p-4">
                  <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Experience</h3>
                  <p className="text-sm text-foreground">{job.experience_required || "Not specified"}</p>
                </div>
              </section>

              <section>
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-2">What your agent knows</h2>
                <div className="rounded-lg border border-accent/20 bg-accent/5 p-4">
                  <p className="text-sm text-foreground/80 leading-relaxed">{job.dealbreaker_flexibility}</p>
                  <p className="text-xs text-muted mt-2">The recruiter&apos;s agent shared this during intake. Your agent uses this to negotiate on your behalf.</p>
                </div>
              </section>

              <section>
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">Culture Signals</h2>
                <div className="flex items-start gap-2">
                  <svg className="h-5 w-5 text-accent shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                  </svg>
                  <p className="text-sm text-foreground/80">{job.culture_signals}</p>
                </div>
              </section>
            </div>
          </div>

          <div className="border-t border-card-border bg-subtle/50 px-8 py-5">
            <div className="flex items-center justify-between">
                <p className="text-xs text-muted">Posted {job.created_at ? new Date(job.created_at).toLocaleDateString() : "recently"} · Agent-ready</p>
              {user && userRole === "candidate" ? (
                (() => {
                  let btnText = "Let agent handle this";
                  let btnClass = "bg-accent hover:bg-accent/90 text-white";
                  if (existingNegotiationId) {
                    if (existingNegotiationStatus === "matched") {
                      btnText = "🎉 Hired — View Details";
                      btnClass = "bg-green-600 hover:bg-green-700 text-white";
                    } else if (existingNegotiationStatus === "scheduled") {
                      btnText = "📅 Interview Scheduled — View Details";
                      btnClass = "bg-blue-600 hover:bg-blue-700 text-white";
                    } else if (existingNegotiationStatus === "completed") {
                      btnText = "🏁 Process Completed — View Details";
                      btnClass = "bg-gray-600 hover:bg-gray-700 text-white";
                    } else if (existingNegotiationStatus === "rejected") {
                      btnText = "❌ Closed — View Details";
                      btnClass = "bg-red-600 hover:bg-red-700 text-white";
                    } else {
                      btnText = "💬 View Active Negotiation";
                      btnClass = "bg-accent hover:bg-accent/90 text-white";
                    }
                  }
                  return (
                    <button onClick={handleAgentApply} disabled={agentLoading}
                      className={`rounded-lg px-6 py-2.5 text-sm font-semibold disabled:opacity-50 transition-all shadow-sm ${btnClass}`}>
                      {agentLoading ? "Contacting your agent..." : btnText}
                    </button>
                  );
                })()
              ) : user && userRole === "recruiter" ? (
                <Link href="/dashboard/recruiter/jobs" className="rounded-lg bg-foreground px-6 py-2.5 text-sm font-semibold text-white hover:bg-foreground/90 transition-all shadow-sm">
                  Manage Jobs in Dashboard
                </Link>
              ) : (
                <Link href="/auth" className="rounded-lg bg-foreground px-6 py-2.5 text-sm font-semibold text-white hover:bg-foreground/90 transition-all shadow-sm">
                  Sign up — let your agent apply
                </Link>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
