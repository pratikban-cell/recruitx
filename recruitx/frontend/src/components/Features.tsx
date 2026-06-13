"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import ScrollReveal from "./ui/ScrollReveal";

const items = [
  { label: "Skill verification", done: true, detail: "GitHub commits, repo quality, tech stack verified" },
  { label: "Salary alignment", done: true, detail: "Within negotiated band: $95k–$110k" },
  { label: "Culture check", done: true, detail: "Glassdoor signal cleared — temporary crunch, not systemic" },
  { label: "Calendar sync", done: false, detail: "Google Calendar MCP querying mutual slots..." },
  { label: "Pre-brief generated", done: false, detail: "Waiting for calendar confirmation" },
];

function FeatureChecklist() {
  const [started, setStarted] = useState(false);
  const [doneItems, setDoneItems] = useState<number[]>([]);
  const [progress, setProgress] = useState(0);
  const refId = "features-demo";

  useEffect(() => {
    const el = document.getElementById(refId);
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setStarted(true); obs.disconnect(); } },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    items.forEach((item, i) => {
      setTimeout(() => {
        setDoneItems((p) => [...p, i]);
        setProgress(((i + 1) / items.length) * 100);
      }, 600 + i * 900);
    });
  }, [started]);

  return (
    <div id={refId} className="rounded-2xl border border-card-border bg-white p-6 shadow-card">
      <div className="flex items-center justify-between mb-5">
        <span className="text-xs font-semibold text-muted/70 uppercase tracking-wider">Agent dashboard</span>
        <motion.span
          animate={{ opacity: started ? 1 : 0 }}
          className="text-xs text-accent font-medium"
        >
          {Math.round(progress)}% complete
        </motion.span>
      </div>
      <div className="mb-5 h-2 overflow-hidden rounded-full bg-card-border/60">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="h-full rounded-full bg-gradient-to-r from-accent to-accent-gradient"
        />
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, x: -8 }}
            animate={{
              opacity: doneItems.includes(i) ? 1 : 0.4,
              x: doneItems.includes(i) ? 0 : -4,
            }}
            transition={{ duration: 0.3 }}
            className={`flex items-start gap-3 rounded-lg p-3 transition-colors ${
              doneItems.includes(i) ? "bg-accent/5" : ""
            }`}
          >
            <div className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${
              doneItems.includes(i)
                ? "border-accent bg-accent"
                : "border-card-border"
            }`}>
              {doneItems.includes(i) && (
                <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
            </div>
            <div>
              <p className={`text-sm font-medium ${doneItems.includes(i) ? "text-foreground" : "text-muted/60"}`}>
                {item.label}
              </p>
              {doneItems.includes(i) && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-[11px] text-muted mt-0.5"
                >
                  {item.detail}
                </motion.p>
              )}
            </div>
          </motion.div>
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: doneItems.length === items.length ? 1 : 0, y: doneItems.length === items.length ? 0 : 8 }}
        transition={{ delay: 0.3 }}
        className="mt-4 rounded-lg bg-accent/10 border border-accent/15 px-3 py-2 flex items-center gap-2"
      >
        <svg className="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
        <span className="text-xs font-semibold text-accent-dark">Meeting booked · Pre-brief sent</span>
      </motion.div>
    </div>
  );
}

export default function Features() {
  return (
    <section id="platform" className="relative overflow-hidden py-24 bg-white">
      <div className="absolute top-1/2 right-0 w-80 h-80 rounded-full bg-accent-gradient/3 blur-[120px]" />
      <div className="relative mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <ScrollReveal>
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-accent">Platform</span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Everything your agent needs to <span className="text-gradient">represent you.</span>
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted">
                From the next forecast to the last cohort, get your business answers in seconds.
                Skill verification that agents trust, live negotiation feed, calendar and email automation,
                pre-meeting briefs, and agent learning that compounds over time.
              </p>
              <a href="#" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-dark transition-colors">
                Explore reporting &nbsp;→
              </a>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={0.2} y={20}>
            <FeatureChecklist />
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
