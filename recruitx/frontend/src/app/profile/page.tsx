"use client";

import { createClient } from "@/lib/supabase-client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import TopBar from "@/components/dashboard/TopBar";

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"candidate" | "recruiter">("candidate");

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/auth"); return; }

        const { data: prof, error: profErr } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (profErr && profErr.code !== "PGRST116") {
          setError(profErr.message);
          setLoading(false);
          return;
        }
        setProfile(prof);
        if (prof) setName(prof.name || "");

        if (prof?.role) {
          router.push(`/dashboard/${prof.role}/settings`);
          return;
        }

        if (!prof) setError("No profile found. Try signing up again.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile");
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  useEffect(() => {
    if (!loading && profile && !error) {
      router.push(`/dashboard/${profile.role}/settings`);
    }
  }, [loading, profile, error]);

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-subtle">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
    </div>
  );

  const sidebarProfileName = profile?.name || (error ? "" : "User");

  if (error) return (
    <div className="min-h-screen bg-subtle relative pt-16">
      <Sidebar userName={sidebarProfileName} onLogout={handleLogout} isRecruiter={role === "recruiter"} />
      <div className="pl-32">
        <TopBar title="Profile" />
        <main className="p-8 flex justify-center">
          <div className="w-full max-w-md rounded-2xl border border-card-border bg-white p-8 shadow-sm">
            <div className="text-center mb-6">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
                <svg className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <p className="text-sm text-muted">{error}</p>
              <p className="text-xs text-muted/70 mt-1">Let&apos;s create your profile to continue.</p>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setSaving(true);
              setError("");
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) { setError("Not authenticated"); setSaving(false); return; }
              await supabase.from("profiles").insert({
                id: user.id, role: role, name,
              }).maybeSingle();
              if (role === "candidate") {
                await supabase.from("candidates").insert({ profile_id: user.id }).maybeSingle();
              } else {
                await supabase.from("recruiters").insert({ profile_id: user.id }).maybeSingle();
              }
              window.location.reload();
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-card-border bg-white px-4 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  placeholder="Your name" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">I am a</label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setRole("candidate")}
                    className={`rounded-lg border px-4 py-3 text-sm font-medium transition-all ${role === "candidate" ? "border-accent bg-accent/5 text-accent" : "border-card-border text-muted hover:border-accent/30"}`}>
                    Candidate
                  </button>
                  <button type="button" onClick={() => setRole("recruiter")}
                    className={`rounded-lg border px-4 py-3 text-sm font-medium transition-all ${role === "recruiter" ? "border-accent bg-accent/5 text-accent" : "border-card-border text-muted hover:border-accent/30"}`}>
                    Recruiter
                  </button>
                </div>
              </div>
              <button type="submit" disabled={saving || !name}
                className="w-full rounded-lg bg-foreground px-6 py-3 text-sm font-semibold text-white hover:bg-foreground/90 disabled:opacity-50 transition-all shadow-sm">
                {saving ? "Creating..." : "Create profile"}
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );

  if (!profile) return null;

  return null;
}
