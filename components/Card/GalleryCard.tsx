"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { CardPlacement } from "@/lib/sphere";
import { createCardTexture } from "@/lib/cardTexture";
import { cardRegistry, type CardAnim } from "@/lib/registry";
import {
  getExperienceState,
  setExperienceState,
  useExperience,
} from "@/lib/store";
import { themes } from "@/lib/theme";
import { audio } from "@/lib/audio";

/** How close (world units) a focused card flies toward the visitor. */
export const FOCUS_DISTANCE = 26;

interface GalleryCardProps {
  placement: CardPlacement;
  onReady: () => void;
}

const tmpPos = new THREE.Vector3();
const tmpFocus = new THREE.Vector3();

/**
 * Memoized: the Gallery re-renders on store changes (hover, phase) but a
 * card's props never change, so the 44 meshes stay untouched by React.
 */
export const GalleryCard = memo(function GalleryCard({
  placement,
  onReady,
}: GalleryCardProps) {
  const {
    card,
    position,
    quaternion,
    width,
    height,
    floatPhase,
    floatSpeed,
    tilt,
  } = placement;
  const gl = useThree((s) => s.gl);
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  const anim = useMemo<CardAnim>(
    () => ({
      opacity: 0,
      brightness: 1,
      scale: 0.4,
      lift: 0,
      focus: 0,
      floatAmp: 1,
    }),
    []
  );

  const basePosition = useMemo(() => new THREE.Vector3(...position), [position]);
  const direction = useMemo(() => basePosition.clone().normalize(), [basePosition]);

  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        toneMapped: false,
        depthWrite: false,
      }),
    []
  );

  // Orient once: the plane's +Z looks back at the sphere's centre, upright
  // in its section's frame.
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    group.position.copy(basePosition);
    group.quaternion.fromArray(quaternion);
  }, [basePosition, quaternion]);

  // Register with the shared choreography registry.
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    cardRegistry.set(card.slug, {
      slug: card.slug,
      index: placement.index,
      sectionTitle: placement.sectionTitle,
      group,
      anim,
      direction,
      basePosition,
    });
    return () => {
      cardRegistry.delete(card.slug);
    };
  }, [card.slug, placement.index, anim, direction, basePosition]);

  // Bake the card texture (image + type + chips) and hand it to the GPU.
  // Re-runs on theme change: images come from cache, so a full re-bake of
  // the room is a beat of canvas work, not a reload.
  const theme = useExperience((s) => s.theme);
  const readyOnce = useRef(false);
  useEffect(() => {
    let live = true;
    createCardTexture(card, width / height, gl, theme)
      .then((tex) => {
        if (!live) {
          tex.dispose();
          return;
        }
        const old = material.map as THREE.Texture | null;
        material.map = tex;
        material.needsUpdate = true;
        old?.dispose();
        if (!readyOnce.current) {
          readyOnce.current = true;
          onReady();
        }
      })
      .catch(() => {
        // Never let one bad asset stall the room.
        if (live && !readyOnce.current) {
          readyOnce.current = true;
          onReady();
        }
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  // GPU resources live exactly as long as the mesh.
  useEffect(() => {
    return () => {
      (material.map as THREE.Texture | null)?.dispose();
      material.dispose();
    };
  }, [material]);

  // ---- Per-frame motion ----------------------------------------------------
  useFrame(({ clock }) => {
    const group = groupRef.current;
    const mesh = meshRef.current;
    if (!group || !mesh) return;

    const t = clock.elapsedTime;

    // Idle breathing: a slow bob along the card's normal plus a whisper of
    // roll. Amplitudes are tiny by design — alive, not busy.
    const bob = Math.sin(t * floatSpeed + floatPhase) * 0.6 * anim.floatAmp;
    tmpPos
      .copy(basePosition)
      .addScaledVector(direction, -(anim.lift + bob));

    if (anim.focus > 0) {
      // Flight path: seat on the shell → point in front of the visitor.
      tmpFocus.copy(direction).multiplyScalar(FOCUS_DISTANCE);
      tmpPos.lerp(tmpFocus, anim.focus);
    }
    group.position.copy(tmpPos);

    const breathe = 1 + Math.sin(t * 0.4 + floatPhase) * 0.006 * anim.floatAmp;
    const scale = anim.scale * (1 + anim.focus * 0.12) * breathe;
    mesh.scale.setScalar(scale);
    mesh.rotation.z =
      tilt + Math.sin(t * floatSpeed * 0.6 + floatPhase) * 0.012 * anim.floatAmp;

    material.opacity = anim.opacity;
    const b = anim.brightness;
    material.color.setRGB(b, b, b);

    // A focused card must never be clipped by its old neighbours.
    const focused = anim.focus > 0.001;
    mesh.renderOrder = focused ? 20 : 0;
    material.depthTest = !focused;
  });

  // ---- Interaction ----------------------------------------------------------
  const handleOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const s = getExperienceState();
    if (s.phase !== "idle" || s.dragging) return;
    if (s.hoveredSlug !== card.slug) audio.hover();
    setExperienceState({ hoveredSlug: card.slug });
  };

  const handleOut = () => {
    if (getExperienceState().hoveredSlug === card.slug) {
      setExperienceState({ hoveredSlug: null });
    }
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    // A real click, not the tail end of a drag.
    if (e.delta > 6) return;
    const s = getExperienceState();
    if (s.phase !== "idle") return;
    setExperienceState({
      phase: "focusing",
      focusedSlug: card.slug,
      hoveredSlug: null,
    });
  };

  return (
    <group ref={groupRef}>
      <mesh
        ref={meshRef}
        material={material}
        onPointerOver={handleOver}
        onPointerOut={handleOut}
        onClick={handleClick}
      >
        <planeGeometry args={[width, height]} />
        {card.eyebrow && <CardEyebrow eyebrow={card.eyebrow} width={width} height={height} anim={anim} material={material} />}
      </mesh>
    </group>
  );
});

function CardEyebrow({ eyebrow, width, height, anim, material: parentMaterial }: { eyebrow: string; width: number; height: number; anim: any; material: THREE.MeshBasicMaterial }) {
  const gl = useThree((s) => s.gl);
  const theme = useExperience((s) => s.theme);
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthTest: false,
        depthWrite: false,
      }),
    []
  );

  useEffect(() => {
    let cancelled = false;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // next/font registers Space Grotesk under a generated family name, so
    // resolve it from the CSS variable rather than asking for it by name.
    const family =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--font-display")
        .trim() || "system-ui, sans-serif";
    const weight = 700;

    const draw = () => {
      if (cancelled) return;

      // Room for two lines: long titles (e.g. "Innovation Lead (AI &
      // Product Management)") wrap instead of shrinking to illegibility.
      const canvasW = 1024;
      const canvasH = 256;
      const maxW = canvasW - 40;
      canvas.width = canvasW;
      canvas.height = canvasH;

      ctx.clearRect(0, 0, canvasW, canvasH);
      ctx.fillStyle = themes[theme].eyebrow;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.letterSpacing = "2px"; // Bold glyphs are wide; keep tracking tight

      const text = eyebrow.toUpperCase();
      const widest = (lines: string[], size: number) => {
        ctx.font = `${weight} ${size}px ${family}`;
        return Math.max(...lines.map((l) => ctx.measureText(l).width));
      };

      // One line as large as fits; below 50px, wrap into two balanced lines.
      let fontSize = 64;
      let lines = [text];
      while (widest(lines, fontSize) > maxW && fontSize > 50) fontSize -= 2;
      if (widest(lines, fontSize) > maxW) {
        const words = text.split(" ");
        let best = lines;
        let bestW = Infinity;
        for (let i = 1; i < words.length; i++) {
          const pair = [words.slice(0, i).join(" "), words.slice(i).join(" ")];
          const w = widest(pair, fontSize);
          if (w < bestW) {
            bestW = w;
            best = pair;
          }
        }
        lines = best;
        fontSize = 60;
        while (widest(lines, fontSize) > maxW && fontSize > 28) fontSize -= 2;
      }
      ctx.font = `${weight} ${fontSize}px ${family}`;

      // The last line sits at 3/4 height so the line nearest the card stays
      // put; a second line grows upward.
      const lineH = fontSize * 1.1;
      lines.forEach((line, i) => {
        const y = canvasH * 0.75 - (lines.length - 1 - i) * lineH;
        ctx.fillText(line, canvasW / 2, y);
      });

      const tex = new THREE.CanvasTexture(canvas);
      // The canvas is power-of-two, so mipmaps keep the downscaled text
      // smooth instead of crunchy when the card sits far from the camera.
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.anisotropy = gl.capabilities.getMaxAnisotropy();
      tex.generateMipmaps = true;

      const old = material.map as THREE.Texture | null;
      setTexture(tex);
      material.map = tex;
      material.needsUpdate = true;
      old?.dispose();
    };

    document.fonts
      .load(`${weight} 64px ${family}`)
      .catch(() => {
        // Fonts failing to resolve is cosmetic — system fallbacks are fine.
      })
      .then(draw);

    return () => {
      cancelled = true;
    };
  }, [eyebrow, gl, material, theme]);

  useEffect(() => {
    return () => {
      (material.map as THREE.Texture | null)?.dispose();
      material.dispose();
    };
  }, [material]);

  useFrame(() => {
    if (!meshRef.current) return;
    material.opacity = anim.opacity;
    material.depthTest = parentMaterial.depthTest;
  });

  if (!texture) return null;

  // Canvas aspect is 4:1 (1024x256). Let it overhang the card slightly so
  // long titles stay large — the grid gutters leave room either side. The
  // offset seats the bottom text line (3/4 down the canvas) just above the
  // card.
  const labelW = width * 1.2;
  const labelH = labelW / 4;
  const yOffset = height / 2 + labelW * 0.0875 + labelH * 0.25;

  return (
    <mesh ref={meshRef} material={material} position={[0, yOffset, 0]}>
      <planeGeometry args={[labelW, labelH]} />
    </mesh>
  );
}
