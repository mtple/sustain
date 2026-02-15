"use client";

import { motion } from "motion/react";
import Link from "next/link";

export default function About() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-lg w-full"
      >
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs mb-8 transition-colors hover:text-white/80"
          style={{ color: "var(--text-tertiary)" }}
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back
        </Link>

        <h1
          className="text-lg font-bold italic tracking-wide mb-6"
          style={{ color: "var(--text-primary)" }}
        >
          About
        </h1>

        <div className="space-y-5">
          <p
            className="text-sm leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            Sustain is a micropayment mechanism that lets you support creators
            with a single gesture. Hold the button, and USDC flows directly to
            the artist on Tempo at $0.005/second. Release, and the stream closes
            instantly. A quick tap sends $0.005. The amounts are small enough
            that it doesn&apos;t feel like a payment &mdash; it feels like
            pressing a button.
          </p>

          <p
            className="text-sm leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            The gesture maps naturally to any medium with a temporal dimension
            &mdash; music, podcasts, video, livestreams. You&apos;re already
            listening or watching for a duration; Sustain just lets that duration
            carry value.
          </p>

          <h2
            className="text-sm font-semibold pt-2"
            style={{ color: "var(--text-primary)" }}
          >
            How it works
          </h2>

          <ol
            className="text-sm leading-relaxed space-y-2 list-decimal list-inside"
            style={{ color: "var(--text-secondary)" }}
          >
            <li>Log in with Privy</li>
            <li>Play the track</li>
            <li>
              Hold the Sustain button &mdash; USDC streams to the artist in
              real-time
            </li>
            <li>Release &mdash; payment settles instantly. That&apos;s it.</li>
          </ol>

          <h2
            className="text-sm font-semibold pt-2"
            style={{ color: "var(--text-primary)" }}
          >
            Why Tempo
          </h2>

          <p
            className="text-sm leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            Sub-cent gas fees make $0.005 payments economically viable.
            Stablecoin-denominated gas means users only ever think in dollars. No
            other chain provides both simultaneously.
          </p>

          <p
            className="text-sm leading-relaxed pt-2"
            style={{ color: "var(--text-tertiary)" }}
          >
            Built by{" "}
            <a
              href="https://x.com/mattleefc"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-white/80 transition-colors"
            >
              Matt Lee
            </a>{" "}
            &mdash; full-stack developer, founder of{" "}
            <a
              href="https://tortoise.studio"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-white/80 transition-colors"
            >
              Tortoise
            </a>
            .
          </p>

          <p
            className="text-xs"
            style={{ color: "var(--text-tertiary)" }}
          >
            Built for the Tempo x Canteen Hackathon, February 2025.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
