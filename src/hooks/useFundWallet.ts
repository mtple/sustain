import { RPC_URL } from "@/constants";
import { useEffect, useRef, useState } from "react";

export function useFundWallet(
  address: string,
  rawBalance: number,
  balanceLoaded: boolean,
  refetchBalance: () => Promise<void>
) {
  const [funding, setFunding] = useState(false);
  const fundingRef = useRef(false);

  // Reset the ref when the address changes so a new address can be funded
  const prevAddressRef = useRef(address);
  if (prevAddressRef.current !== address) {
    prevAddressRef.current = address;
    fundingRef.current = false;
  }

  useEffect(() => {
    if (!address || !balanceLoaded || fundingRef.current) return;

    const sessionKey = `sustain_funded_${address}`;
    if (sessionStorage.getItem(sessionKey)) return;

    if (rawBalance >= 1.0) return;

    // Mark immediately — survives Strict Mode remount so we don't double-fire
    fundingRef.current = true;
    setFunding(true);

    const fund = async () => {
      try {
        console.log("[useFundWallet] Funding address:", address);
        const res = await fetch(RPC_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "tempo_fundAddress",
            params: [address],
            id: 1,
          }),
        });
        const data = await res.json();
        if (data.error) {
          console.error("[useFundWallet] Faucet error:", data.error);
          fundingRef.current = false;
        } else {
          console.log("[useFundWallet] Funded successfully:", data.result);
          sessionStorage.setItem(sessionKey, "1");
          await refetchBalance();
        }
      } catch (err) {
        console.error("[useFundWallet] Faucet request failed:", err);
        fundingRef.current = false;
      } finally {
        setFunding(false);
      }
    };

    fund();
  }, [address, rawBalance, balanceLoaded, refetchBalance]);

  return { funding };
}
