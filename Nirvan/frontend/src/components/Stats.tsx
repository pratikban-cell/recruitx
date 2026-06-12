"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

function Counter({ value, suffix = "" }: { value: string; suffix?: string }) {
  const num = parseInt(value.replace(/[^0-9.]/g, ""));
  const isNum = !isNaN(num);
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !isNum) return;
    const duration = 2000;
    const steps = 60;
    const stepTime = duration / steps;
    let current = 0;
    const timer = setInterval(() => {
      current++;
      const progress = current / steps;
      // Exponential ease-out
      const eased = 1 - Math.pow(1 - progress, 4);
      setCount(Math.round(eased * num));
      if (current >= steps) {
        clearInterval(timer);
      }
    }, stepTime);
    return () => clearInterval(timer);
  }, [visible, num, isNum]);

  return (
    <span ref={ref}>
      {isNum ? `${count}${suffix}` : value}
    </span>
  );
}

const stats = [
  { value: "97%", suffix: "%", label: "Irrelevant applications filtered", sub: "before a human ever sees them" },
  { value: "5x", suffix: "x", label: "Faster time-to-match", sub: "vs traditional screening pipelines" },
  { value: "200+", suffix: "+", label: "Applications reduced to 3–5", sub: "genuine, verified matches per candidate" },
  { value: "0", suffix: "", label: "Ghosted outcomes", sub: "every exit has a clear, transparent reason" },
];

export default function Stats() {
  return (
    <section className="relative overflow-hidden bg-slate-50 py-24 md:py-32">
      {/* Decorative backdrop blobs */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 h-96 w-96 rounded-full bg-accent/5 blur-3xl" />
      <div className="absolute top-1/3 right-1/4 -translate-y-1/2 h-80 w-80 rounded-full bg-accent-gradient/5 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-3xl text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
            className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
          >
            Efficiency engineered into every match
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-4 text-base text-slate-500 max-w-xl mx-auto"
          >
            Say goodbye to endless resume parsing and ghosting. Our automated negotiator agents drive recruitment efficiency to unmatched heights.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: "easeOut" }}
              whileHover={{ y: -6, scale: 1.02 }}
              className="relative rounded-2xl border border-slate-200/60 bg-white/70 p-8 shadow-sm backdrop-blur-sm transition-all duration-300 hover:shadow-md hover:border-accent/20"
            >
              <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-accent to-accent-gradient rounded-t-2xl opacity-0 transition-opacity duration-300 hover:opacity-100 group-hover:opacity-100" />
              
              <div className="text-center">
                <p className="text-4xl font-extrabold tracking-tight text-gradient sm:text-5xl">
                  <Counter value={stat.value} suffix={stat.suffix} />
                </p>
                <p className="mt-4 text-sm font-semibold text-slate-800 leading-snug">
                  {stat.label}
                </p>
                <p className="mt-2 text-xs text-slate-400 font-medium">
                  {stat.sub}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
