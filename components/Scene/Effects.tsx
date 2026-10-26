"use client";

import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { Effect } from "postprocessing";
import { Uniform } from "three";
import { cameraState } from "@/lib/cameraState";
import { getExperienceState } from "@/lib/store";

/**
 * Grip lens: while the visitor holds a drag the whole frame bows outward a
 * few percent — like pressing on curved glass — and relaxes flat on release.
 * Corner samples are pinned at 1.0 so the warp never reads outside the
 * framebuffer (no edge smearing).
 */
const fragmentShader = /* glsl */ `
  uniform float uStrength;

  void mainUv(inout vec2 uv) {
    vec2 c = uv - 0.5;
    float r2 = dot(c, c); // 0 at centre, 0.5 at the corners
    uv = 0.5 + c * (1.0 - uStrength * (0.5 - r2));
  }
`;

class GripLensEffect extends Effect {
  constructor() {
    super("GripLensEffect", fragmentShader, {
      uniforms: new Map<string, Uniform>([["uStrength", new Uniform(0)]]),
    });
  }
}

export function Effects() {
  const effect = useMemo(() => new GripLensEffect(), []);
  // The composer only takes over the render loop while the warp is actually
  // visible — at rest the scene renders through the default (native-AA,
  // no fullscreen pass) path, which keeps idle frames cheap and the cursor
  // responsive on weaker GPUs.
  const [active, setActive] = useState(false);
  const activeRef = useRef(false);
  const quietFrames = useRef(0);

  useFrame(() => {
    const reduced = getExperienceState().reducedMotion;
    const s = cameraState;
    // Grip does most of the work; a whisper of released momentum keeps the
    // glass breathing while the throw decays.
    const momentum = Math.min(
      0.035,
      (Math.abs(s.velocityYaw) + Math.abs(s.velocityPitch)) * 0.02
    );
    const strength = reduced ? 0 : s.grip * 0.1 + momentum;
    effect.uniforms.get("uStrength")!.value = strength;

    // Hysteresis so the composer doesn't flap at the threshold.
    if (strength > 0.003) {
      quietFrames.current = 0;
      if (!activeRef.current) {
        activeRef.current = true;
        setActive(true);
      }
    } else if (activeRef.current && ++quietFrames.current > 30) {
      activeRef.current = false;
      setActive(false);
    }
  });

  return (
    <EffectComposer enabled={active} multisampling={4}>
      <primitive object={effect} />
    </EffectComposer>
  );
}
