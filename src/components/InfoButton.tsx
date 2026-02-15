import { motion } from "motion/react";
import Link from "next/link";

export function InfoButton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-20"
    >
      <Link
        href="/about"
        className="flex items-center justify-center w-8 h-8 rounded-full backdrop-blur-xl border transition-colors hover:bg-white/10"
        style={{
          background: "rgba(255, 255, 255, 0.025)",
          borderColor: "rgba(255, 255, 255, 0.15)",
          color: "var(--text-secondary)",
        }}
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 16.5V12m0-3.5h.01M12 2a10 10 0 100 20 10 10 0 000-20z"
          />
        </svg>
      </Link>
    </motion.div>
  );
}
