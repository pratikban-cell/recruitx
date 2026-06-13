"use client";

import { createClient } from "@/lib/supabase-client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import TopBar from "@/components/dashboard/TopBar";

const pageTitles: Record<string, string> = {
  "/dashboard/recruiter/candidates": "Candidates",
  "/dashboard/recruiter/calendar": "Calendar",
  "/dashboard/recruiter/analytics": "Analytics",
  "/dashboard/recruiter/settings": "Settings",
  "/dashboard/recruiter/matchmaking": "Matchmaking",
  "/dashboard/recruiter/verify": "KYC Verification",
};

export default function RecruiterLayout({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<{ id: string; message: string; type: string }[]>([]);
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
      if (profile.role !== "recruiter") { router.push("/dashboard/candidate"); return; }
      setProfile(profile);
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { message, type } = customEvent.detail;
      const newToast = { id: Math.random().toString(), message, type };
      setToasts((prev) => [...prev, newToast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 5000);
    };
    window.addEventListener("recruitx-toast", handleToast);
    return () => window.removeEventListener("recruitx-toast", handleToast);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-subtle" style={{
      "--color-subtle": "#f6f3fa",
      "--color-accent": "#7c3aed",
    } as React.CSSProperties}>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
    </div>
  );

  const title = pageTitles[pathname] || "Overview";

  return (
    <div className="min-h-screen bg-subtle relative pt-16" style={{
      "--color-subtle": "#f6f3fa",
      "--color-accent": "#7c3aed",
      "--color-accent-dark": "#6d28d9",
      "--color-accent-gradient": "#8b5cf6",
    } as React.CSSProperties}>
      <Sidebar isRecruiter userName={profile?.name} onLogout={handleLogout} />
      <div className="pl-32">
        <TopBar title={title} />
        <main className="p-8">{children}</main>
      </div>

      {/* Premium Glassmorphic Toast Notification Container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 w-full max-w-md pointer-events-none">
        {toasts.map((toast) => {
          const typeThemes: Record<string, { border: string; bg: string; icon: string; text: string }> = {
            success: {
              border: "border-l-emerald-500",
              bg: "bg-emerald-50/90",
              icon: "🤝",
              text: "text-emerald-800",
            },
            pause: {
              border: "border-l-amber-500",
              bg: "bg-amber-50/90",
              icon: "⏸️",
              text: "text-amber-800",
            },
            update: {
              border: "border-l-blue-500",
              bg: "bg-blue-50/90",
              icon: "🤖",
              text: "text-blue-800",
            },
            error: {
              border: "border-l-rose-500",
              bg: "bg-rose-50/90",
              icon: "⚠️",
              text: "text-rose-800",
            },
          };
          const theme = typeThemes[toast.type] || typeThemes.update;

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-2xl border border-white/20 border-l-4 ${theme.border} ${theme.bg} backdrop-blur-xl p-4 shadow-2xl transition-all duration-500 transform translate-y-0 opacity-100 scale-100 hover:scale-[1.02] cursor-pointer`}
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            >
              <span className="text-xl shrink-0 select-none">{theme.icon}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold ${theme.text} leading-normal tracking-wide`}>
                  {toast.message}
                </p>
              </div>
              <button className="text-gray-400 hover:text-gray-600 font-bold text-xs shrink-0 select-none leading-none px-1">
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

