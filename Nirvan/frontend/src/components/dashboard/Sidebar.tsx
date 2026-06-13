"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  { label: "Overview", href: "/dashboard/candidate", icon: "M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" },
  { label: "Negotiations", href: "/dashboard/candidate/negotiations", icon: "M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" },
  { label: "Job Board", href: "/jobs", icon: "M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" },
  { label: "Calendar", href: "/dashboard/candidate/calendar", icon: "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" },
  { label: "Prep Room", href: "/dashboard/candidate/prep", icon: "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-16.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-16.25v14.25" },
  { label: "Analytics", href: "/dashboard/candidate/analytics", icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" },
  { label: "Profile", href: "/dashboard/candidate/settings", icon: "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" },
];

const recruiterNavItems = [
  { label: "Overview", href: "/dashboard/recruiter", icon: "M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" },
  { label: "Negotiations", href: "/dashboard/recruiter/candidates", icon: "M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" },
  { label: "Matchmaking", href: "/dashboard/recruiter/matchmaking", icon: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" },
  { label: "Jobs", href: "/dashboard/recruiter/jobs", icon: "M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015-1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" },
  { label: "Calendar", href: "/dashboard/recruiter/calendar", icon: "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" },
  { label: "Analytics", href: "/dashboard/recruiter/analytics", icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" },
  { label: "Profile", href: "/dashboard/recruiter/settings", icon: "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" },
];

interface SidebarProps {
  isRecruiter?: boolean;
  userName?: string;
  onLogout?: () => void;
}

export default function Sidebar({ isRecruiter, userName, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const items = isRecruiter ? recruiterNavItems : navItems;

  return (
    <aside className="fixed left-6 top-1/2 -translate-y-1/2 z-35 flex flex-col items-center gap-4 bg-transparent select-none">
      {/* Account Profile circle button */}
      <div className="relative mb-2">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex h-13 w-13 items-center justify-center rounded-full border border-card-border bg-card text-sm font-semibold text-foreground hover:bg-subtle hover:scale-105 shadow-card transition-all duration-300 cursor-pointer"
          title="Account Menu"
        >
          {userName?.[0]?.toUpperCase() || "U"}
        </button>

        {dropdownOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setDropdownOpen(false)} />
            <div className="absolute left-full ml-4 top-0 w-56 rounded-2xl border border-card-border bg-card p-2 shadow-card z-50 animate-in fade-in slide-in-from-left-2 duration-200">
              <div className="px-3 py-2.5 border-b border-card-border">
                <p className="text-[9px] font-bold text-muted uppercase leading-none mb-1">Signed in as</p>
                <p className="text-xs font-bold text-foreground truncate">{userName || "User"}</p>
                <p className="text-[10px] text-muted capitalize mt-0.5">{isRecruiter ? "Recruiter" : "Candidate"}</p>
              </div>
              <div className="p-1 mt-1 space-y-0.5">
                <Link
                  href={isRecruiter ? "/dashboard/recruiter/settings" : "/dashboard/candidate/settings"}
                  onClick={() => setDropdownOpen(false)}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-foreground/80 hover:bg-subtle transition-all duration-200"
                >
                  <svg className="h-4 w-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                  Profile
                </Link>
                {onLogout && (
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onLogout();
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50/55 transition-all duration-200 text-left cursor-pointer"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15" />
                    </svg>
                    Sign out
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="h-px w-8 bg-card-border mb-2" />

      {/* Navigation items represented as circle docks */}
      {items.map((item) => {
        const isOverview = item.label === "Overview";
        const active = isOverview
          ? pathname === item.href
          : pathname.startsWith(item.href);

        const hasDot = (item.label === "Negotiations" || item.label === "Candidates");

        return (
          <Link
            key={item.label}
            href={item.href}
            className={`group relative flex h-13 w-13 items-center justify-center rounded-full border transition-all duration-300 shadow-card hover:scale-105 ${
              active
                ? "bg-accent border-accent text-white shadow-md"
                : "border-card-border bg-card text-foreground/80 hover:border-muted/30 hover:bg-subtle"
            }`}
          >
            <svg className="h-5.5 w-5.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
            </svg>

            {/* Slide-out tooltip */}
            <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 rounded-xl border border-card-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-200 transform -translate-x-1 group-hover:translate-x-0 whitespace-nowrap shadow-card z-40">
              {item.label}
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-card-border" />
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-[3px] border-transparent border-r-card mr-[-1px]" />
            </div>

            {hasDot && (
              <span className="absolute top-0.5 right-0.5 block h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-white animate-pulse-subtle" />
            )}

            {item.label === "Matchmaking" && (
              <span className="absolute top-0.5 right-0.5 block h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-white animate-pulse-subtle" />
            )}
          </Link>
        );
      })}
    </aside>
  );
}
