"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { useExperience } from "@/lib/store";

/**
 * The veil sits between the sphere and the detail page: while a card is
 * focused it darkens and blurs the rest of the room.
 */
export function Veil() {
  const phase = useExperience((s) => s.phase);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const active = phase === "focusing" || phase === "focused";
    // GSAP vendor-prefixes backdropFilter itself — passing webkitBackdropFilter
    // explicitly only triggers "missing plugin" warnings.
    gsap.to(ref.current, {
      backgroundColor: active ? "rgba(2,2,2,0.52)" : "rgba(2,2,2,0)",
      backdropFilter: active ? "blur(9px)" : "blur(0px)",
      duration: active ? 1.0 : 0.9,
      ease: active ? "lux" : "exit",
      // Let the card fly crisp for most of its arc; the blur lands with the
      // reader — it reads as a focus pull onto the page, not a smear.
      delay: active && phase === "focusing" ? 0.8 : 0,
      overwrite: "auto",
    });
  }, [phase]);

  return (
    <div
      ref={ref}
      className="pointer-events-none fixed inset-0 z-veil"
      aria-hidden="true"
    />
  );
}

/** Vignette + drifting film grain — the last 2% that makes it cinema. */
export function FilmOverlays() {
  const grainRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useExperience((s) => s.reducedMotion);

  useEffect(() => {
    if (!grainRef.current || reducedMotion) return;
    // Classic 8-step grain shuffle: jump, never glide.
    const tween = gsap.to(grainRef.current, {
      backgroundPosition: "180px 180px",
      duration: 0.55,
      ease: "steps(8)",
      repeat: -1,
    });
    return () => {
      tween.kill();
    };
  }, [reducedMotion]);

  return (
    <>
      <div
        className="vignette pointer-events-none fixed inset-0 z-[44]"
        aria-hidden="true"
      />
      <div
        ref={grainRef}
        className="grain pointer-events-none fixed inset-0 z-[46] opacity-[0.045]"
        aria-hidden="true"
      />
    </>
  );
}
