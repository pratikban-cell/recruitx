"use client";

import { motion } from "framer-motion";

export default function CtaSection() {
  return (
    <section className="relative overflow-hidden py-24 bg-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 -top-32 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-accent/5 blur-[120px]" />
      </div>
      <div className="relative mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Hire smarter. <span className="text-gradient">Apply once.</span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted max-w-lg mx-auto">
            Start for free. Set up your profile in 10 minutes. Let your agent do the work
            while you focus on what matters.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="/auth"
              className="group relative overflow-hidden rounded-lg bg-foreground px-8 py-3 text-sm font-semibold text-white transition-all hover:scale-105 shadow-lg hover:shadow-xl shadow-black/10"
            >
              <span className="relative z-10">Start for free</span>
              <span className="absolute inset-0 bg-gradient-to-r from-accent to-accent-gradient opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            </a>
            <a
              href="#"
              className="rounded-lg border border-card-border bg-white/60 backdrop-blur-sm px-8 py-3 text-sm font-semibold text-foreground transition-all hover:border-accent/30 hover:bg-accent/5 hover:shadow-md"
            >
              Talk to sales
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
