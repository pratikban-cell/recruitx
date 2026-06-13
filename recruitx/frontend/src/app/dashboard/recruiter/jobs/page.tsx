"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-client";
import { mockJobs } from "@/lib/mock-data";

const statusColor: Record<string, string> = {
  active: "text-green-600 bg-green-50",
  filled: "text-blue-600 bg-blue-50",
  closed: "text-gray-600 bg-gray-50",
};

interface DbJob {
  id: string; company: string; title: string; location?: string;
  remote_policy?: string; salary_min?: number; salary_max?: number;
  stack?: string[]; status: string; fit_score?: number; created_at?: string;
}

export default function RecruiterJobs() {
  const supabase = createClient();
  const [dbJobs, setDbJobs] = useState<DbJob[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>("active");

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: rec } = await supabase.from("recruiters").select("id").eq("profile_id", user.id).single();
      if (!rec) return;
      const { data: jobs } = await supabase.from("jobs").select("*").eq("recruiter_id", rec.id).order("created_at", { ascending: false });
      if (jobs) setDbJobs(jobs);
    };
    load();
  }, []);
  const handleStatusChange = async (jobId: string, newStatus: string) => {
    const isDbJob = dbJobs.some(j => j.id === jobId);
    if (!isDbJob) {
      setDbJobs((prev) => {
        const existing = prev.find(j => j.id === jobId);
        if (existing) {
          return prev.map(j => j.id === jobId ? { ...j, status: newStatus } : j);
        } else {
          const mockJ = mockJobs.find(j => j.id === jobId);
          if (mockJ) {
            return [...prev, { ...mockJ, status: newStatus }];
          }
        }
        return prev;
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("jobs")
        .update({ status: newStatus })
        .eq("id", jobId);
      if (error) {
        console.error("Error updating job status:", error);
        alert(`Failed to update job status: ${error.message}`);
        return;
      }
      setDbJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, status: newStatus } : j))
      );
    } catch (err: any) {
      console.error("Failed to change status:", err);
      alert(`Error updating status: ${err.message || err}`);
    }
  };

  const allJobs = useMemo(() => {
    const seen = new Set<string>();
    return [...dbJobs, ...mockJobs].filter((j) => {
      if (seen.has(j.id)) return false;
      seen.add(j.id);
      return true;
    });
  }, [dbJobs]);

  const filtered = useMemo(() => {
    return allJobs.filter((j) => activeFilter === "all" || j.status === activeFilter);
  }, [activeFilter, allJobs]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {["active", "filled", "closed", "all"].map((f) => (
            <button key={f} onClick={() => setActiveFilter(f)}
              className={`rounded-lg border px-3.5 py-1.5 text-xs font-medium transition-all capitalize ${activeFilter === f ? "border-accent bg-accent/5 text-accent" : "border-card-border text-muted hover:border-accent/30"}`}
            >{f}</button>
          ))}
        </div>
        <Link href="/dashboard/recruiter/jobs/new" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 transition-all shadow-sm">
          + New job
        </Link>
      </div>

      <div className="space-y-3">
        {filtered.map((job) => (
          <div key={job.id} className="rounded-xl border border-card-border bg-white p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4 min-w-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 text-base font-bold text-accent shrink-0">
                  {job.company[0]}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground truncate">{job.title}</h3>
                    <select
                      value={job.status}
                      onChange={(e) => handleStatusChange(job.id, e.target.value)}
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize border border-transparent hover:border-card-border outline-none cursor-pointer focus:ring-1 focus:ring-accent/30 transition-all ${statusColor[job.status] || "bg-gray-50 text-gray-600"}`}
                    >
                      <option value="active">active</option>
                      <option value="filled">filled</option>
                      <option value="closed">closed</option>
                    </select>
                  </div>
                  <p className="text-sm text-muted">{job.company} · {job.remote_policy === "remote" ? "Remote" : job.remote_policy === "hybrid" ? "Hybrid" : "On-site"}</p>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {job.stack?.slice(0, 4).map((s) => (
                      <span key={s} className="rounded-full bg-accent/5 px-2 py-0.5 text-[10px] font-medium text-accent">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {job.fit_score && (
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{job.fit_score}% avg fit</p>
                    <p className="text-[10px] text-muted">candidate pool</p>
                  </div>
                )}
                <Link href={`/jobs/${job.id}`} className="text-xs font-medium text-accent hover:text-accent/80">View &rarr;</Link>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted text-sm">No jobs found. Create your first one with the agent.</p>
          </div>
        )}
      </div>
    </div>
  );
}
