"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { atmosphereVertex, atmosphereFragment } from "@/shaders/atmosphere";

/** The dark room itself — an inverted sphere with a faint horizon gradient. */
export function Atmosphere() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: atmosphereVertex,
        fragmentShader: atmosphereFragment,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    []
  );

  return (
    <mesh material={material} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[150, 32, 24]} />
    </mesh>
  );
}
