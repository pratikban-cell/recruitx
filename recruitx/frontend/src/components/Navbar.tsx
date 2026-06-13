"use client";

import Link from "next/link";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { useState } from "react";

const links = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Platform", href: "#platform" },
  { label: "Pricing", href: "#pricing" },
  { label: "Docs", href: "#" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 40);
  });

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? "glass" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 group">
          <img src="/recruit.png" alt="recruitx" className="h-9 w-auto object-contain" />
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="relative text-sm text-muted transition-colors hover:text-foreground after:absolute after:-bottom-1 after:left-0 after:h-[2px] after:w-0 after:bg-accent after:transition-all after:duration-300 hover:after:w-full"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-4 md:flex">
            <a href="/auth" className="text-sm text-muted transition-colors hover:text-foreground">
            Sign in
          </a>
          <a
            href="/auth"
            className="group relative overflow-hidden rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-foreground/90 hover:scale-105 shadow-sm"
          >
            <span className="relative z-10">Start for free</span>
            <span className="absolute inset-0 bg-gradient-to-r from-accent to-accent-gradient opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </a>
        </div>

        <button onClick={() => setOpen(!open)} className="flex flex-col gap-1.5 md:hidden" aria-label="Menu">
          <span className={`block h-0.5 w-6 bg-foreground transition-all ${open ? "rotate-45 translate-y-2" : ""}`} />
          <span className={`block h-0.5 w-6 bg-foreground transition-all ${open ? "opacity-0" : ""}`} />
          <span className={`block h-0.5 w-6 bg-foreground transition-all ${open ? "-rotate-45 -translate-y-2" : ""}`} />
        </button>
      </div>

      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="glass px-6 py-4 md:hidden"
        >
          <div className="flex flex-col gap-4">
            {links.map((l) => (
              <a key={l.label} href={l.href} className="text-sm text-muted">{l.label}</a>
            ))}
            <a href="/auth" className="text-sm text-muted">Sign in</a>
            <a href="/auth" className="rounded-lg bg-foreground px-4 py-2 text-center text-sm font-medium text-white">
              Start for free
            </a>
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
}
