interface BalanceDisplayProps {
  rawBalance: number;
  currentCost: number;
  isStreaming: boolean;
  loading: boolean;
}

export function BalanceDisplay({
  rawBalance,
  currentCost,
  isStreaming,
  loading,
}: BalanceDisplayProps) {
  if (loading) return null;

  // While streaming, subtract the $1 deposit and the accruing cost
  // The deposit is locked in the contract, cost ticks up from it
  const displayed = isStreaming
    ? Math.max(rawBalance - 1.0, 0)
    : rawBalance;

  return (
    <p
      className="text-sm font-mono text-center"
      style={{
        color: "var(--text-tertiary)",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      ${displayed.toFixed(3)}
    </p>
  );
}
