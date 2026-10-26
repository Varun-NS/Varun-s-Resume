"use client";

import { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useExperience } from "@/lib/store";
import { themes } from "@/lib/theme";
import type { SectionPlacement } from "@/lib/sphere";
import { SPHERE_RADIUS } from "@/lib/sphere";

interface SectionPanelProps {
  section: SectionPlacement;
}

export function SectionPanel({ section }: SectionPanelProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const activeSection = useExperience((s) => s.activeSection);
  const theme = useExperience((s) => s.theme);

  // Create a perfectly curved spherical patch centered on -Z axis
  const geometry = useMemo(() => {
    // We want the panel behind the cards (which are at SPHERE_RADIUS 100)
    // So the panel radius must be > 100 (e.g. 101.5)
    const panelRadius = SPHERE_RADIUS * 1.015;

    // In three.js SphereGeometry, x = -r·cos(phi)·sin(theta) and
    // z = r·sin(phi)·sin(theta), so the -Z axis sits at phi = 3π/2.
    // Centering the patch there makes the group's (pitch, yaw) rotation
    // land it exactly behind its section's card grid.
    const phiStart = Math.PI * 1.5 - section.panelWidthAngle / 2;
    const phiLength = section.panelWidthAngle;
    
    // The equator is at theta = Math.PI / 2
    const thetaStart = Math.PI / 2 - section.panelHeightAngle / 2;
    const thetaLength = section.panelHeightAngle;

    return new THREE.SphereGeometry(
      panelRadius,
      48, // higher segments for smoother specular highlights
      48, 
      phiStart,
      phiLength,
      thetaStart,
      thetaLength
    );
  }, [section.panelWidthAngle, section.panelHeightAngle]);

  const material = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: 0x111115, // retinted per theme below
      emissive: 0x222230,
      emissiveIntensity: 0.0,
      transparent: true,
      opacity: 0.15, // premium dark translucent glass
      roughness: 0.45,
      metalness: 0.25, // low metalness — high values blow out to white under strong light
      clearcoat: 0.6,
      clearcoatRoughness: 0.25,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }, []);

  useEffect(() => {
    const spec = themes[theme];
    material.color.setHex(spec.panelColor);
    material.emissive.setHex(spec.panelEmissive);
    // Daylight walls must be matte: with gloss/clearcoat, the directional
    // lights sweep bright specular patches across the background as the
    // camera drifts with the pointer — it reads as white flashes on paper.
    material.roughness = theme === "light" ? 0.95 : 0.45;
    material.metalness = theme === "light" ? 0 : 0.25;
    material.clearcoat = theme === "light" ? 0 : 0.6;
  }, [material, theme]);

  const euler = useMemo(
    () => new THREE.Euler(section.pitch, section.yaw, 0, "YXZ"),
    [section.pitch, section.yaw]
  );

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const isActive = activeSection === section.title;
    const hasActive = activeSection !== null;
    const light = theme === "light";

    mesh.visible = !light;

    // Target states — the daylight room keeps its walls quiet.
    const targetOpacity = isActive ? (light ? 0.2 : 0.3) : (hasActive ? 0.04 : (light ? 0.1 : 0.15));
    const targetEmissive = isActive ? (light ? 0.12 : 0.5) : (hasActive ? 0.0 : (light ? 0.03 : 0.1));
    const targetScale = isActive ? 0.995 : 1.0;

    // Smooth interpolation
    material.opacity += (targetOpacity - material.opacity) * 0.05;
    material.emissiveIntensity += (targetEmissive - material.emissiveIntensity) * 0.05;
    mesh.scale.setScalar(mesh.scale.x + (targetScale - mesh.scale.x) * 0.05);
  });

  return (
    <group rotation={euler}>
      <mesh ref={meshRef} geometry={geometry} material={material} renderOrder={-5} />
    </group>
  );
}
