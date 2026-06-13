"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface StaggerCardsProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export default function StaggerCards({
  children,
  className = "",
  delay = 0,
}: StaggerCardsProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: 0.08, delayChildren: delay },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerCard({
  children,
  className = "",
  index = 0,
}: {
  children: ReactNode;
  className?: string;
  index?: number;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 40, scale: 0.95, filter: "blur(2px)" },
        visible: {
          opacity: 1,
          y: 0,
          scale: 1,
          filter: "blur(0px)",
          transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
        },
      }}
      whileHover={{ y: -4, transition: { duration: 0.3 } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
