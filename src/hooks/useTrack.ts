"use client";

import { useEffect, useState } from "react";
import type { Address } from "viem";

export interface Track {
  title: string;
  artist: string;
  imageUrl: string | null;
  audioUrl: string | null;
  walletAddress: Address;
}

const FALLBACK_TRACK: Track = {
  title: "Juro que...",
  artist: "Dúo Dø",
  imageUrl:
    "https://gray-adequate-egret-120.mypinata.cloud/ipfs/bafkreifu73mes36vcuyayptrs5fsivg56nscqow25uqbqpz4xooud6v4by",
  audioUrl:
    "https://gray-adequate-egret-120.mypinata.cloud/ipfs/bafybeihpchxqf3oqbjiovegghg2yed4voweh66fhxi7ery4grl7rc44bri",
  walletAddress: "0x038C3188241Aa2cbfaEDA05c029B63bC0Eceb208" as Address,
};

export function useTrack() {
  const [track, setTrack] = useState<Track>(FALLBACK_TRACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchTrack() {
      try {
        const res = await fetch(
          "https://tortoise.studio/api/getAudio?slug=juro-que"
        );
        if (!res.ok) throw new Error("API error");
        const data = await res.json();
        if (cancelled) return;
        setTrack({
          title: data.title || FALLBACK_TRACK.title,
          artist: data.artist || FALLBACK_TRACK.artist,
          imageUrl: data.imageUrl || null,
          audioUrl: data.url || null,
          walletAddress:
            (data.walletAddress as Address) || FALLBACK_TRACK.walletAddress,
        });
      } catch {
        if (!cancelled) setTrack(FALLBACK_TRACK);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchTrack();
    return () => {
      cancelled = true;
    };
  }, []);

  return { track, loading };
}
