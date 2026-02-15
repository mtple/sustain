import { alphaUsd, tempoModerato, RPC_URL } from "@/constants";
import { useCallback, useEffect, useState } from "react";
import { Abis } from "tempo.ts/viem";
import { Address, createPublicClient, formatUnits, http } from "viem";

const publicClient = createPublicClient({
  chain: tempoModerato,
  transport: http(RPC_URL),
});

export function useBalance(address: string | undefined) {
  const [rawBalance, setRawBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!address) return;
    try {
      const bal = (await publicClient.readContract({
        address: alphaUsd,
        abi: Abis.tip20,
        functionName: "balanceOf",
        args: [address as Address],
      })) as unknown as bigint;

      const decimals = (await publicClient.readContract({
        address: alphaUsd,
        abi: Abis.tip20,
        functionName: "decimals",
      })) as unknown as number;

      setRawBalance(parseFloat(formatUnits(bal, decimals)));
    } catch (error) {
      console.error("Error fetching balance:", error);
    }
  }, [address]);

  useEffect(() => {
    if (!address) {
      setRawBalance(0);
      setLoading(false);
      return;
    }

    // Reset loading state for a new address so consumers know
    // the first real fetch hasn't completed yet.
    setLoading(true);

    let didCancel = false;

    const fetchBalance = async () => {
      await refetch();
      if (!didCancel) {
        setLoading(false);
      }
    };

    fetchBalance();
    const interval = setInterval(refetch, 10000);
    return () => {
      didCancel = true;
      clearInterval(interval);
    };
  }, [address, refetch]);

  return { rawBalance, loading, refetch };
}
