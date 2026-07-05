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
      className="pointer-events-auto font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-fog opacity-0 transition-colors duration-200 hover:text-white"
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
          <p className="text-base font-bold tracking-wide text-white">
            {data.profile.name}
          </p>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-fog">
            {data.profile.role}
          </p>
        </div>
        <div className="flex items-center gap-5 sm:gap-6">
          <SoundToggle />
          <a
            data-chrome
            href={`mailto:${data.profile.email}`}
            className="pointer-events-auto hidden font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-fog opacity-0 transition-colors duration-200 hover:text-white sm:inline"
          >
            {data.profile.email}
          </a>
          <a
            data-chrome
            href="/resume.pdf"
            download
            onClick={() => audio.tick()}
            className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-white/30 px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-white opacity-0 transition-colors duration-200 hover:border-white/60 hover:bg-white/10"
          >
            Resume
            <svg
              width="10"
              height="10"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M8 2.5v8m0 0L4.8 7.3M8 10.5l3.2-3.2M3 12.5h10"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        </div>
      </header>

      <footer className="flex items-end justify-between">
        <p
          data-chrome
          ref={hintRef}
          className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-fog opacity-0"
        >
          Drag to look around · Click a card to open
        </p>
      </footer>
    </div>
  );
}
