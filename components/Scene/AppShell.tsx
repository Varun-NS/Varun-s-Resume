"use client";

import { useEffect, useRef, useState } from "react";
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
import { readInitialTheme } from "@/lib/theme";
import { Header } from "@/components/UI/Header";
import { Hero } from "@/components/UI/Hero";
import { SectionNavigation } from "@/components/UI/SectionNavigation";
import { Loader } from "@/components/UI/Loader";
import { Veil, FilmOverlays } from "@/components/UI/Overlays";
import { ModeSwitch } from "@/components/UI/ModeSwitch";
import { SimpleResume } from "@/components/Simple/SimpleResume";

if (typeof window !== "undefined") registerMotion();

const Experience = dynamic(
  () => import("./Experience").then((m) => m.Experience),
  { ssr: false }
);

/**
 * Persistent shell around every route. Visitors land on the simple
 * scrollable resume; the WebGL scene mounts the first time they switch to
 * 3D and then never remounts — it is only hidden (and paused) while the
 * simple page shows. Routes only swap the DOM overlay above it, which is
 * what makes the gallery↔detail transition feel like one continuous space.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const phase = useExperience((s) => s.phase);
  const focusedSlug = useExperience((s) => s.focusedSlug);
  const hoveredSlug = useExperience((s) => s.hoveredSlug);
  const dragging = useExperience((s) => s.dragging);
  const storeMode = useExperience((s) => s.mode);
  const pushScheduled = useRef<gsap.core.Tween | null>(null);

  // A card deep link (/project/…) belongs to the 3D view. Until the store
  // has been synced, derive the mode from the path so the server render
  // and first paint already match.
  const [modeSynced, setModeSynced] = useState(false);
  useEffect(() => {
    if (pathname.startsWith("/project/")) {
      setExperienceState({ mode: "immersive" });
    }
    setModeSynced(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const mode = modeSynced
    ? storeMode
    : pathname.startsWith("/project/")
      ? "immersive"
      : "simple";
  const immersive = mode === "immersive";

  // Mount the 3D layer on first use only; afterwards keep it alive.
  const [immersiveMounted, setImmersiveMounted] = useState(immersive);
  if (immersive && !immersiveMounted) setImmersiveMounted(true);

  // Plain system cursor throughout — just a hint of what's draggable/
  // clickable via the standard grab/pointer glyphs recruiters already know.
  const sceneCursor = dragging ? "grabbing" : hoveredSlug ? "pointer" : "grab";

  // Adopt the theme the pre-hydration script stamped on <html>.
  useEffect(() => {
    setExperienceState({ theme: readInitialTheme() });
  }, []);

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
      router.push(target, { scroll: false });
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
      {!immersive && <SimpleResume />}
      {immersiveMounted && (
        <div hidden={!immersive}>
          <div
            className="fixed inset-0 z-scene"
            style={{ cursor: sceneCursor }}
            aria-hidden="true"
          >
            <Experience />
          </div>
          <Veil />
          {children}
          <Hero />
          <Header />
          <SectionNavigation />
          <FilmOverlays />
          <Loader />
        </div>
      )}
      <ModeSwitch mode={mode} />
    </>
  );
}
