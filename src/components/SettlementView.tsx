import { motion } from "motion/react";
import { LiquidGlassButton } from "./LiquidGlassButton";

interface SettlementViewProps {
  payment: number;
  artistName: string;
  explorerLink: string | null;
  onDone: () => void;
}

export function SettlementView({
  payment,
  artistName,
  explorerLink,
  onDone,
}: SettlementViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="flex flex-col items-center gap-5"
    >
      <p
        className="text-lg font-light text-center"
        style={{ color: "var(--text-primary)" }}
      >
        Sent ${payment.toFixed(3)} to {artistName}
      </p>

      {explorerLink && (
        <a
          href={explorerLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs underline underline-offset-4 transition-colors hover:text-white/80"
          style={{ color: "var(--text-tertiary)" }}
        >
          View receipt
        </a>
      )}

      <LiquidGlassButton onClick={onDone} className="px-10 py-3">
        <span className="text-sm uppercase tracking-wider">Done</span>
      </LiquidGlassButton>
    </motion.div>
  );
}
