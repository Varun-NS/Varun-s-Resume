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
} from "@/lib/store";
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
  const { card, position, width, height, floatPhase, floatSpeed, tilt } =
    placement;
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

  // Orient once: the plane's +Z looks back at the sphere's centre.
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    group.position.copy(basePosition);
    group.lookAt(0, 0, 0);
  }, [basePosition]);

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
  useEffect(() => {
    let live = true;
    let texture: THREE.CanvasTexture | null = null;
    createCardTexture(card, width / height, gl)
      .then((tex) => {
        if (!live) {
          tex.dispose();
          return;
        }
        texture = tex;
        material.map = tex;
        material.needsUpdate = true;
        onReady();
      })
      .catch(() => {
        if (live) onReady(); // never let one bad asset stall the room
      });
    return () => {
      live = false;
      texture?.dispose();
      material.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    audio.open();
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
    let live = true;
    
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;
    
    // Wider canvas to fit long titles (e.g. "Business Development Associate")
    const canvasW = 1024;
    const canvasH = 128;
    canvas.width = canvasW;
    canvas.height = canvasH;
    
    ctx.clearRect(0, 0, canvasW, canvasH);
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    const text = eyebrow.toUpperCase();
    
    // Start with a large font, scale down if it exceeds the canvas width
    let fontSize = 64;
    ctx.font = `300 ${fontSize}px 'Space Grotesk', system-ui, sans-serif`;
    ctx.letterSpacing = "4px"; // Standard letter spacing

    while (ctx.measureText(text).width > canvasW - 40 && fontSize > 20) {
      fontSize -= 2;
      ctx.font = `300 ${fontSize}px 'Space Grotesk', system-ui, sans-serif`;
      // Reduce letter spacing slightly for very small fonts to save space
      if (fontSize < 40) ctx.letterSpacing = "2px";
    }
    
    ctx.fillText(text, canvasW / 2, canvasH / 2);
    
    const tex = new THREE.CanvasTexture(canvas);
    // The canvas is power-of-two, so mipmaps keep the downscaled text
    // smooth instead of crunchy when the card sits far from the camera.
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = gl.capabilities.getMaxAnisotropy();
    tex.generateMipmaps = true;

    if (!live) {
      tex.dispose();
      return;
    }
    
    setTexture(tex);
    material.map = tex;
    material.needsUpdate = true;

    return () => {
      live = false;
      tex.dispose();
      material.dispose();
    };
  }, [eyebrow, gl, material]);

  useFrame(() => {
    if (!meshRef.current) return;
    material.opacity = anim.opacity;
    material.depthTest = parentMaterial.depthTest;
  });

  if (!texture) return null;

  // Canvas aspect is 8:1 (1024x128). We can let it span the full width of the card.
  const labelW = width * 0.95;
  const labelH = labelW / 8;
  const yOffset = height / 2 + labelH * 0.7;

  return (
    <mesh ref={meshRef} material={material} position={[0, yOffset, 0]}>
      <planeGeometry args={[labelW, labelH]} />
    </mesh>
  );
}
