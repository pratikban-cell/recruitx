"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import ScrollReveal from "./ui/ScrollReveal";

const messages = [
  { text: "Salary: $95k–$110k. Remote: confirmed. Python 3yrs on GitHub verified. Good alignment.", role: "candidate", delay: 500 },
  { text: "We can work in that range. Flag: Glassdoor mentions crunch during a launch — was one-time, not the norm.", role: "recruiter", delay: 2500 },
  { text: "Appreciate the honesty — green flag. Strong mutual fit. Recommend scheduling.", role: "candidate", delay: 4200 },
  { text: "Agreed. Checking calendars now.", role: "recruiter", delay: 5600 },
];

function MiniChat() {
  const [visible, setVisible] = useState<number[]>([]);
  const refId = "twosides-demo";

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
    messages.forEach((msg, i) => {
      setTimeout(() => {
        setVisible((p) => (p.includes(i) ? p : [...p, i]));
      }, msg.delay);
    });
  }, [visible.length > 0]);

  return (
    <div id={refId} className="rounded-2xl border border-card-border bg-white p-6 shadow-card">
      <div className="flex items-center gap-2 border-b border-card-border pb-4 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">Y</div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-gradient text-xs font-bold text-white">R</div>
        <span className="ml-2 text-xs font-medium text-muted">Agent-to-Agent · Live negotiation</span>
      </div>
      <div className="space-y-3 min-h-[180px]">
        {messages.map((msg, i) => {
          if (!visible.includes(i)) return null;
          const isCandidate = msg.role === "candidate";
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className={`flex ${isCandidate ? "justify-start" : "justify-end"}`}
            >
              <div className={`max-w-[90%] rounded-xl p-3 ${
                isCandidate
                  ? "rounded-bl-sm bg-accent/5 border border-accent/10"
                  : "rounded-br-sm bg-background border border-card-border"
              }`}>
                <p className={`text-xs leading-relaxed ${isCandidate ? "text-accent-dark font-medium" : "text-foreground"}`}>
                  {msg.text}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default function TwoSides() {
  return (
    <section className="relative overflow-hidden border-y border-card-border bg-subtle py-24">
      <div className="absolute inset-0 bg-gradient-to-b from-accent/[0.02] via-transparent to-accent-gradient/[0.02]" />
      <div className="relative mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <ScrollReveal>
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-accent">Continuous context</span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Your playbook. Every account. <span className="text-gradient">Every signal.</span>
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted">
                Sales, success, finance, and every agent in the company — all running on the same live picture
                of the customer. Two sides of the same marketplace, each with an AI agent that knows their
                preferences, dealbreakers, and priorities — and negotiates autonomously.
              </p>
              <a href="#" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-dark transition-colors">
                Explore data &nbsp;→
              </a>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={0.2} y={20}>
            <MiniChat />
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
