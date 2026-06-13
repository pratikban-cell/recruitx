"use client";
import Link from "next/link";

export default function TopBar({ title }: { title: string }) {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 border-b border-card-border bg-background/80 backdrop-blur-md pl-40 pr-8 select-none z-40 grid grid-cols-3 items-center">
      {/* Column 1: Page Title / Breadcrumb (Centering-friendly) */}
      <div className="flex items-center">
        <h1 className="text-sm font-semibold text-foreground">{title}</h1>
      </div>

      {/* Column 2: Centered Logo + Brand Name (recruitx) */}
      <div className="flex justify-center">
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <img src="/recruit.png" alt="recruitx" className="h-9 w-auto object-contain" />
        </Link>
      </div>

      {/* Column 3: Right controls (Notifications) */}
      <div className="flex items-center justify-end">
        <button className="relative rounded-lg p-2 text-muted hover:bg-subtle hover:text-foreground transition-colors" title="Notifications">
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
            />
          </svg>
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-500 animate-pulse-subtle" />
        </button>
      </div>
    </header>
  );
}

