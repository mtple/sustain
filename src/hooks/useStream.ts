"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWallets } from "@privy-io/react-auth";
import {
  createPublicClient,
  createWalletClient,
  custom,
  decodeEventLog,
  http,
  maxUint256,
  type Address,
} from "viem";
import { sustainAbi } from "@/abi/sustain";
import {
  alphaUsd,
  sustainAddress,
  tempoModerato,
  RPC_URL,
  DEPOSIT_AMOUNT,
  EXPLORER_URL,
} from "@/constants";

export type StreamPhase = "idle" | "active" | "settled";

interface StreamState {
  phase: StreamPhase;
  currentCost: number;
  payment: number | null;
  txHash: string | null;
  error: string | null;
}

const erc20Abi = [
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

export function useStream(creatorAddress: Address | undefined) {
  const { wallets } = useWallets();
  const [state, setState] = useState<StreamState>({
    phase: "idle",
    currentCost: 0,
    payment: null,
    txHash: null,
    error: null,
  });

  const phaseRef = useRef<StreamPhase>("idle");
  const rafRef = useRef<number | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentCostRef = useRef(0);
  const pendingStopRef = useRef(false);
  /** On-chain startTime (unix seconds) — set after startStream confirms */
  const onChainStartRef = useRef<number | null>(null);

  // Average seconds between release and stopStream mining
  const SETTLE_BUFFER_SECS = 4;

  /** Estimate payment matching the contract's rate ($0.005/sec) with sub-second precision */
  const estimatePayment = useCallback(
    (elapsedSecs: number, deposit: number = 1.0) => {
      const billedElapsed = Math.min(elapsedSecs, 60);
      const raw = billedElapsed * 0.005;
      const payment = Math.min(Math.max(raw, 0.001), deposit);
      // Round to 4 decimal places to avoid floating-point noise
      return Math.round(payment * 10000) / 10000;
    },
    [],
  );

  const getClients = useCallback(async () => {
    const wallet = wallets[0];
    if (!wallet?.address) throw new Error("No wallet connected");
    await wallet.switchChain(tempoModerato.id);
    const provider = await wallet.getEthereumProvider();
    const publicClient = createPublicClient({
      chain: tempoModerato,
      transport: http(RPC_URL),
    });
    const walletClient = createWalletClient({
      account: wallet.address as Address,
      chain: tempoModerato,
      transport: custom(provider),
    });
    return { publicClient, walletClient, address: wallet.address as Address };
  }, [wallets]);

  const startTicker = useCallback((streamStartMs: number) => {
    const tick = () => {
      const elapsed = (Date.now() - streamStartMs) / 1000;
      const billedElapsed = Math.min(elapsed, 60);
      const cost = Math.min(Math.max(billedElapsed * 0.005, 0.001), 1.0);
      currentCostRef.current = cost;
      setState((prev) => ({ ...prev, currentCost: cost }));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const stopTicker = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const clearAutoStop = useCallback(() => {
    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
  }, []);

  // --- Stop on-chain (UI already settled by handlePointerUp) ---
  const doStopOnChain = useCallback(async () => {
    try {
      const { publicClient, walletClient, address } = await getClients();
      const hash = await walletClient.writeContract({
        address: sustainAddress,
        abi: sustainAbi,
        functionName: "stopStream",
        args: [address],
        chain: tempoModerato,
        account: address,
      });
      setState((prev) => ({ ...prev, txHash: hash }));

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "reverted") {
        for (const log of receipt.logs) {
          try {
            const decoded = decodeEventLog({
              abi: sustainAbi,
              data: log.data,
              topics: log.topics,
            });
            if (decoded.eventName === "StreamStopped") {
              const args = decoded.args as unknown as { payment: bigint };
              setState((prev) => ({
                ...prev,
                payment: Number(args.payment) / 1_000_000,
              }));
              break;
            }
          } catch {
            /* not this event */
          }
        }
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to settle on-chain";
      setState((prev) => ({ ...prev, error: msg }));
    }
  }, [getClients]);

  // Keep a ref so async code always calls the latest version
  const doStopRef = useRef(doStopOnChain);
  doStopRef.current = doStopOnChain;

  // --- Pointer down ---
  const handlePointerDown = useCallback(async () => {
    if (!creatorAddress) return;
    if (phaseRef.current !== "idle" && phaseRef.current !== "settled") return;

    const streamStartMs = Date.now();
    currentCostRef.current = 0;
    pendingStopRef.current = false;
    onChainStartRef.current = null;

    setState({
      phase: "active",
      currentCost: 0,
      payment: null,
      txHash: null,
      error: null,
    });
    phaseRef.current = "active";
    startTicker(streamStartMs);

    // Auto-stop after 60s — settle UI immediately, tx fires from the async flow
    autoStopRef.current = setTimeout(() => {
      if (phaseRef.current !== "active") return;
      pendingStopRef.current = true;
      stopTicker();
      // At 60s cap the contract charges 60 * $0.005 = $0.30
      const estimatedPayment = estimatePayment(60);
      phaseRef.current = "settled";
      setState((prev) => ({
        ...prev,
        phase: "settled",
        payment: estimatedPayment,
      }));
    }, 60_000);

    // Fire transactions in background
    try {
      const { publicClient, walletClient, address } = await getClients();

      const allowance = (await publicClient.readContract({
        address: alphaUsd,
        abi: erc20Abi,
        functionName: "allowance",
        args: [address, sustainAddress],
      })) as bigint;

      if (allowance < DEPOSIT_AMOUNT) {
        const approveHash = await walletClient.writeContract({
          address: alphaUsd,
          abi: erc20Abi,
          functionName: "approve",
          args: [sustainAddress, maxUint256],
          chain: tempoModerato,
          account: address,
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }

      // If phase left "active" and user hasn't requested stop, bail
      if (phaseRef.current !== "active" && !pendingStopRef.current) return;

      const hash = await walletClient.writeContract({
        address: sustainAddress,
        abi: sustainAbi,
        functionName: "startStream",
        args: [creatorAddress, DEPOSIT_AMOUNT],
        chain: tempoModerato,
        account: address,
      });

      const startReceipt = await publicClient.waitForTransactionReceipt({
        hash,
      });

      // Extract on-chain startTime from StreamStarted event
      for (const log of startReceipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: sustainAbi,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === "StreamStarted") {
            const args = decoded.args as unknown as { startTime: bigint };
            onChainStartRef.current = Number(args.startTime);
            break;
          }
        } catch {
          /* not this event */
        }
      }

      // Stream is now live on-chain.
      // If user already released (or auto-stop fired), stop on-chain now.
      if (pendingStopRef.current) {
        await doStopRef.current();
        return;
      }

      // Stream is live and user is still holding — show the start tx hash
      if (phaseRef.current === "active") {
        setState((prev) => ({ ...prev, txHash: hash }));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to start";
      // If still active (user hasn't released yet), reset to idle
      if (phaseRef.current === "active") {
        stopTicker();
        clearAutoStop();
        phaseRef.current = "idle";
        setState((prev) => ({ ...prev, phase: "idle", error: msg }));
      } else {
        // UI already settled — just show the error alongside the settlement
        setState((prev) => ({ ...prev, error: msg }));
      }
    }
  }, [creatorAddress, getClients, startTicker, stopTicker, clearAutoStop, estimatePayment]);

  // --- Pointer up: settle UI instantly, tx fires in background ---
  const handlePointerUp = useCallback(() => {
    if (phaseRef.current !== "active") return;
    if (pendingStopRef.current) return;
    pendingStopRef.current = true;
    stopTicker();
    clearAutoStop();

    // Estimate what the contract will charge.
    // If we know the on-chain startTime, use integer-second math + buffer
    // for the extra seconds until stopStream mines.
    let estimatedPayment: number;
    if (onChainStartRef.current !== null) {
      const nowSecs = Date.now() / 1000;
      const elapsed = nowSecs - onChainStartRef.current + SETTLE_BUFFER_SECS;
      estimatedPayment = estimatePayment(elapsed);
    } else {
      // startStream hasn't confirmed yet — the on-chain clock hasn't started,
      // so the elapsed will be very short (just the time from confirm to stop).
      // Use the buffer as the expected elapsed.
      estimatedPayment = estimatePayment(SETTLE_BUFFER_SECS);
    }

    phaseRef.current = "settled";
    setState((prev) => ({
      ...prev,
      phase: "settled",
      payment: estimatedPayment,
    }));
  }, [stopTicker, clearAutoStop, estimatePayment]);

  const resetToIdle = useCallback(() => {
    stopTicker();
    clearAutoStop();
    phaseRef.current = "idle";
    currentCostRef.current = 0;
    pendingStopRef.current = false;
    onChainStartRef.current = null;
    setState({
      phase: "idle",
      currentCost: 0,
      payment: null,
      txHash: null,
      error: null,
    });
  }, [stopTicker, clearAutoStop]);

  // On mount: check for existing active stream
  useEffect(() => {
    async function checkActiveStream() {
      const wallet = wallets[0];
      if (!wallet?.address) return;
      try {
        const publicClient = createPublicClient({
          chain: tempoModerato,
          transport: http(RPC_URL),
        });
        const result = (await publicClient.readContract({
          address: sustainAddress,
          abi: sustainAbi,
          functionName: "getStream",
          args: [wallet.address as Address],
        })) as [Address, bigint, bigint, boolean];

        const [, , startTimeBig, active] = result;
        if (active) {
          const streamStartMs = Number(startTimeBig) * 1000;
          onChainStartRef.current = Number(startTimeBig);
          phaseRef.current = "active";
          setState({
            phase: "active",
            currentCost: 0,
            payment: null,
            txHash: null,
            error: null,
          });
          startTicker(streamStartMs);

          const elapsed = Date.now() / 1000 - Number(startTimeBig);
          const settleAndStop = () => {
            stopTicker();
            clearAutoStop();
            const elapsedAtStop =
              Date.now() / 1000 - Number(startTimeBig) + SETTLE_BUFFER_SECS;
            const est = estimatePayment(elapsedAtStop);
            phaseRef.current = "settled";
            setState((prev) => ({ ...prev, phase: "settled", payment: est }));
            doStopRef.current();
          };
          if (elapsed >= 60) {
            settleAndStop();
          } else {
            autoStopRef.current = setTimeout(
              settleAndStop,
              (60 - elapsed) * 1000
            );
          }
        }
      } catch {
        /* no active stream */
      }
    }
    checkActiveStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallets[0]?.address]);

  useEffect(() => {
    return () => {
      stopTicker();
      clearAutoStop();
    };
  }, [stopTicker, clearAutoStop]);

  return {
    phase: state.phase,
    currentCost: state.currentCost,
    payment: state.payment,
    error: state.error,
    explorerLink: state.txHash ? `${EXPLORER_URL}/tx/${state.txHash}` : null,
    handlePointerDown,
    handlePointerUp,
    resetToIdle,
  };
}
