import { motion } from "motion/react";

interface PaymentTickerProps {
  currentCost: number;
  depositDollars: number;
}

export function PaymentTicker({
  currentCost,
  depositDollars,
}: PaymentTickerProps) {
  const pct = Math.min((currentCost / depositDollars) * 100, 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex flex-col items-center gap-3"
    >
      <span
        className="text-4xl font-mono"
        style={{
          color: "var(--text-primary)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        ${currentCost.toFixed(4)}
      </span>

      {/* Deposit usage bar */}
      <div className="w-full max-w-xs mx-auto">
        <div
          className="w-full h-0.5 rounded-full overflow-hidden"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{
              width: `${pct}%`,
              background: "rgba(255,255,255,0.4)",
            }}
            transition={{ duration: 0.1 }}
          />
        </div>
      </div>
    </motion.div>
  );
}
