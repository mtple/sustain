"use client";

import {
  AlbumArt,
  AudioPlayer,
  BalanceDisplay,
  LoginView,
  PaymentTicker,
  PoweredByTempo,
  SettlementView,
  SustainButton,
  TrackInfo,
  UserPill,
  WalletContainer,
} from "@/components";
import { useBalance } from "@/hooks/useBalance";
import { useStream } from "@/hooks/useStream";
import { useTrack } from "@/hooks/useTrack";
import { usePrivy } from "@privy-io/react-auth";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";

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
    explorerLink,
    handlePointerDown,
    handlePointerUp,
    resetToIdle,
  } = useStream(track.walletAddress);

  // Refetch balance when stream settles
  const prevPhaseRef = useRef(phase);
  useEffect(() => {
    if (prevPhaseRef.current === "active" && phase === "settled") {
      refetchBalance();
    }
    prevPhaseRef.current = phase;
  }, [phase, refetchBalance]);

  const showTicker = phase === "active";
  const showSettlement = phase === "settled" && payment !== null;
  const showButton = phase !== "settled";

  return (
    <>
      <AnimatePresence>
        {ready && !authenticated && <LoginView onLogin={login} />}
      </AnimatePresence>

      <AnimatePresence>
        {authenticated && (
          <>
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

                  <AnimatePresence mode="wait">
                    {showTicker && (
                      <PaymentTicker
                        key="ticker"
                        currentCost={currentCost}
                        depositDollars={1.0}
                      />
                    )}

                    {showSettlement && (
                      <SettlementView
                        key="settlement"
                        payment={payment}
                        artistName={track.artist}
                        explorerLink={explorerLink}
                        onDone={resetToIdle}
                      />
                    )}
                  </AnimatePresence>

                  {showButton && (
                    <SustainButton
                      phase={phase}
                      onPointerDown={handlePointerDown}
                      onPointerUp={handlePointerUp}
                    />
                  )}

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
