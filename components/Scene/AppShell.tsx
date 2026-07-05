"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { gsap } from "gsap";
import { registerMotion } from "@/lib/motion";
import { audio } from "@/lib/audio";
import {
  getExperienceState,
  setExperienceState,
  useExperience,
} from "@/lib/store";
import { Header } from "@/components/UI/Header";
import { SectionNavigation } from "@/components/UI/SectionNavigation";
import { Loader } from "@/components/UI/Loader";
import { Cursor } from "@/components/UI/Cursor";
import { Veil, FilmOverlays } from "@/components/UI/Overlays";

if (typeof window !== "undefined") registerMotion();

const Experience = dynamic(
  () => import("./Experience").then((m) => m.Experience),
  { ssr: false }
);

/**
 * Persistent shell around every route. The WebGL scene mounts once here and
 * never remounts — routes only swap the DOM overlay, which is what makes the
 * gallery↔detail transition feel like a single continuous space.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const phase = useExperience((s) => s.phase);
  const focusedSlug = useExperience((s) => s.focusedSlug);
  const pushScheduled = useRef<gsap.core.Tween | null>(null);

  // Respect the visitor's reduced-motion preference, live.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setExperienceState({ reducedMotion: mq.matches });
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Sound can only start after a user gesture (autoplay policy) — arm it on
  // the first press or keystroke, then the listeners remove themselves.
  useEffect(() => {
    const arm = () => {
      audio.init();
      window.removeEventListener("pointerdown", arm);
      window.removeEventListener("keydown", arm);
    };
    window.addEventListener("pointerdown", arm);
    window.addEventListener("keydown", arm);
    return () => {
      window.removeEventListener("pointerdown", arm);
      window.removeEventListener("keydown", arm);
    };
  }, []);

  // When a card starts its focus flight, push the detail route mid-flight so
  // the DOM entrance overlaps the tail of the 3D animation.
  useEffect(() => {
    if (phase !== "focusing" || !focusedSlug) return;
    const target = `/project/${focusedSlug}`;
    if (pathname === target) return;
    const reduced = getExperienceState().reducedMotion;
    pushScheduled.current?.kill();
    pushScheduled.current = gsap.delayedCall(reduced ? 0.15 : 0.85, () => {
      router.push(target);
    });
    return () => {
      pushScheduled.current?.kill();
    };
  }, [phase, focusedSlug, pathname, router]);

  // Browser back button: the detail view unmounts on its own; make sure the
  // sphere reverses its focus state to match.
  useEffect(() => {
    if (pathname !== "/") return;
    const s = getExperienceState();
    if (s.phase === "focused" || s.phase === "focusing") {
      setExperienceState({ phase: "unfocusing" });
    }
  }, [pathname]);

  return (
    <>
      <div className="fixed inset-0 z-scene" aria-hidden="true">
        <Experience />
      </div>
      <Veil />
      {children}
      <Header />
      <SectionNavigation />
      <FilmOverlays />
      <Loader />
      <Cursor />
    </>
  );
}
