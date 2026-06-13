"use client";

import { motion } from "framer-motion";
import ScrollReveal from "./ui/ScrollReveal";

const plans = [
  {
    name: "Starter",
    price: "Free",
    period: "forever",
    desc: "For individual job seekers testing the waters with AI-driven applications.",
    features: [
      "1 active agent",
      "Basic skill verification (GitHub)",
      "Up to 5 applications/month",
      "Negotiation dashboard",
      "Community support",
    ],
    cta: "Start for free",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    desc: "For serious candidates and growing teams who want full A2A negotiation power.",
    features: [
      "Unlimited agents",
      "Advanced skill verification (GitHub + portfolio)",
      "Unlimited applications",
      "Live negotiation feed",
      "Calendar + email automation",
      "Pre-meeting briefs",
      "Priority support",
    ],
    cta: "Start free trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    desc: "For companies running high-volume hiring with custom integration needs.",
    features: [
      "Dedicated agent cluster",
      "Custom verification pipelines",
      "API access + webhooks",
      "SSO / SAML",
      "Audit logs",
      "Custom data residency",
      "Dedicated account manager",
      "SLA guarantee",
    ],
    cta: "Talk to sales",
    highlighted: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="relative overflow-hidden py-24 bg-subtle border-y border-card-border">
      <div className="mx-auto max-w-7xl px-6">
        <ScrollReveal>
          <div className="mx-auto max-w-2xl text-center mb-16">
            <span className="text-xs font-semibold uppercase tracking-widest text-accent">Pricing</span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Simple, transparent pricing. <span className="text-gradient">No hidden fees.</span>
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted">
              Start free. Upgrade when your hiring scales.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid gap-8 lg:grid-cols-3">
          {plans.map((plan, i) => (
            <ScrollReveal key={plan.name} delay={i * 0.1} y={15}>
              <motion.div
                whileHover={{ y: -4 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className={`relative rounded-2xl border p-8 transition-shadow ${
                  plan.highlighted
                    ? "border-accent/30 bg-white shadow-lg shadow-accent/5"
                    : "border-card-border bg-white shadow-card hover:shadow-card-hover"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-4 py-1">
                    <span className="text-[11px] font-semibold text-white uppercase tracking-wider">Most popular</span>
                  </div>
                )}
                <div className={`${plan.highlighted ? "mt-4" : ""}`}>
                  <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                    {plan.period && <span className="text-sm text-muted">{plan.period}</span>}
                  </div>
                  <p className="mt-2 text-sm text-muted">{plan.desc}</p>
                </div>
                <ul className="mt-8 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-muted">
                      <svg className="mt-0.5 h-4 w-4 shrink-0 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href="#"
                  className={`mt-8 flex w-full items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold transition-all ${
                    plan.highlighted
                      ? "bg-foreground text-white hover:bg-foreground/90 hover:scale-[1.02] shadow-md"
                      : "border border-card-border bg-white text-foreground hover:border-accent/30 hover:bg-accent/5"
                  }`}
                >
                  {plan.cta}
                </a>
              </motion.div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
