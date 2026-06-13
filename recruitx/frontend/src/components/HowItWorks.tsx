"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import ScrollReveal from "./ui/ScrollReveal";

const steps = [
  {
    step: "01",
    title: "Agents discover each other",
    desc: "Your agent and the recruiter&apos;s agent connect via the A2A protocol. No applications. No forms. Just a structured conversation between two AI representatives.",
  },
  {
    step: "02",
    title: "They negotiate in rounds",
    desc: "Four rounds of structured negotiation: alignment check, deeper qualification, soft signal confirmation, and scheduling.",
  },
  {
    step: "03",
    title: "Skills are verified automatically",
    desc: "Your agent pulls evidence from GitHub and your portfolio. Claims are backed by real data — commit history, project quality, tech stack depth.",
  },
  {
    step: "04",
    title: "Humans only meet when it matters",
    desc: "If fit is confirmed, both scheduler agents check your Google Calendars, book a mutual slot, and send pre-meeting briefs.",
  },
];

function ProtocolFlow() {
  const [activeStep, setActiveStep] = useState(0);
  const [started, setStarted] = useState(false);
  const refId = "howitworks-demo";

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
    if (activeStep >= steps.length) return;
    const t = setTimeout(() => setActiveStep((p) => p + 1), 1200);
    return () => clearTimeout(t);
  }, [activeStep, started]);

  return (
    <div id={refId} className="rounded-2xl border border-card-border bg-white p-6 shadow-card">
      <div className="space-y-1">
        {steps.map((s, i) => (
          <motion.div
            key={s.step}
            initial={{ opacity: 0, x: -10 }}
            animate={{
              opacity: activeStep > i ? 1 : 0.25,
              x: activeStep > i ? 0 : -4,
            }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className={`flex items-start gap-4 rounded-xl p-4 transition-colors ${
              activeStep > i ? "bg-accent/5 border border-accent/10" : ""
            }`}
          >
            <span className={`text-2xl font-bold shrink-0 ${
              activeStep > i ? "text-gradient" : "text-card-border"
            }`}>
              {s.step}
            </span>
            <div>
              <p className={`text-sm font-semibold ${activeStep > i ? "text-foreground" : "text-muted/60"}`}>
                {s.title}
              </p>
              {activeStep > i && (
                <motion.p
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-1 text-xs text-muted leading-relaxed"
                >
                  {s.desc}
                </motion.p>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative overflow-hidden py-24 bg-white">
      <div className="absolute top-1/3 left-0 w-96 h-96 rounded-full bg-accent/3 blur-[140px]" />
      <div className="relative mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <ScrollReveal>
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-accent">The A2A protocol</span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Already there when <span className="text-gradient">you arrive.</span>
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted">
                Open your email, the draft is ready to send. Walk into the call, you&apos;re already briefed.
                Type the question, the answer&apos;s already there. Your agent doesn&apos;t just screen — it learns.
                Every negotiation refines how it represents you.
              </p>
              <a href="#" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-dark transition-colors">
                Explore AI &nbsp;→
              </a>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={0.2} y={20}>
            <ProtocolFlow />
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
