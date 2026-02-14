import { useState } from "react";
import { Input } from "./Input";
import { LiquidGlassButton } from "./LiquidGlassButton";
import { Modal } from "./Modal";

interface SendModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientAddress: string;
  onRecipientChange: (value: string) => void;
  amount: string;
  onAmountChange: (value: string) => void;
  memo: string;
  onMemoChange: (value: string) => void;
  onConfirm: () => void;
  isSending?: boolean;
  error?: string | null;
  txHash?: string | null;
}

export function SendModal({
  isOpen,
  onClose,
  recipientAddress,
  onRecipientChange,
  amount,
  onAmountChange,
  memo,
  onMemoChange,
  onConfirm,
  isSending = false,
  error = null,
  txHash = null,
}: SendModalProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    if (txHash) {
      navigator.clipboard.writeText(txHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Send USDC">
      <div className="space-y-6">
        {txHash ? (
          <div className="text-center space-y-4">
            <div
              className="w-16 h-16 mx-auto rounded-full flex items-center justify-center"
              style={{
                background: "var(--accent-success)",
                border: "1px solid var(--accent-success-solid)",
              }}
            >
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="var(--accent-success-solid)"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-sm" style={{ color: "var(--text-primary)" }}>
              Transaction sent successfully!
            </p>
            <div className="flex items-center justify-center gap-2">
              <a
                href={`https://explore.tempo.xyz/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono break-all hover:underline cursor-pointer"
                style={{ color: "var(--text-secondary)" }}
              >
                {txHash}
              </a>
              <button
                onClick={copyToClipboard}
                className="flex-shrink-0 p-1 rounded hover:bg-white/10 transition-colors"
                title={copied ? "Copied!" : "Copy to clipboard"}
              >
                {copied ? (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="var(--accent-success-solid)"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="var(--text-secondary)"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                )}
              </button>
            </div>
            <LiquidGlassButton
              onClick={onClose}
              fullWidth
              className="py-3 text-sm mt-4"
            >
              <span className="uppercase tracking-wider">Done</span>
            </LiquidGlassButton>
          </div>
        ) : error ? (
          <div className="text-center space-y-4">
            <div
              className="w-16 h-16 mx-auto rounded-full flex items-center justify-center"
              style={{
                background: "rgba(239, 68, 68, 0.2)",
                border: "1px solid rgba(239, 68, 68, 0.5)",
              }}
            >
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="#ef4444"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <p className="text-sm" style={{ color: "var(--text-primary)" }}>
              Transaction failed
            </p>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {error}
            </p>
            <LiquidGlassButton
              onClick={onClose}
              fullWidth
              className="py-3 text-sm mt-4"
            >
              <span className="uppercase tracking-wider">Close</span>
            </LiquidGlassButton>
          </div>
        ) : (
          <>
            <Input
              label="Recipient"
              value={recipientAddress}
              onChange={onRecipientChange}
              placeholder="Email, phone, or 0x..."
              onEnter={onConfirm}
            />
            <Input
              label="Amount"
              type="number"
              value={amount}
              onChange={onAmountChange}
              placeholder="0.00"
              onEnter={onConfirm}
            />
            <Input
              label="Memo (Optional)"
              value={memo}
              onChange={onMemoChange}
              placeholder="Add a note for this transaction"
              onEnter={onConfirm}
            />
            <LiquidGlassButton
              onClick={onConfirm}
              fullWidth
              className="py-3 text-sm"
            >
              {isSending ? (
                <span className="uppercase tracking-wider">Sending...</span>
              ) : (
                <span className="uppercase tracking-wider">Confirm Send</span>
              )}
            </LiquidGlassButton>
          </>
        )}
      </div>
    </Modal>
  );
}
