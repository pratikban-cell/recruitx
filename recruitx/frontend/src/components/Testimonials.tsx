"use client";

import { motion } from "framer-motion";
import AnimatedText from "./ui/AnimatedText";
import ScrollReveal from "./ui/ScrollReveal";

const testimonials = [
  {
    quote: "I set up my recruitx profile on Sunday evening. By Monday morning, my agent had reviewed 23 companies, rejected 19 as poor fits, negotiated with 4, and booked me three interviews. I did nothing.",
    author: "Rahul K.",
    role: "Senior Frontend Engineer",
    type: "Candidate",
  },
  {
    quote: "We posted a role and got 500+ applicants in 48 hours. recruitx's agent screened all of them overnight, surfaced 12 genuine matches, and started negotiations before I even had coffee. That's not efficiency — that's a superpower.",
    author: "Sarah Chen",
    role: "CTO at a Series A startup",
    type: "Recruiter",
  },
  {
    quote: "The transparency layer alone is worth it. I've been ghosted by more companies than I can count. recruitx tells me exactly why — salary band mismatch, culture flag, whatever — and I can adjust and move on immediately.",
    author: "James M.",
    role: "Full-Stack Developer",
    type: "Candidate",
  },
];

export default function Testimonials() {
  return (
    <section className="relative overflow-hidden border-y border-card-border py-24">
      <div className="absolute inset-0 bg-gradient-to-b from-accent/2 via-transparent to-accent-gradient/2" />
      <div className="relative mx-auto max-w-7xl px-6">
        <ScrollReveal>
          <div className="mb-16 max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-widest text-accent">Testimonials</span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              The <span className="text-gradient">Sunday evening</span> setup
            </h2>
            <p className="mt-4 text-muted">
              Set up your profile once. Wake up to a full brief of what your agent accomplished.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((item, i) => (
            <motion.div
              key={item.author}
              initial={{ opacity: 0, y: 40, filter: "blur(4px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="group flex flex-col rounded-2xl border border-card-border bg-card p-8 transition-all duration-500 hover:border-accent/20 hover:shadow-lg hover:shadow-accent/5"
            >
              <span className={`mb-4 inline-block rounded-full border px-3 py-0.5 text-xs font-medium ${
                item.type === "Candidate"
                  ? "border-accent/20 bg-accent/5 text-accent"
                  : "border-accent-gradient/20 bg-accent-gradient/5 text-accent-gradient"
              }`}>
                {item.type}
              </span>

              <div className="mb-6 flex-1 text-sm leading-relaxed text-muted">
                &ldquo;{item.quote}&rdquo;
              </div>

              <div className="mt-auto border-t border-card-border pt-4">
                <p className="text-sm font-semibold text-foreground">{item.author}</p>
                <p className="text-xs text-muted">{item.role}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
