"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { atmosphereVertex, atmosphereFragment } from "@/shaders/atmosphere";
import { useExperience } from "@/lib/store";
import { themes } from "@/lib/theme";

/** The room itself — an inverted sphere with a faint horizon gradient. */
export function Atmosphere() {
  const theme = useExperience((s) => s.theme);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: atmosphereVertex,
        fragmentShader: atmosphereFragment,
        uniforms: {
          uDeep: { value: new THREE.Color("#000000") },
          uBand: { value: new THREE.Color("#03040a") },
        },
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    []
  );

  useEffect(() => {
    const spec = themes[theme];
    (material.uniforms.uDeep.value as THREE.Color).set(spec.atmosphereDeep);
    (material.uniforms.uBand.value as THREE.Color).set(spec.atmosphereBand);
  }, [material, theme]);

  return (
    <mesh material={material} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[150, 32, 24]} />
    </mesh>
  );
}
