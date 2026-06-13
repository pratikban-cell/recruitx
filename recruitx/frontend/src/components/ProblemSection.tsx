"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import ScrollReveal from "./ui/ScrollReveal";

function ComparisonBar({ label, width, color, delay = 0 }: { label: string; width: string; color: string; delay?: number }) {
  return (
    <div className="flex items-center gap-4">
      <span className="w-24 text-xs text-muted shrink-0">{label}</span>
      <div className="flex-1 h-6 rounded-md bg-card-border/40 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width }}
          transition={{ duration: 1.2, delay, ease: [0.16, 1, 0.3, 1] }}
          className={`h-full rounded-md ${color}`}
        />
      </div>
    </div>
  );
}

function BeforeAfterCards() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = document.getElementById("problem-demo");
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div id="problem-demo" className="rounded-2xl border border-card-border bg-white p-6 shadow-card">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="text-xs font-semibold text-muted/70 uppercase tracking-wider">Traditional</span>
          </div>
          <ComparisonBar label="Relevant" width={visible ? "22%" : "0%"} color="bg-red-400/60" />
          <ComparisonBar label="Response" width={visible ? "8%" : "0%"} color="bg-red-400/40" />
          <ComparisonBar label="Time saved" width={visible ? "5%" : "0%"} color="bg-red-400/30" />
          {visible && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.5 }}
              className="mt-2 rounded-lg border border-red-200 bg-red-50/50 p-2.5"
            >
              <p className="text-[11px] text-red-700 font-medium">600 resumes, weeks of screening, 90% irrelevant</p>
            </motion.div>
          )}
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-accent" />
            <span className="text-xs font-semibold text-muted/70 uppercase tracking-wider">recruitx</span>
          </div>
          <ComparisonBar label="Relevant" width={visible ? "94%" : "0%"} color="bg-accent/60" delay={0.3} />
          <ComparisonBar label="Response" width={visible ? "88%" : "0%"} color="bg-accent/40" delay={0.5} />
          <ComparisonBar label="Time saved" width={visible ? "92%" : "0%"} color="bg-accent/30" delay={0.7} />
          {visible && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.7 }}
              className="mt-2 rounded-lg border border-accent/20 bg-accent/5 p-2.5"
            >
              <p className="text-[11px] text-accent-dark font-medium">3 genuine matches, same night, booked by morning</p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProblemSection() {
  return (
    <section className="relative overflow-hidden border-y border-card-border bg-subtle py-24">
      <div className="absolute inset-0 bg-gradient-to-b from-accent/[0.02] via-transparent to-accent-gradient/[0.02]" />
      <div className="relative mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <ScrollReveal>
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-accent">Hiring agents at your command</span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                The intelligent system that <span className="text-gradient">never sleeps.</span>
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted">
                Finds top talent at 2am. Connects with candidates before they sign elsewhere. Hands you the shortlist before you log in.
                Every developer knows the feeling: 150 applications sent, 4 responses, zero feedback.
                Every recruiter knows the opposite: 600 resumes, 90% irrelevant, no way to tell what&apos;s real.
              </p>
              <a href="#" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-dark transition-colors">
                Explore agents &nbsp;→
              </a>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={0.2} y={20}>
            <BeforeAfterCards />
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
