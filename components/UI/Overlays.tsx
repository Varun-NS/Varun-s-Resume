"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { useExperience } from "@/lib/store";
import { themes } from "@/lib/theme";

/**
 * The veil sits between the sphere and the detail page: while a card is
 * focused it hazes out the rest of the room — darkening in the dark theme,
 * washing toward paper in the light one.
 */
export function Veil() {
  const phase = useExperience((s) => s.phase);
  const theme = useExperience((s) => s.theme);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const spec = themes[theme];
    const active = phase === "focusing" || phase === "focused";
    // GSAP vendor-prefixes backdropFilter itself — passing webkitBackdropFilter
    // explicitly only triggers "missing plugin" warnings.
    gsap.to(ref.current, {
      backgroundColor: active ? spec.veil : spec.veilClear,
      backdropFilter: active ? "blur(9px)" : "blur(0px)",
      duration: active ? 1.0 : 0.9,
      ease: active ? "lux" : "exit",
      // Let the card fly crisp for most of its arc; the blur lands with the
      // reader — it reads as a focus pull onto the page, not a smear.
      delay: active && phase === "focusing" ? 0.8 : 0,
      overwrite: "auto",
    });
  }, [phase, theme]);

  return (
    <div
      ref={ref}
      className="pointer-events-none fixed inset-0 z-veil"
      aria-hidden="true"
    />
  );
}

/** Vignette + drifting film grain — kept quiet so they frame, not fog. */
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
        className="grain pointer-events-none fixed inset-0 z-[46] opacity-[0.028]"
        aria-hidden="true"
      />
    </>
  );
}
