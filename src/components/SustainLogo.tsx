import { motion } from "motion/react";

export function SustainLogo() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="fixed top-4 left-4 z-20"
    >
      <span
        className="text-sm font-bold italic tracking-wide"
        style={{ color: "var(--text-primary)" }}
      >
        SUSTAIN
      </span>
    </motion.div>
  );
}
