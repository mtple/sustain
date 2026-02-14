"use client";

import { useRef, useEffect } from "react";
import { motion } from "motion/react";
import type { StreamPhase } from "@/hooks/useStream";

interface SustainButtonProps {
  phase: StreamPhase;
  onPointerDown: () => void;
  onPointerUp: () => void;
}

export function SustainButton({
  phase,
  onPointerDown,
  onPointerUp,
}: SustainButtonProps) {
  const isActive = phase === "active";
  const btnRef = useRef<HTMLButtonElement>(null);

  // Store latest callbacks in refs so the native listener always sees current values
  const onDownRef = useRef(onPointerDown);
  const onUpRef = useRef(onPointerUp);
  onDownRef.current = onPointerDown;
  onUpRef.current = onPointerUp;

  useEffect(() => {
    const el = btnRef.current;
    if (!el) return;

    const handleDown = (e: PointerEvent) => {
      e.preventDefault();
      onDownRef.current();

      const handleUp = () => {
        window.removeEventListener("pointerup", handleUp);
        window.removeEventListener("pointercancel", handleUp);
        onUpRef.current();
      };
      window.addEventListener("pointerup", handleUp);
      window.addEventListener("pointercancel", handleUp);
    };

    el.addEventListener("pointerdown", handleDown);
    return () => el.removeEventListener("pointerdown", handleDown);
  }, []);

  return (
    <div className="relative w-full max-w-xs mx-auto">
      {isActive && (
        <motion.div
          className="absolute -inset-1 rounded-2xl"
          style={{
            background: "rgba(255,255,255,0.08)",
            filter: "blur(12px)",
          }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      <button
        ref={btnRef}
        className="relative w-full py-5 rounded-2xl font-light tracking-wide transition-colors touch-none select-none"
        style={{
          background: isActive
            ? "rgba(255,255,255,0.12)"
            : "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.15)",
          color: "var(--text-primary)",
        }}
      >
        {isActive ? (
          <motion.span
            className="text-sm uppercase tracking-widest"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            Sustaining...
          </motion.span>
        ) : (
          <span className="text-sm uppercase tracking-widest">
            Hold to Sustain
          </span>
        )}
      </button>
    </div>
  );
}
