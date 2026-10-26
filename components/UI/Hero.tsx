"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import resume from "@/data/resume.json";
import type { ResumeData } from "@/lib/types";
import { getExperienceState, useExperience } from "@/lib/store";
import { glassPanel, glassSheen } from "@/lib/theme";

const data = resume as ResumeData;

/**
 * The readable landing moment: once the intro settles, the visitor's first
 * read is an introduction floating in the middle of the room inside an
 * Apple-style liquid-glass panel — the backdrop blur lifts the text off the
 * cards behind it so both stay legible. The first real interaction (drag,
 * wheel, key, card click) dismisses it for the rest of the visit.
 */
export function Hero() {
  const phase = useExperience((s) => s.phase);
  const theme = useExperience((s) => s.theme);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const revealed = useRef(false);
  const dismissed = useRef(false);

  // Frosted-glass tint per theme: a dark translucent slab over the midnight
  // room, a bright frosted pane over the daylight gallery.
  const glass = glassPanel[theme];
  const sheen = glassSheen[theme];

  // Reveal only on a fresh intro — deep links land straight in the reader.
  useEffect(() => {
    if (phase !== "intro" || revealed.current || !rootRef.current) return;
    revealed.current = true;
    const reduced = getExperienceState().reducedMotion;
    const items = rootRef.current.querySelectorAll("[data-hero]");
    gsap.set(rootRef.current, { autoAlpha: 1 });

    const tl = gsap.timeline({ delay: reduced ? 0 : 1.1 });
    // The glass slab settles in first — a soft scale + lift, like it's
    // coming forward out of the blur.
    tl.fromTo(
      panelRef.current,
      { autoAlpha: 0, y: 28, scale: 0.94 },
      {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: reduced ? 0.4 : 1.1,
        ease: "lux",
      }
    );
    // Then the words rise inside it.
    tl.fromTo(
      items,
      { autoAlpha: 0, y: 14 },
      {
        autoAlpha: 1,
        y: 0,
        duration: reduced ? 0.3 : 0.9,
        ease: "lux",
        stagger: 0.09,
      },
      reduced ? 0 : "-=0.55"
    );
  }, [phase]);

  useEffect(() => {
    const dismiss = () => {
      if (dismissed.current || !revealed.current || !rootRef.current) return;
      dismissed.current = true;
      gsap.to(rootRef.current, {
        autoAlpha: 0,
        scale: 0.98,
        duration: 0.6,
        ease: "exit",
        overwrite: "auto",
        transformOrigin: "center",
      });
    };
    window.addEventListener("pointerdown", dismiss);
    window.addEventListener("wheel", dismiss, { passive: true });
    window.addEventListener("keydown", dismiss);
    return () => {
      window.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("wheel", dismiss);
      window.removeEventListener("keydown", dismiss);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="pointer-events-none fixed inset-0 z-chrome flex items-center justify-center px-6 pb-44 pt-16 opacity-0 sm:pb-0 sm:pt-0"
    >
      <div
        ref={panelRef}
        className={`relative w-[min(92vw,34rem)] overflow-hidden rounded-[32px] border px-7 py-8 opacity-0 backdrop-blur-2xl backdrop-saturate-150 sm:px-14 sm:py-14 ${glass}`}
      >
        {/* Specular top sheen — the liquid-glass highlight. */}
        <div
          className={`pointer-events-none absolute inset-x-0 top-0 h-2/3 bg-gradient-to-b ${sheen} to-transparent`}
          aria-hidden="true"
        />
        {/* Crisp inner edge so the pane reads as a solid piece of glass. */}
        <div
          className="pointer-events-none absolute inset-0 rounded-[32px] ring-1 ring-inset ring-white/10"
          aria-hidden="true"
        />

        <div className="relative text-center">
          <p
            data-hero
            className="font-mono text-[11px] font-semibold uppercase tracking-[0.3em] text-fog/60 opacity-0"
          >
            Interactive résumé
          </p>
          <h1
            data-hero
            className="mt-4 text-4xl font-semibold tracking-tight text-fog opacity-0 sm:text-6xl"
          >
            {data.profile.name}
          </h1>
          <p
            data-hero
            className="mt-4 font-mono text-xs font-semibold uppercase tracking-[0.28em] text-fog/75 opacity-0 sm:text-sm"
          >
            {data.profile.role}
          </p>
          <p
            data-hero
            className="mx-auto mt-6 max-w-md text-base leading-relaxed text-fog/70 opacity-0 sm:text-lg"
          >
            {data.profile.tagline}
          </p>
          <div
            data-hero
            className="mx-auto mt-9 h-px w-16 bg-fog/20 opacity-0 [@media(max-height:700px)]:hidden"
            aria-hidden="true"
          />
          <p
            data-hero
            className="mt-6 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-fog/55 opacity-0 [@media(max-height:700px)]:hidden"
          >
            Drag to look around · Click a card to read
          </p>
        </div>
      </div>
    </div>
  );
}
