"use client";

import {
  AlbumArt,
  AudioPlayer,
  BalanceDisplay,
  LoginView,
  PaymentTicker,
  PoweredByTempo,
  SustainButton,
  SustainLogo,
  TrackInfo,
  UserPill,
  WalletContainer,
} from "@/components";
import { useBalance } from "@/hooks/useBalance";
import { useStream } from "@/hooks/useStream";
import { useTrack } from "@/hooks/useTrack";
import { usePrivy } from "@privy-io/react-auth";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

export default function Home() {
  const { ready, authenticated, login, user } = usePrivy();
  const walletAddress = user?.wallet?.address || "";
  const { rawBalance, loading: balanceLoading, refetch: refetchBalance } = useBalance(walletAddress);
  const { track, loading: trackLoading } = useTrack();

  const {
    phase,
    currentCost,
    payment,
    error,
    settling,
    explorerLink,
    handlePointerDown,
    handlePointerUp,
    resetToIdle,
  } = useStream(track.walletAddress);

  // Track last settlement info — persists until next press
  const [lastPayment, setLastPayment] = useState<number | null>(null);
  const [lastExplorerLink, setLastExplorerLink] = useState<string | null>(null);

  // Auto-reset to idle after settlement, save the payment info
  const prevPhaseRef = useRef(phase);
  useEffect(() => {
    if (prevPhaseRef.current === "active" && phase === "settled") {
      refetchBalance();
      if (payment !== null) setLastPayment(payment);
      if (explorerLink) setLastExplorerLink(explorerLink);
      resetToIdle();
    }
    prevPhaseRef.current = phase;
  }, [phase, payment, explorerLink, refetchBalance, resetToIdle]);

  // Update last payment/link as they come in from on-chain (even after reset)
  useEffect(() => {
    if (payment !== null && phase === "idle" && lastPayment !== null) {
      setLastPayment(payment);
    }
  }, [payment, phase, lastPayment]);

  useEffect(() => {
    if (explorerLink && phase === "idle" && lastExplorerLink !== null) {
      setLastExplorerLink(explorerLink);
    }
  }, [explorerLink, phase, lastExplorerLink]);

  // Clear last settlement when user presses sustain again
  const onPointerDown = useCallback(() => {
    setLastPayment(null);
    setLastExplorerLink(null);
    handlePointerDown();
  }, [handlePointerDown]);

  const showTicker = phase === "active";
  const showLastPayment = phase === "idle" && lastPayment !== null;

  return (
    <>
      <AnimatePresence>
        {ready && !authenticated && <LoginView onLogin={login} />}
      </AnimatePresence>

      <AnimatePresence>
        {authenticated && (
          <>
            <SustainLogo />
            <UserPill />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="relative z-10 w-full min-h-screen"
            >
              <WalletContainer>
                <div className="flex flex-col items-center gap-6 pt-16 pb-8">
                  <BalanceDisplay
                    rawBalance={rawBalance}
                    currentCost={currentCost}
                    isStreaming={phase === "active"}
                    loading={balanceLoading}
                  />

                  {!trackLoading && (
                    <>
                      <AlbumArt
                        imageUrl={track.imageUrl}
                        active={phase === "active"}
                      />

                      <TrackInfo title={track.title} artist={track.artist} />

                      <AudioPlayer src={track.audioUrl} />
                    </>
                  )}

                  <div className="relative w-full max-w-xs mx-auto mt-16">
                    <AnimatePresence>
                      {showTicker && (
                        <motion.div
                          key="ticker"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="absolute bottom-full left-0 right-0 mb-4"
                        >
                          <PaymentTicker
                            currentCost={currentCost}
                            depositDollars={1.0}
                          />
                        </motion.div>
                      )}
                      {showLastPayment && (
                        <motion.div
                          key="last-payment"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="absolute bottom-full left-0 right-0 mb-4 flex flex-col items-center gap-2"
                        >
                          <p
                            className="text-sm font-light"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            Sent ${lastPayment.toFixed(3)} to {track.artist}
                          </p>
                          {lastExplorerLink && (
                            <a
                              href={lastExplorerLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs underline underline-offset-4 transition-colors hover:text-white/80"
                              style={{ color: "var(--text-tertiary)" }}
                            >
                              View receipt
                            </a>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <SustainButton
                      phase={phase}
                      settling={settling}
                      onPointerDown={onPointerDown}
                      onPointerUp={handlePointerUp}
                    />
                  </div>

                  {error && (
                    <p
                      className="text-xs text-center max-w-xs"
                      style={{ color: "rgba(255,100,100,0.8)" }}
                    >
                      {error}
                    </p>
                  )}

                  <div className="mt-4">
                    <PoweredByTempo />
                  </div>
                </div>
              </WalletContainer>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
