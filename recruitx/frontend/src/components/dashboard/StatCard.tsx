"use client";

import { motion } from "framer-motion";

interface StatCardProps {
  label: string;
  value: string;
  change: string;
  positive: boolean;
  icon: string;
  delay?: number;
}

export default function StatCard({ label, value, change, positive, icon, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      whileHover={{ 
        y: -4, 
        scale: 1.015,
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)"
      }}
      className="group relative overflow-hidden rounded-xl border border-card-border bg-white p-6 transition-all duration-300 hover:border-accent/30"
    >
      {/* Decorative top-right accent glow on hover */}
      <div className="absolute -top-12 -right-12 h-24 w-24 rounded-full bg-accent/5 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100" />
      
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent transition-transform duration-300 group-hover:scale-110">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
          positive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
        }`}>
          {positive ? (
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
            </svg>
          ) : (
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          )}
          {change}
        </span>
      </div>
      
      <div className="relative mt-4">
        <p className="text-3xl font-bold tracking-tight text-foreground transition-transform duration-300 group-hover:translate-x-0.5">
          {value}
        </p>
        <p className="mt-1 text-xs font-semibold text-muted tracking-wide uppercase">
          {label}
        </p>
      </div>
    </motion.div>
  );
}
