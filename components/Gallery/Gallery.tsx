"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { gsap } from "gsap";
import resume from "@/data/resume.json";
import type { ResumeData } from "@/lib/types";
import { buildPlacements, sectionZoomOffset } from "@/lib/sphere";
import { GalleryCard, FOCUS_DISTANCE } from "@/components/Card/GalleryCard";
import { cardRegistry } from "@/lib/registry";
import { cameraState, anglesToward } from "@/lib/cameraState";
import { registerMotion, shortestAngle } from "@/lib/motion";
import {
  getExperienceState,
  setExperienceState,
  useExperience,
} from "@/lib/store";
import { SectionLabels } from "./SectionLabels";
import { SectionPanel } from "./SectionPanel";

if (typeof window !== "undefined") registerMotion();

const data = resume as ResumeData;

/**
 * Mounts every card and choreographs the shared moments: the intro reveal,
 * hover dimming, and the cinematic focus/unfocus flights. Individual cards
 * own their per-frame motion; this component owns the timelines.
 */
export function Gallery() {
  const layout = useMemo(() => buildPlacements(data.sections), []);
  const { placements, sections } = layout;
  const loadedCount = useRef(0);
  const started = useRef(false);
  const timeline = useRef<gsap.core.Timeline | null>(null);

  const phase = useExperience((s) => s.phase);
  const focusedSlug = useExperience((s) => s.focusedSlug);
  const hoveredSlug = useExperience((s) => s.hoveredSlug);
  const activeSection = useExperience((s) => s.activeSection);

  // ---- Preload gate -------------------------------------------------------
  const handleCardReady = useCallback(() => {
    loadedCount.current += 1;
    const progress = Math.min(1, loadedCount.current / placements.length);
    setExperienceState({ progress });
    if (loadedCount.current >= placements.length && !started.current) {
      started.current = true;
      const slug = getExperienceState().focusedSlug;
      if (slug && cardRegistry.has(slug)) snapToFocus(slug);
      else runIntro();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placements.length]);

  // ---- Intro: settle into the centre of the room --------------------------
  const runIntro = () => {
    const reduced = getExperienceState().reducedMotion;
    setExperienceState({ phase: "intro" });
    const handles = [...cardRegistry.values()].sort(
      (a, b) => a.index - b.index
    );

    const tl = gsap.timeline({
      onComplete: () => {
        cameraState.inputEnabled = true;
        setExperienceState({ phase: "idle" });
      },
    });

    if (reduced) {
      cameraState.zOffset = 0;
      handles.forEach((h) => {
        tl.to(h.anim, { opacity: 1, scale: 1, duration: 0.6, ease: "lux" }, 0);
      });
      timeline.current = tl;
      return;
    }

    tl.to(cameraState, { zOffset: 0, duration: 2.8, ease: "lux" }, 0);
    handles.forEach((h, i) => {
      tl.to(
        h.anim,
        { opacity: 1, scale: 1, duration: 1.6, ease: "lux" },
        0.2 + i * 0.03
      );
    });
    // Hand control back slightly before the last card settles — the visitor
    // should never feel locked out of a space that looks ready.
    tl.call(
      () => {
        cameraState.inputEnabled = true;
      },
      undefined,
      Math.min(2.2, tl.duration() - 0.4)
    );
    timeline.current = tl;
  };

  // ---- Deep link: land already focused, no theatrics -----------------------
  const snapToFocus = (slug: string) => {
    const target = cardRegistry.get(slug);
    if (!target) return;
    cardRegistry.forEach((h) => {
      const isTarget = h.slug === slug;
      h.anim.opacity = isTarget ? 1 : 0.04;
      h.anim.brightness = isTarget ? 1 : 0.5;
      h.anim.scale = isTarget ? 1 : 0.93;
      h.anim.focus = isTarget ? 1 : 0;
      h.anim.floatAmp = 0;
    });
    const aim = anglesToward(
      target.direction.x,
      target.direction.y,
      target.direction.z
    );
    cameraState.yaw = cameraState.targetYaw = aim.yaw;
    cameraState.pitch = cameraState.targetPitch = aim.pitch;
    cameraState.zOffset = 0;
    cameraState.drift = 0;
    cameraState.inputEnabled = false;
    setExperienceState({ phase: "focused" });
  };

  // ---- Focus / unfocus choreography ---------------------------------------
  useEffect(() => {
    if (phase === "focusing" && focusedSlug) {
      const target = cardRegistry.get(focusedSlug);
      if (!target) return;
      const reduced = getExperienceState().reducedMotion;

      cameraState.inputEnabled = false;
      cameraState.velocityYaw = 0;
      cameraState.velocityPitch = 0;
      gsap.killTweensOf(cameraState);
      timeline.current?.kill();

      const aim = anglesToward(
        target.direction.x,
        target.direction.y,
        target.direction.z
      );
      // Re-aim along the shortest arc from wherever the visitor is looking.
      const yawGoal =
        cameraState.yaw + shortestAngle(cameraState.yaw, aim.yaw);
      cameraState.targetYaw = cameraState.yaw;
      cameraState.targetPitch = cameraState.pitch;

      const tl = gsap.timeline();
      timeline.current = tl;

      if (reduced) {
        tl.to(cameraState, {
          targetYaw: yawGoal,
          targetPitch: aim.pitch,
          drift: 0,
          duration: 0.4,
          ease: "lux",
        });
        cardRegistry.forEach((h) => {
          if (h.slug === focusedSlug) return;
          tl.to(h.anim, { opacity: 0.04, duration: 0.4, ease: "lux" }, 0);
        });
        tl.to(target.anim, { focus: 1, duration: 0.4, ease: "lux" }, 0);
        return;
      }

      // 1 — the camera turns to meet the card. zOffset is re-pinned to the
      // centre in case a focus interrupts the intro dolly mid-flight.
      tl.to(
        cameraState,
        {
          targetYaw: yawGoal,
          targetPitch: aim.pitch,
          drift: 0,
          zOffset: 0,
          duration: 1.2,
          ease: "glide",
        },
        0
      );
      // 2 — the rest of the room recedes, nearest neighbours first.
      cardRegistry.forEach((h) => {
        if (h.slug === focusedSlug) return;
        const nearness = h.direction.dot(target.direction); // 1 = adjacent
        tl.to(
          h.anim,
          {
            opacity: 0.15,
            brightness: 0.3,
            scale: 0.93,
            floatAmp: 0,
            duration: 1.05,
            ease: "lux",
          },
          0.08 + (1 - nearness) * 0.09
        );
      });
      // 3 — the chosen card lifts off the shell and flies to the visitor.
      tl.to(
        target.anim,
        {
          focus: 1,
          brightness: 1,
          opacity: 1,
          floatAmp: 0,
          duration: 1.5,
          ease: "cinema",
        },
        0.15
      );
    }

    if (phase === "unfocusing") {
      const reduced = getExperienceState().reducedMotion;
      timeline.current?.kill();
      const slug = getExperienceState().focusedSlug;
      const target = slug ? cardRegistry.get(slug) : undefined;
      const active = getExperienceState().activeSection;

      // Determine correct zoom return position based on active section
      let returnZOffset = 0;
      if (active) {
        const section = sections.find((s) => s.title === active);
        if (section) returnZOffset = sectionZoomOffset(section);
      }

      const tl = gsap.timeline({
        onComplete: () => {
          cameraState.inputEnabled = true;
          setExperienceState({ phase: "idle", focusedSlug: null });
        },
      });
      timeline.current = tl;
      const d = reduced ? 0.4 : 1.1;

      if (target) {
        tl.to(
          target.anim,
          { focus: 0, duration: reduced ? 0.4 : 1.2, ease: "cinema" },
          0
        );
      }
      cardRegistry.forEach((h) => {
        if (h.slug === slug) return;
        // If a section is still framed, cards outside it return to the
        // spotlight's darkness instead of flashing back to full brightness.
        const dimmed = active !== null && h.sectionTitle !== active;
        tl.to(
          h.anim,
          {
            opacity: dimmed ? 0.08 : 1,
            brightness: dimmed ? 0.35 : 1,
            scale: dimmed ? 0.97 : 1,
            floatAmp: 1,
            duration: d,
            ease: "lux",
          },
          reduced ? 0 : 0.15
        );
      });
      if (target) {
        tl.to(target.anim, { floatAmp: 1, duration: 0.6, ease: "lux" }, d);
      }
      // Drift stays paused while a section is still framed, so the grid
      // doesn't slide sideways under the visitor.
      tl.to(
        cameraState,
        { drift: active ? 0 : 1, zOffset: returnZOffset, duration: d, ease: "lux" },
        0
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, focusedSlug]);

  // ---- Hover & Section Focus ---------------------------------------------
  useEffect(() => {
    if (phase !== "idle") return;
    const hovered = hoveredSlug ? cardRegistry.get(hoveredSlug) : undefined;
    const active = activeSection;

    cardRegistry.forEach((h) => {
      let brightness = 1;
      let scale = 1;
      let lift = 0;
      let opacity = 1;

      const dimmed = active !== null && h.sectionTitle !== active;
      if (dimmed) {
        // Spotlight: everything outside the framed section recedes into
        // the dark so neighbours at the frame's edge don't compete.
        // Low enough that even white logo cards stay ghosts.
        brightness = 0.35;
        opacity = 0.08;
        scale = 0.97;
        if (hovered && h.slug === hovered.slug) {
          // Still discoverable under the cursor.
          brightness = 0.95;
          opacity = 0.9;
          scale = 1.02;
        }
      } else if (active) {
        brightness = 1.25;
        scale = 1.04;
        lift = 1.5;
        if (hovered && h.slug === hovered.slug) {
          brightness = 1.4;
          scale = 1.08;
          lift = 2.2;
        }
      } else if (hovered) {
        if (h.slug === hovered.slug) {
          brightness = 1.22;
          scale = 1.06;
          lift = 2.2;
        } else if (h.direction.dot(hovered.direction) > 0.8) {
          brightness = 0.8; // nearby cards dim slightly, not to shadow
        } else {
          brightness = 0.9;
        }
      }

      gsap.to(h.anim, {
        brightness,
        opacity,
        scale,
        lift,
        duration: hovered && h.slug === hovered?.slug ? 0.55 : 0.7,
        ease: "lux",
        overwrite: "auto",
      });
    });
  }, [hoveredSlug, activeSection, phase]);

  // ---- Camera Steering for Active Section ---------------------------------
  useEffect(() => {
    if (phase !== "idle") return;

    const reduced = getExperienceState().reducedMotion;

    if (!activeSection) {
      // Revert zoom (and resume the idle drift) when clearing active section
      gsap.to(cameraState, {
        zOffset: 0,
        drift: 1,
        duration: reduced ? 0.4 : 1.5,
        ease: "glide",
        overwrite: "auto",
      });
      return;
    }

    const section = sections.find((s) => s.title === activeSection);
    if (!section) return;

    // Fit-based dolly: in for compact sections, back for oversized ones.
    const targetZOffset = sectionZoomOffset(section);

    // Re-aim along the shortest arc from wherever the visitor is looking.
    const yawGoal =
      cameraState.targetYaw + shortestAngle(cameraState.targetYaw, section.yaw);
      
    gsap.to(cameraState, {
      targetYaw: yawGoal,
      // Aim a touch above the grid centre so the floating section title and
      // the bottom nav bar both get breathing room in the frame.
      targetPitch: section.pitch + 0.05,
      zOffset: targetZOffset,
      drift: 0, // hold the framing still — no idle slide while reading a section
      duration: reduced ? 0.4 : 2.2, // increased duration for majestic pan
      ease: "cinema", // luxurious, slow start and smooth settle
      overwrite: "auto",
    });
  }, [activeSection, sections, phase]);

  // Reduced motion: still the floating immediately.
  const reducedMotion = useExperience((s) => s.reducedMotion);
  useEffect(() => {
    if (!reducedMotion) return;
    cardRegistry.forEach((h) => {
      h.anim.floatAmp = 0;
    });
  }, [reducedMotion]);

  return (
    <group>
      {sections.map((section) => (
        <SectionPanel key={`panel-${section.title}`} section={section} />
      ))}
      <SectionLabels sections={sections} />
      {placements.map((placement) => (
        <GalleryCard
          key={placement.card.slug}
          placement={placement}
          onReady={handleCardReady}
        />
      ))}
    </group>
  );
}

export { FOCUS_DISTANCE };
