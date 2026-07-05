"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { SectionPlacement } from "@/lib/sphere";
import { createLabelTexture } from "@/lib/labelTexture";
import { useExperience } from "@/lib/store";

interface SectionLabelsProps {
  sections: SectionPlacement[];
}

export const SectionLabels = memo(function SectionLabels({ sections }: SectionLabelsProps) {
  return (
    <group>
      {sections.map((sec) => (
        <SectionLabel key={sec.title} section={sec} />
      ))}
    </group>
  );
});

function SectionLabel({ section }: { section: SectionPlacement }) {
  const gl = useThree((s) => s.gl);
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const activeSection = useExperience((s) => s.activeSection);
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);

  const basePosition = useMemo(
    () => new THREE.Vector3(...section.labelPosition).multiplyScalar(0.7), // Float slightly in front of cards, positioned above the grid
    [section.labelPosition]
  );

  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.9,
        depthTest: false,
        depthWrite: false,
      }),
    []
  );

  useEffect(() => {
    let live = true;
    createLabelTexture(section.title, gl).then((tex) => {
      if (!live) {
        tex.dispose();
        return;
      }
      setTexture(tex);
      material.map = tex;
      material.needsUpdate = true;
    });
    return () => {
      live = false;
      texture?.dispose();
      material.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section.title]);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    group.position.copy(basePosition);
    group.lookAt(0, 0, 0); // Always face center
  }, [basePosition]);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    // Subtle floating rotation
    const t = clock.elapsedTime;
    mesh.rotation.z = Math.sin(t * 0.5) * 0.02;

    // Subdue label if another section is active — near-invisible, matching
    // the spotlight treatment on the cards.
    const isActive = activeSection === section.title;
    const hasActive = activeSection !== null;
    const targetOpacity = hasActive && !isActive ? 0.06 : 0.9;
    material.opacity += (targetOpacity - material.opacity) * 0.05;
  });

  // The group must mount immediately — the positioning effect above runs on
  // first render, and would never re-run if we waited for the texture.
  return (
    <group ref={groupRef}>
      {texture && (
        <mesh ref={meshRef} material={material} renderOrder={10}>
          <planeGeometry args={[24, 6]} />
        </mesh>
      )}
    </group>
  );
}
