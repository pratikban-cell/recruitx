"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import ScrollReveal from "./ui/ScrollReveal";

const rows = [
  { scenario: "Dealbreaker — location", candidate: "Stripe passed: hybrid requirement, your dealbreaker is fully remote.", recruiter: "Candidate passed: requires fully remote, your policy is hybrid." },
  { scenario: "Dealbreaker — salary", candidate: "Google passed: your floor is $80k, their ceiling is $72k.", recruiter: "Candidate passed: salary expectations above our band." },
  { scenario: "Dealbreaker — culture", candidate: "Company passed: Glassdoor 2.8 triggers your 3.0 floor.", recruiter: "Candidate passed: Glassdoor signal flagged as risk." },
];

function TransparencyTable() {
  const [visible, setVisible] = useState<number[]>([]);
  const refId = "transparency-demo";

  useEffect(() => {
    const el = document.getElementById(refId);
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible([0]); obs.disconnect(); } },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (visible.length === 0) return;
    rows.forEach((_, i) => {
      setTimeout(() => setVisible((p) => (p.includes(i + 1) ? p : [...p, i + 1])), 800 + i * 600);
    });
  }, [visible.length > 0]);

  return (
    <div id={refId} className="rounded-2xl border border-card-border bg-white shadow-card overflow-hidden">
      <div className="grid grid-cols-3 gap-px bg-card-border/60">
        <div className="bg-accent/5 p-3 md:p-4">
          <span className="text-xs font-semibold text-accent uppercase tracking-wider">Situation</span>
        </div>
        <div className="bg-accent/5 p-3 md:p-4">
          <span className="text-xs font-semibold text-accent uppercase tracking-wider">Candidate sees</span>
        </div>
        <div className="bg-accent/5 p-3 md:p-4">
          <span className="text-xs font-semibold text-accent uppercase tracking-wider">Recruiter sees</span>
        </div>
      </div>
      {rows.map((row, i) => (
        <motion.div
          key={row.scenario}
          initial={{ opacity: 0, y: 8 }}
          animate={{
            opacity: visible.includes(i + 1) ? 1 : 0.3,
            y: visible.includes(i + 1) ? 0 : 4,
          }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-3 gap-px bg-card-border/60"
        >
          <div className={`bg-white p-3 md:p-4 ${i % 2 === 0 ? "" : "bg-background/30"}`}>
            <span className="text-sm font-medium text-foreground">{row.scenario}</span>
          </div>
          <div className={`bg-white p-3 md:p-4 ${i % 2 === 0 ? "" : "bg-background/30"}`}>
            <p className="text-sm text-muted">{row.candidate}</p>
          </div>
          <div className={`bg-white p-3 md:p-4 ${i % 2 === 0 ? "" : "bg-background/30"}`}>
            <p className="text-sm text-muted">{row.recruiter}</p>
          </div>
        </motion.div>
      ))}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: visible.includes(rows.length) ? 1 : 0 }}
        transition={{ delay: 0.3 }}
        className="bg-accent/5 border-t border-card-border/60 p-4 text-center"
      >
        <span className="text-sm font-semibold text-accent-dark">
          No black holes. No ghosting. Just honest, agent-mediated clarity.
        </span>
      </motion.div>
    </div>
  );
}

export default function TransparencyLayer() {
  return (
    <section className="relative overflow-hidden border-y border-card-border bg-subtle py-24">
      <div className="absolute inset-0 bg-gradient-to-b from-accent/[0.02] via-transparent to-accent-gradient/[0.02]" />
      <div className="relative mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <ScrollReveal>
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-accent">Transparency</span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Nobody gets ghosted. <span className="text-gradient">Every exit has a reason.</span>
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted">
                This is the feature that makes recruitx fundamentally different from every existing platform.
                Both sides always know why. Every dealbreaker, every exit — transparent to both agents in real time.
              </p>
              <a href="#" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-dark transition-colors">
                Learn how it works &nbsp;→
              </a>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={0.2} y={20}>
            <TransparencyTable />
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
