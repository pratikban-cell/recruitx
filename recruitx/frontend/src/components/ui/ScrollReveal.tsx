"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  y?: number;
  blur?: boolean;
  scale?: boolean;
}

export default function ScrollReveal({
  children,
  delay = 0,
  className = "",
  y = 30,
  blur = false,
  scale = false,
}: ScrollRevealProps) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y,
        scale: scale ? 0.95 : 1,
        filter: blur ? "blur(4px)" : "blur(0px)",
      }}
      whileInView={{
        opacity: 1,
        y: 0,
        scale: 1,
        filter: "blur(0px)",
      }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
