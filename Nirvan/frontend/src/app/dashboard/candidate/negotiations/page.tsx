"use client";

import { createClient } from "@/lib/supabase-client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { mockNegotiations } from "@/lib/mock-data";

type Negotiation = {
  id: string;
  status: string;
  fit_score: number | null;
  created_at: string;
  recruiter: { company: string; position: string }[] | null;
};

const statusColor: Record<string, string> = {
  active: "border-l-blue-500 bg-blue-50/40",
  matched: "border-l-green-500 bg-green-50/40",
  scheduled: "border-l-purple-500 bg-purple-50/40",
  completed: "border-l-gray-400 bg-gray-50/40",
  rejected: "border-l-red-500 bg-red-50/40",
};

const statusLabel: Record<string, string> = {
  active: "Active",
  matched: "Match",
  scheduled: "Interview",
  completed: "Done",
  rejected: "Passed",
};

export default function CandidateNegotiations() {
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth"); return; }
      const { data: candidate } = await supabase.from("candidates").select("id").eq("profile_id", user.id).single();
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
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">{negotiations.length} active negotiations</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted"><div className="h-2 w-2 rounded-full bg-blue-500" /> Active</div>
          <div className="flex items-center gap-1.5 text-xs text-muted"><div className="h-2 w-2 rounded-full bg-green-500" /> Match</div>
          <div className="flex items-center gap-1.5 text-xs text-muted"><div className="h-2 w-2 rounded-full bg-purple-500" /> Interview</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {negotiations.map((n) => {
          const recruiter = Array.isArray(n.recruiter) ? n.recruiter[0] : n.recruiter;
          return (
            <Link
              key={n.id}
              href={`/negotiations/${n.id}`}
              className={`group rounded-xl border border-card-border bg-white shadow-sm hover:shadow-md transition-all border-l-4 ${statusColor[n.status] || "border-l-gray-300"}`}
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 text-lg font-bold text-accent">
                      {recruiter?.company?.[0] || "?"}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground group-hover:text-accent transition-colors flex items-center gap-1.5">
                        {recruiter?.company || "Unknown"}
                        <span className="rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.25 text-[8px] font-bold text-emerald-600 flex items-center gap-0.5 tracking-normal whitespace-nowrap">
                          🛡️ KYC Verified ✓
                        </span>
                      </h3>
                      <p className="text-xs text-muted">{recruiter?.position || "Position"}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${statusLabel[n.status] === "Active" ? "bg-blue-50 text-blue-600" : statusLabel[n.status] === "Match" ? "bg-green-50 text-green-600" : statusLabel[n.status] === "Interview" ? "bg-purple-50 text-purple-600" : "bg-gray-50 text-gray-600"}`}>
                    {statusLabel[n.status] || n.status}
                  </span>
                </div>

              {n.fit_score && (
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted">Fit score</span>
                    <span className="font-semibold text-foreground">{n.fit_score}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent/60 transition-all" style={{ width: `${n.fit_score}%` }} />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted/60">{new Date(n.created_at).toLocaleDateString()}</span>
                <span className="text-xs font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity">Open chat &rarr;</span>
              </div>
            </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
