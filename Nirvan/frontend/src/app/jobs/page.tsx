"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import { mockJobs } from "@/lib/mock-data";
import JobCard from "@/components/jobs/JobCard";
import Sidebar from "@/components/dashboard/Sidebar";
import TopBar from "@/components/dashboard/TopBar";

type Job = (typeof mockJobs)[number];

export default function JobBoard() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dbJobs, setDbJobs] = useState<Job[]>([]);
  const [search, setSearch] = useState("");
  const [remoteFilter, setRemoteFilter] = useState<string>("all");

  const allJobs = useMemo(() => {
    const seen = new Set<string>();
    return [...dbJobs, ...mockJobs].filter((j) => {
      if (seen.has(j.id)) return false;
      seen.add(j.id);
      return true;
    });
  }, [dbJobs]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user ?? null);
      if (user) {
        const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        setProfile(p ?? null);
      }
      const { data: jobs } = await supabase.from("jobs").select("*").eq("status", "active");
      if (jobs && jobs.length > 0) {
        setDbJobs(jobs.map((j: any) => ({
          id: j.id,
          company: j.company,
          title: j.title,
          location: j.location || "",
          remote_policy: j.remote_policy,
          salary_min: j.salary_min,
          salary_max: j.salary_max,
          stack: j.stack || [],
          description: j.description || "",
          culture_signals: j.culture_signals || "",
          experience_required: j.experience_required || "",
          dealbreaker_flexibility: j.dealbreaker_flexibility || "",
          status: j.status,
          fit_score: j.fit_score || undefined,
          created_at: j.created_at,
        })));
      }
      setAuthLoading(false);
    };
    init();
  }, []);

  const filtered = useMemo(() => {
    return allJobs.filter((j) => {
      const q = search.toLowerCase();
      const matchesSearch = !q || j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q) || j.stack?.some((s) => s.toLowerCase().includes(q));
      const matchesRemote = remoteFilter === "all" || j.remote_policy === remoteFilter;
      return matchesSearch && matchesRemote && j.status === "active";
    });
  }, [search, remoteFilter, allJobs]);

  const stackTags = [...new Set(allJobs.flatMap((j) => j.stack || []))].sort();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    router.push("/");
  };

  const jobBoardContent = (
    <>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-8">
        <div className="relative flex-1">
          <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, company, or tech stack..."
            className="w-full rounded-lg border border-card-border bg-white pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>
        <div className="flex items-center gap-2">
          {["all", "remote", "hybrid", "onsite"].map((r) => (
            <button key={r} onClick={() => setRemoteFilter(r)}
              className={`rounded-lg border px-3.5 py-2 text-xs font-medium transition-all capitalize ${remoteFilter === r ? "border-accent bg-accent/5 text-accent" : "border-card-border text-muted hover:border-accent/30"}`}
            >{r}</button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap mb-8">
        {stackTags.map((tag) => (
          <button key={tag} onClick={() => setSearch(tag)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${search === tag ? "bg-accent text-white" : "bg-white border border-card-border text-muted hover:border-accent/30"}`}
          >{tag}</button>
        ))}
      </div>

      {!user && !authLoading && (
        <div className="mb-8 rounded-xl border border-accent/20 bg-accent/5 p-4 text-center">
          <p className="text-sm text-foreground/80">
            <Link href="/auth?redirect=/jobs" className="font-semibold text-accent hover:underline">Sign in</Link> to see your fit scores and let your agent apply.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((job) => (
          <JobCard key={job.id} job={job} showFit={!!user} showApply={!!user} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
            <svg className="h-7 w-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <p className="text-muted">No jobs match your search. Try different keywords.</p>
        </div>
      )}
    </>
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-subtle">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (user) {
    const isRecruiter = profile?.role === "recruiter";
    return (
      <div className="min-h-screen bg-subtle">
        <Sidebar isRecruiter={isRecruiter} userName={profile?.name} onLogout={handleLogout} />
        <div className="pl-64">
          <TopBar title="Job Board" />
          <main className="p-8">{jobBoardContent}</main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-subtle">
      <nav className="border-b border-card-border bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent-gradient shadow-sm">
              <span className="text-sm font-bold text-white">A</span>
            </div>
            <span className="text-lg font-semibold text-foreground">Nirvan</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/auth" className="text-sm text-muted hover:text-foreground transition-colors">Sign in</Link>
            <Link href="/auth" className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-white hover:bg-foreground/90 transition-all shadow-sm">Start for free</Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground tracking-tight">Job Board</h1>
          <p className="mt-3 text-muted max-w-lg mx-auto">Browse roles where your agent negotiates for you. No cover letters. Just genuine fit.</p>
        </div>
        {jobBoardContent}
      </main>
    </div>
  );
}
