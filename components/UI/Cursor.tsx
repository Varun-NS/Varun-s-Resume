"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { useExperience } from "@/lib/store";

/**
 * A two-part custom cursor: a tight dot and a lazy ring that trails it.
 * The ring grows into a labelled lens over interactive cards.
 * Only mounts for fine pointers — touch users never see it.
 */
export function Cursor() {
  const [enabled, setEnabled] = useState(false);
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const hoveredSlug = useExperience((s) => s.hoveredSlug);
  const dragging = useExperience((s) => s.dragging);
  const phase = useExperience((s) => s.phase);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    setEnabled(mq.matches);
    const apply = () => setEnabled(mq.matches);
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!enabled || !dotRef.current || !ringRef.current) return;
    document.body.classList.add("has-custom-cursor");

    const dotX = gsap.quickTo(dotRef.current, "x", {
      duration: 0.12,
      ease: "power2.out",
    });
    const dotY = gsap.quickTo(dotRef.current, "y", {
      duration: 0.12,
      ease: "power2.out",
    });
    const ringX = gsap.quickTo(ringRef.current, "x", {
      duration: 0.45,
      ease: "power3.out",
    });
    const ringY = gsap.quickTo(ringRef.current, "y", {
      duration: 0.45,
      ease: "power3.out",
    });

    // Stay hidden until the first real move so the cursor never slides in
    // from the viewport origin.
    let visible = false;
    const move = (e: PointerEvent) => {
      if (!visible) {
        visible = true;
        gsap.set([dotRef.current, ringRef.current], {
          x: e.clientX,
          y: e.clientY,
        });
        gsap.to([dotRef.current, ringRef.current], {
          autoAlpha: 1,
          duration: 0.3,
        });
      }
      dotX(e.clientX);
      dotY(e.clientY);
      ringX(e.clientX);
      ringY(e.clientY);
    };
    const hide = () => {
      visible = false;
      gsap.to([dotRef.current, ringRef.current], { autoAlpha: 0, duration: 0.3 });
    };

    window.addEventListener("pointermove", move);
    document.documentElement.addEventListener("pointerleave", hide);
    return () => {
      document.body.classList.remove("has-custom-cursor");
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", hide);
    };
  }, [enabled]);

  // Ring personality: grows with a label over cards, tightens while dragging.
  useEffect(() => {
    if (!enabled || !ringRef.current || !labelRef.current) return;
    const overCard = Boolean(hoveredSlug) && phase === "idle";
    const label = dragging ? "" : overCard ? "VIEW" : "";
    labelRef.current.textContent = label;
    gsap.to(ringRef.current, {
      scale: dragging ? 0.7 : overCard ? 2.1 : 1,
      duration: 0.5,
      ease: "lux",
      overwrite: "auto",
    });
    gsap.to(labelRef.current, {
      autoAlpha: label ? 1 : 0,
      duration: 0.25,
      overwrite: "auto",
    });
  }, [enabled, hoveredSlug, dragging, phase]);

  if (!enabled) return null;

  return (
    <>
      <div
        ref={dotRef}
        className="pointer-events-none fixed left-0 top-0 z-cursor h-1.5 w-1.5 rounded-full bg-fog opacity-0 mix-blend-difference"
        aria-hidden="true"
        style={{ marginLeft: "-3px", marginTop: "-3px" }}
      />
      <div
        ref={ringRef}
        className="pointer-events-none fixed left-0 top-0 z-cursor flex h-9 w-9 items-center justify-center rounded-full border border-fog/60 opacity-0 mix-blend-difference"
        aria-hidden="true"
        style={{ marginLeft: "-18px", marginTop: "-18px" }}
      >
        <span
          ref={labelRef}
          className="font-mono text-[7px] uppercase tracking-[0.2em] text-fog opacity-0"
        />
      </div>
    </>
  );
}
