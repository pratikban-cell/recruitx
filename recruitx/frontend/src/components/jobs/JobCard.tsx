"use client";

import Link from "next/link";

interface JobCardProps {
  job: {
    id: string;
    company: string;
    title: string;
    location?: string;
    remote_policy?: string;
    salary_min?: number;
    salary_max?: number;
    stack?: string[];
    fit_score?: number;
    status: string;
  };
  showFit?: boolean;
  showApply?: boolean;
}

export default function JobCard({ job, showFit, showApply }: JobCardProps) {
  const policyLabel = job.remote_policy === "remote" ? "Remote" : job.remote_policy === "hybrid" ? "Hybrid" : job.remote_policy === "onsite" ? "On-site" : null;

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="group block rounded-xl border border-card-border bg-white p-5 shadow-sm hover:shadow-md hover:border-accent/30 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 text-base font-bold text-accent shrink-0">
            {job.company[0]}
          </div>
          <div>
            <h3 className="font-semibold text-foreground group-hover:text-accent transition-colors">{job.company}</h3>
            <p className="text-sm text-foreground/80">{job.title}</p>
          </div>
        </div>
        {showFit && job.fit_score && (
          <div className="text-right shrink-0">
            <p className="text-lg font-bold text-gradient">{job.fit_score}%</p>
            <p className="text-[10px] text-muted">fit</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-3">
        {policyLabel && <span className="rounded-full bg-subtle px-2.5 py-0.5 text-[11px] font-medium text-muted">{policyLabel}</span>}
        {job.location && job.location.toLowerCase() !== job.remote_policy?.toLowerCase() && <span className="rounded-full bg-subtle px-2.5 py-0.5 text-[11px] font-medium text-muted">{job.location}</span>}
        {job.stack?.slice(0, 4).map((s) => (
          <span key={s} className="rounded-full bg-accent/5 px-2.5 py-0.5 text-[11px] font-medium text-accent">{s}</span>
        ))}
      </div>

      <div className="flex items-center justify-between">
        {job.salary_min ? (
          <span className="text-sm font-medium text-foreground">${(job.salary_min / 1000).toFixed(0)}k{job.salary_max ? `–$${(job.salary_max / 1000).toFixed(0)}k` : ""}</span>
        ) : <span className="text-sm text-muted">Salary not listed</span>}
        {showApply && (
          <span className="text-xs font-semibold text-accent opacity-0 group-hover:opacity-100 transition-opacity">Let agent handle &rarr;</span>
        )}
      </div>
    </Link>
  );
}
