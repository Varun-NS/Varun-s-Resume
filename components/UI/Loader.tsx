"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import resume from "@/data/resume.json";
import type { ResumeData } from "@/lib/types";
import { useExperience } from "@/lib/store";

const data = resume as ResumeData;

/**
 * Preload curtain. Counts textures in, then dissolves as the camera begins
 * its pull into the centre of the sphere.
 */
export function Loader() {
  const progress = useExperience((s) => s.progress);
  const phase = useExperience((s) => s.phase);
  const rootRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const shown = useRef({ value: 0 });
  const dismissed = useRef(false);

  // Smoothly count toward the real progress rather than jumping.
  useEffect(() => {
    gsap.to(shown.current, {
      value: progress,
      duration: 0.6,
      ease: "lux",
      overwrite: "auto",
      onUpdate: () => {
        if (counterRef.current) {
          counterRef.current.textContent = String(
            Math.round(shown.current.value * 100)
          ).padStart(3, "0");
        }
      },
    });
  }, [progress]);

  useEffect(() => {
    if (phase === "loading" || dismissed.current || !rootRef.current) return;
    dismissed.current = true;
    gsap.to(rootRef.current, {
      autoAlpha: 0,
      duration: 1.1,
      ease: "exit",
      delay: 0.25,
    });
  }, [phase]);

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-loader flex flex-col items-center justify-center gap-6 bg-void"
      aria-live="polite"
    >
      <p className="text-center">
        <span className="block text-lg font-medium tracking-wide text-fog">
          {data.profile.name}
        </span>
        <span className="mt-2 block font-mono text-[11px] uppercase tracking-[0.24em] text-smoke">
          Building the room
        </span>
      </p>
      <p className="font-mono text-sm tabular-nums text-smoke">
        <span ref={counterRef}>000</span>
        <span className="ml-1 text-[10px]">%</span>
      </p>
    </div>
  );
}
