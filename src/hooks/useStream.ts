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
  settling: boolean;
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
    settling: false,
  });

  const phaseRef = useRef<StreamPhase>("idle");
  const rafRef = useRef<number | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentCostRef = useRef(0);
  const pendingStopRef = useRef(false);
  /** On-chain startTime (unix seconds) — set after startStream confirms */
  const onChainStartRef = useRef<number | null>(null);
  /** True while the txCycle async function is still executing */
  const txCycleActiveRef = useRef(false);
  /** Resolves when the full start+stop cycle is done on-chain */
  const txDoneRef = useRef<Promise<void>>(Promise.resolve());

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
      pollingInterval: 500,
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
  // Accepts pre-resolved clients to avoid redundant switchChain/getProvider latency.
  const doStopOnChain = useCallback(
    async (clients?: {
      publicClient: ReturnType<typeof createPublicClient>;
      walletClient: ReturnType<typeof createWalletClient>;
      address: Address;
    }) => {
      try {
        const { publicClient, walletClient, address } =
          clients ?? (await getClients());
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
    },
    [getClients],
  );

  // Keep a ref so async code always calls the latest version
  const doStopRef = useRef(doStopOnChain);
  doStopRef.current = doStopOnChain;

  const settlingRef = useRef(false);

  // --- Pointer down ---
  const handlePointerDown = useCallback(async () => {
    if (!creatorAddress) return;
    if (phaseRef.current !== "idle" && phaseRef.current !== "settled") return;
    if (settlingRef.current) return;

    // Wait for any previous stop tx to finish before starting a new stream
    await txDoneRef.current;

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
      settling: false,
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
      settlingRef.current = true;
      setState((prev) => ({
        ...prev,
        phase: "settled",
        payment: estimatedPayment,
        settling: true,
      }));

      // If the tx cycle already finished, fire the stop ourselves
      if (!txCycleActiveRef.current) {
        const stopCycle = (async () => {
          try {
            await doStopRef.current();
          } finally {
            settlingRef.current = false;
            setState((prev) => ({ ...prev, settling: false }));
          }
        })();
        txDoneRef.current = stopCycle;
      }
    }, 60_000);

    // Fire transactions in background — txDoneRef tracks completion
    // so the next press waits for this cycle to finish on-chain.
    const txCycle = (async () => {
      txCycleActiveRef.current = true;
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

        // Ensure no active stream on-chain before starting
        const existing = (await publicClient.readContract({
          address: sustainAddress,
          abi: sustainAbi,
          functionName: "getStream",
          args: [address],
        })) as [Address, bigint, bigint, boolean];
        if (existing[3]) {
          // Stream still active — stop it first
          await doStopRef.current({ publicClient, walletClient, address });
        }

        const startHash = await walletClient.writeContract({
          address: sustainAddress,
          abi: sustainAbi,
          functionName: "startStream",
          args: [creatorAddress, DEPOSIT_AMOUNT],
          chain: tempoModerato,
          account: address,
        });

        await publicClient.waitForTransactionReceipt({ hash: startHash });

        // Stream is now live on-chain.
        // If user already released (or auto-stop fired), stop immediately
        // using the same clients to avoid re-resolving wallet/provider.
        if (pendingStopRef.current) {
          await doStopRef.current({ publicClient, walletClient, address });
          return;
        }

        // User is still holding — show the start tx hash
        if (phaseRef.current === "active") {
          setState((prev) => ({ ...prev, txHash: startHash }));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to start";
        // If still active (user hasn't released yet), reset to idle
        if (phaseRef.current === "active") {
          stopTicker();
          clearAutoStop();
          phaseRef.current = "idle";
          settlingRef.current = false;
          setState((prev) => ({ ...prev, phase: "idle", error: msg, settling: false }));
        } else {
          // UI already settled — just show the error alongside the settlement
          setState((prev) => ({ ...prev, error: msg }));
        }
      } finally {
        txCycleActiveRef.current = false;
        settlingRef.current = false;
        setState((prev) => ({ ...prev, settling: false }));
      }
    })();
    txDoneRef.current = txCycle;
  }, [creatorAddress, getClients, startTicker, stopTicker, clearAutoStop, estimatePayment]);

  // --- Pointer up: settle UI instantly with estimate, exact value fills in later ---
  const handlePointerUp = useCallback(() => {
    if (phaseRef.current !== "active") return;
    if (pendingStopRef.current) return;
    pendingStopRef.current = true;
    stopTicker();
    clearAutoStop();

    // Estimate: use current ticker value, rounded to 3 decimal places
    // to match the settlement display format
    const raw = currentCostRef.current;
    const estimatedPayment =
      Math.round(Math.max(raw, 0.001) * 1000) / 1000;

    phaseRef.current = "settled";
    settlingRef.current = true;
    setState((prev) => ({
      ...prev,
      phase: "settled",
      payment: estimatedPayment,
      settling: true,
    }));

    // If the tx cycle already finished (startStream confirmed, user was still
    // holding, cycle exited showing the start hash), we need to fire the stop
    // ourselves — the cycle won't do it since it already returned.
    if (!txCycleActiveRef.current) {
      const stopCycle = (async () => {
        try {
          await doStopRef.current();
        } finally {
          settlingRef.current = false;
          setState((prev) => ({ ...prev, settling: false }));
        }
      })();
      txDoneRef.current = stopCycle;
    }
  }, [stopTicker, clearAutoStop]);

  const resetToIdle = useCallback(() => {
    stopTicker();
    clearAutoStop();
    phaseRef.current = "idle";
    currentCostRef.current = 0;
    pendingStopRef.current = false;
    onChainStartRef.current = null;
    // Keep settling state — it's cleared by the tx cycle completing
    setState((prev) => ({
      phase: "idle",
      currentCost: 0,
      payment: null,
      txHash: null,
      error: null,
      settling: prev.settling,
    }));
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
          pollingInterval: 500,
        });
        const result = (await publicClient.readContract({
          address: sustainAddress,
          abi: sustainAbi,
          functionName: "getStream",
          args: [wallet.address as Address],
        })) as [Address, bigint, bigint, boolean];

        const [, , , active] = result;
        if (active) {
          // Orphaned stream from a previous session — stop it immediately
          const cleanup = doStopRef.current();
          txDoneRef.current = cleanup ?? Promise.resolve();
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
    settling: state.settling,
    explorerLink: state.txHash ? `${EXPLORER_URL}/tx/${state.txHash}` : null,
    handlePointerDown,
    handlePointerUp,
    resetToIdle,
  };
}
