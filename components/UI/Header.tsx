"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { gsap } from "gsap";
import resume from "@/data/resume.json";
import type { ResumeData } from "@/lib/types";
import { useExperience } from "@/lib/store";
import { audio } from "@/lib/audio";

const data = resume as ResumeData;

/** Sound on/off — also arms the engine, since the tap is a user gesture. */
function SoundToggle() {
  const muted = useSyncExternalStore(
    (cb) => audio.subscribe(cb),
    () => audio.muted,
    () => false
  );
  return (
    <button
      type="button"
      data-chrome
      onClick={() => {
        audio.init();
        audio.setMuted(!muted);
        if (muted) audio.tick(); // audible confirmation only when unmuting
      }}
      className="pointer-events-auto font-mono text-[11px] uppercase tracking-[0.18em] text-smoke opacity-0 transition-colors duration-200 hover:text-fog"
      aria-pressed={!muted}
      aria-label={muted ? "Turn sound on" : "Turn sound off"}
    >
      Sound {muted ? "off" : "on"}
    </button>
  );
}

/** Persistent chrome: identity top corners, guidance along the bottom. */
export function Header() {
  const phase = useExperience((s) => s.phase);
  const rootRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);
  const revealed = useRef(false);

  // Chrome rises in as the intro settles.
  useEffect(() => {
    if (revealed.current || !rootRef.current) return;
    if (phase !== "intro" && phase !== "idle" && phase !== "focused") return;
    revealed.current = true;
    // On a deep link the chrome reveals in the focused state — keep the
    // drag hint out of the reveal so it doesn't flash over the reader.
    const reading = phase === "focused";
    const items = Array.from(
      rootRef.current.querySelectorAll("[data-chrome]")
    ).filter((el) => !(reading && el === hintRef.current));
    gsap.fromTo(
      items,
      { autoAlpha: 0, y: 14 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 1.2,
        ease: "lux",
        stagger: 0.09,
        delay: phase === "intro" ? 1.0 : 0.2,
      }
    );
  }, [phase]);

  // The drag hint politely steps aside while reading a card.
  useEffect(() => {
    if (!hintRef.current || !revealed.current) return;
    const reading =
      phase === "focusing" || phase === "focused" || phase === "unfocusing";
    gsap.to(hintRef.current, {
      autoAlpha: reading ? 0 : 1,
      y: reading ? 10 : 0,
      duration: 0.6,
      ease: reading ? "exit" : "lux",
      overwrite: "auto",
    });
  }, [phase]);

  return (
    <div
      ref={rootRef}
      className="pointer-events-none fixed inset-0 z-chrome flex flex-col justify-between p-6 sm:p-8"
    >
      <header className="flex items-start justify-between">
        <div data-chrome className="opacity-0">
          <p className="text-sm font-medium tracking-wide text-fog">
            {data.profile.name}
          </p>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-smoke">
            {data.profile.role}
          </p>
        </div>
        <div className="flex items-start gap-6">
          <SoundToggle />
          <a
            data-chrome
            href={`mailto:${data.profile.email}`}
            className="pointer-events-auto font-mono text-[11px] uppercase tracking-[0.18em] text-smoke opacity-0 transition-colors duration-200 hover:text-fog"
          >
            {data.profile.email}
          </a>
        </div>
      </header>

      <footer className="flex items-end justify-between">
        <p
          data-chrome
          ref={hintRef}
          className="font-mono text-[11px] uppercase tracking-[0.22em] text-smoke opacity-0"
        >
          Drag to look around · Click a card to open
        </p>
        <p
          data-chrome
          className="font-mono text-[11px] uppercase tracking-[0.18em] text-smoke opacity-0"
        >
          {data.sections.reduce((acc, s) => acc + s.cards.length, 0)} cards
        </p>
      </footer>
    </div>
  );
}
