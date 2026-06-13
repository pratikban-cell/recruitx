import Link from "next/link";

const sections = [
  {
    title: "Platform",
    links: ["How it works", "Features", "Pricing", "Documentation", "API"],
  },
  {
    title: "Company",
    links: ["About", "Blog", "Careers", "Contact", "Press"],
  },
  {
    title: "Resources",
    links: ["Help Center", "Community", "Status", "Changelog", "GitHub"],
  },
  {
    title: "Compare",
    links: ["vs LinkedIn", "vs Wellfound", "vs Greenhouse", "vs Lever", "vs Traditional hiring"],
  },
];

export default function Footer() {
  return (
    <footer className="relative border-t border-card-border bg-white py-16">
      <div className="absolute inset-0 bg-gradient-to-b from-accent/[0.01] via-transparent to-transparent" />
      <div className="relative mx-auto max-w-7xl px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <Link href="/" className="group flex items-center gap-2">
              <img src="/recruit.png" alt="recruitx" className="h-9 w-auto object-contain" />
            </Link>
            <p className="mt-4 text-sm text-muted max-w-xs">
              Agent-to-Agent hiring for the tech industry. Where agents negotiate, so humans only meet when it matters.
            </p>
          </div>
          {sections.map((section) => (
            <div key={section.title}>
              <h4 className="mb-4 text-sm font-semibold text-foreground">{section.title}</h4>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-muted transition-colors hover:text-accent">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-16 border-t border-card-border/60 pt-8 text-center text-xs text-muted">
          &copy; {new Date().getFullYear()} recruitx. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
