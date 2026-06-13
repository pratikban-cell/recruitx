"use client";

import { createClient } from "@/lib/supabase-client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import TopBar from "@/components/dashboard/TopBar";

const pageTitles: Record<string, string> = {
  "/dashboard/candidate/negotiations": "Negotiations",
  "/dashboard/candidate/calendar": "Calendar",
  "/dashboard/candidate/prep": "Prep Room",
  "/dashboard/candidate/analytics": "Analytics",
  "/dashboard/candidate/settings": "Settings",
  "/dashboard/candidate/insights": "Rejection Insights",
  "/dashboard/candidate/verify": "Verification",
};

export default function CandidateLayout({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth"); return; }
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (!profile) { router.push("/profile"); return; }
      if (profile.role !== "candidate") { router.push("/dashboard/recruiter"); return; }
      setProfile(profile);
      setLoading(false);
    };
    load();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-subtle" style={{
      "--color-subtle": "#f2f5fa",
      "--color-accent": "#2563eb",
    } as React.CSSProperties}>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
    </div>
  );

  const title = pageTitles[pathname] || "Overview";

  return (
    <div className="min-h-screen bg-subtle relative pt-16" style={{
      "--color-subtle": "#f2f5fa",
      "--color-accent": "#2563eb",
      "--color-accent-dark": "#1d4ed8",
      "--color-accent-gradient": "#3b82f6",
    } as React.CSSProperties}>
      <Sidebar userName={profile?.name} onLogout={handleLogout} />
      <div className="pl-32">
        <TopBar title={title} />
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
