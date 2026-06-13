"use client";

import ScrollReveal from "./ui/ScrollReveal";

const logos = [
  "Stripe", "Vercel", "Railway", "Supabase", "Linear",
  "Notion", "Figma", "Anthropic", "OpenAI", "GitHub",
];

export default function LogoWall() {
  return (
    <section className="border-b border-card-border bg-background py-16">
      <div className="mx-auto max-w-7xl px-6">
        <ScrollReveal y={10}>
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted/60">
            Trusted by leading engineering teams
          </p>
        </ScrollReveal>
        <ScrollReveal y={10} delay={0.15}>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
            {logos.map((name, i) => (
              <div
                key={name}
                className="text-sm font-semibold text-muted/30 transition-colors hover:text-muted/50"
              >
                {name}
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
