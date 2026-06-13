"use client";

import { motion } from "framer-motion";

interface AnimatedTextProps {
  text: string;
  as?: "h1" | "h2" | "h3" | "p" | "span";
  className?: string;
  delay?: number;
  once?: boolean;
  gradient?: boolean;
}

export default function AnimatedText({
  text,
  as: Tag = "p",
  className = "",
  delay = 0,
  once = true,
  gradient = false,
}: AnimatedTextProps) {
  const words = text.split(" ");

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: "-80px" }}
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: 0.03, delayChildren: delay },
        },
      }}
      className={className}
    >
      <Tag className={`inline ${gradient ? "text-gradient" : ""}`}>
        {words.map((word, i) => (
          <motion.span
            key={i}
            variants={{
              hidden: { opacity: 0, y: 30, rotateX: -60, filter: "blur(4px)" },
              visible: {
                opacity: 1,
                y: 0,
                rotateX: 0,
                filter: "blur(0px)",
                transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
              },
            }}
            className="inline-block"
          >
            {word}
            {i < words.length - 1 && "\u00A0"}
          </motion.span>
        ))}
      </Tag>
    </motion.div>
  );
}
