"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import Lenis from "lenis";
import { RichText } from "./RichText";
import type { ResumeCard } from "@/lib/types";
import { registerMotion } from "@/lib/motion";
import {
  getExperienceState,
  setExperienceState,
  useExperience,
} from "@/lib/store";
import { glassPanel, glassSheen } from "@/lib/theme";

if (typeof window !== "undefined") registerMotion();

/**
 * The reading layer for a focused card. It mounts as a real route but the
 * sphere keeps living underneath — entrance and exit are timed to hand off
 * seamlessly with the card's 3D flight.
 */
export function DetailView({ card }: { card: ResumeCard }) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const leaving = useRef(false);
  const reducedMotion = useExperience((s) => s.reducedMotion);
  const theme = useExperience((s) => s.theme);

  // Claim focus on mount. Covers all three entrances: a card click (already
  // focusing), keyboard/screen-reader navigation (start the flight now), and
  // a cold deep link (the gallery snaps into place once textures load).
  useEffect(() => {
    const s = getExperienceState();
    if (s.focusedSlug !== card.slug) {
      setExperienceState({
        focusedSlug: card.slug,
        phase: s.phase === "loading" ? "loading" : "focusing",
        hoveredSlug: null,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.slug]);

  // Entrance choreography.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const wasFlying = getExperienceState().phase === "focusing";
    const items = root.querySelectorAll("[data-detail]");

    const tl = gsap.timeline({
      delay: reducedMotion ? 0 : wasFlying ? 0.85 : 0.15,
    });
    tl.fromTo(
      root,
      { autoAlpha: 0 },
      { autoAlpha: 1, duration: reducedMotion ? 0.3 : 0.7, ease: "lux" }
    );
    if (!reducedMotion) {
      tl.fromTo(
        items,
        { autoAlpha: 0, y: 34 },
        { autoAlpha: 1, y: 0, duration: 1.1, ease: "lux", stagger: 0.08 },
        0.1
      );
    }
    tl.call(() => {
      if (getExperienceState().phase === "focusing") {
        setExperienceState({ phase: "focused" });
      }
    });
    return () => {
      tl.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Smooth reading scroll, scoped to this overlay.
  useEffect(() => {
    if (!scrollRef.current || !contentRef.current) return;
    const lenis = new Lenis({
      wrapper: scrollRef.current,
      content: contentRef.current,
      duration: 1.15,
      smoothWheel: !reducedMotion,
    });
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, [reducedMotion]);

  const goBack = () => {
    if (leaving.current || !rootRef.current) return;
    leaving.current = true;
    // The sphere starts reversing immediately; the reader slips away over it.
    setExperienceState({ phase: "unfocusing" });
    gsap.to(rootRef.current, {
      autoAlpha: 0,
      y: reducedMotion ? 0 : 24,
      duration: reducedMotion ? 0.25 : 0.55,
      ease: "exit",
      onComplete: () => router.push("/", { scroll: false }),
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") goBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={rootRef} className="fixed inset-0 z-detail opacity-0 backdrop-blur-md bg-void/60">
      <button
        type="button"
        onClick={goBack}
        data-detail
        className="fixed left-6 top-[76px] z-10 flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-fog/75 transition-colors duration-200 hover:text-fog sm:left-8 sm:top-20"
        aria-label="Back to gallery"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M10.5 3 5.5 8l5 5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Back to gallery
      </button>

      {/* Scrolled text fades out beneath the fixed chrome instead of
          colliding with the name, toggles and back link. */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[5] h-32 bg-gradient-to-b from-void from-40% via-void/85 to-transparent sm:h-40"
        aria-hidden="true"
      />

      <div
        ref={scrollRef}
        className="detail-scroll h-full overflow-y-auto"
      >
        <article
          ref={contentRef}
          className="mx-auto max-w-3xl px-4 pb-36 pt-[16vh] sm:px-6"
        >
          {/* The reading surface: the same liquid-glass slab as the hero, so
              the text sits on frosted glass instead of the raw room. */}
          <div
            className={`relative overflow-hidden rounded-[32px] border px-5 py-6 backdrop-blur-2xl backdrop-saturate-150 sm:px-10 sm:py-10 ${glassPanel[theme]}`}
          >
            <div
              className={`pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b ${glassSheen[theme]} to-transparent`}
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute inset-0 rounded-[32px] ring-1 ring-inset ring-white/10"
              aria-hidden="true"
            />
            <div className="relative">
          <div data-detail className="overflow-hidden rounded-2xl border border-hairline shadow-2xl">
            {/* Same URL the sphere texture used — served straight from cache. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={card.image}
              alt={card.title}
              className={`h-[32vh] w-full sm:h-[52vh] ${
                card.objectFit === 'contain' 
                  ? 'object-contain bg-white p-8' 
                  : card.objectFit === 'contain-dark'
                  ? 'object-contain bg-[#0a0a0b] p-8'
                  : 'object-cover'
              }`}
            />
          </div>

          <div data-detail className="mt-10 flex flex-wrap items-center gap-3">
            {card.category.map((cat) => (
              <span
                key={cat}
                className="rounded-full border border-fog/25 bg-fog/5 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-fog/75"
              >
                {cat}
              </span>
            ))}
            <span className="ml-auto font-mono text-xs font-semibold uppercase tracking-[0.16em] text-fog/75">
              {card.year}
            </span>
          </div>

          {card.eyebrow && (
            <h2 
              data-detail 
              className="mt-6 mb-2 font-mono text-sm font-semibold uppercase tracking-[0.2em] text-fog/70 sm:text-base"
            >
              {card.eyebrow}
            </h2>
          )}
          <h1
            data-detail
            className={`${card.eyebrow ? 'mt-1' : 'mt-6'} text-4xl font-semibold tracking-tight text-fog sm:text-6xl`}
          >
            {card.title}
          </h1>
          <p data-detail className="mt-3 text-lg text-smoke sm:text-xl">
            {card.subtitle}
          </p>

          <div data-detail className="mt-10 border-t border-hairline pt-10">
            <RichText
              text={card.description}
              className="max-w-2xl text-base leading-relaxed text-fog/90 sm:text-lg"
            />

            {card.links && card.links.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-3">
                {card.links.map((link, i) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center rounded-full px-6 py-3 font-mono text-sm font-semibold tracking-wide transition-colors ${
                      i === 0
                        ? "bg-fog text-void hover:bg-fog/85"
                        : "border border-fog/30 text-fog hover:border-fog/60 hover:bg-fog/10"
                    }`}
                  >
                    {link.label} ↗
                  </a>
                ))}
              </div>
            )}

            {card.slug === "download-resume" && (
              <div className="mt-8 flex justify-start">
                <a 
                  href="/resume.pdf" 
                  download="Varun_NS_Resume.pdf"
                  className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-fog px-8 py-3.5 font-mono text-sm font-semibold tracking-wide text-void transition-all hover:scale-105 active:scale-95"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download PDF
                  </span>
                  <div className="absolute inset-0 z-0 bg-fog/50 blur-md transition-opacity group-hover:opacity-100 opacity-0" />
                </a>
              </div>
            )}
          </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
