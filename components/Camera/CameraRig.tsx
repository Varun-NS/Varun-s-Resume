"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { gsap } from "gsap";
import { cameraState, PITCH_LIMIT } from "@/lib/cameraState";
import { damp, clamp } from "@/lib/motion";
import { getExperienceState, setExperienceState } from "@/lib/store";
import { audio } from "@/lib/audio";

// Tuned by hand: sensitivity converts pixels to radians; the two lambdas
// give a tight feel under the finger and a heavy, expensive settle after.
const SENS_YAW = 0.0031;
const SENS_PITCH = 0.0026;
const FOLLOW_DRAGGING = 9.5;
const FOLLOW_RELEASED = 4.0;
const MOMENTUM_DECAY = 2.0; // exponential decay rate of released velocity
const DRIFT_SPEED = 0.018; // idle auto-rotation, rad/s
const PARALLAX_X = 1.5;
const PARALLAX_Y = 1.1;

/**
 * Custom look-around controls for a camera seated inside the sphere.
 * No OrbitControls: yaw/pitch targets are written by pointer input and
 * keyboard, momentum carries them after release, and the actual camera
 * angles chase the targets with framerate-independent damping — the same
 * double-smoothed model that makes Lenis scrolling feel liquid.
 */
export function CameraRig() {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const dragRef = useRef(false);

  useEffect(() => {
    camera.rotation.order = "YXZ";
  }, [camera]);

  useEffect(() => {
    const el = gl.domElement;
    let lastX = 0;
    let lastY = 0;
    let lastT = 0;
    let dragDistance = 0;

    const onPointerDown = (e: PointerEvent) => {
      if (!cameraState.inputEnabled || !e.isPrimary) return;
      dragRef.current = true;
      dragDistance = 0;
      lastX = e.clientX;
      lastY = e.clientY;
      lastT = performance.now();
      cameraState.velocityYaw = 0;
      cameraState.velocityPitch = 0;
      // Grabbing the space interrupts any keyboard/idle re-aim in progress.
      gsap.killTweensOf(cameraState);
      el.setPointerCapture(e.pointerId);
      setExperienceState({ dragging: true });
    };

    const onPointerMove = (e: PointerEvent) => {
      // Parallax follows the mouse only — on touch it would fight the drag.
      if (e.pointerType === "mouse") {
        cameraState.parallaxX = (e.clientX / window.innerWidth) * 2 - 1;
        cameraState.parallaxY = (e.clientY / window.innerHeight) * 2 - 1;
      }

      if (!dragRef.current || !e.isPrimary) return;
      const now = performance.now();
      const dt = Math.max(1, now - lastT) / 1000;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      lastT = now;

      // A deliberate drag means the visitor is taking over navigation —
      // release the framed section so the rest of the room lights back up.
      dragDistance += Math.abs(dx) + Math.abs(dy);
      if (dragDistance > 30 && getExperienceState().activeSection) {
        setExperienceState({ activeSection: null });
      }

      cameraState.targetYaw += dx * SENS_YAW;
      cameraState.targetPitch = clamp(
        cameraState.targetPitch + dy * SENS_PITCH,
        -PITCH_LIMIT,
        PITCH_LIMIT
      );

      // Blend instantaneous velocity so a final flick dominates the throw.
      const instYaw = (dx * SENS_YAW) / dt;
      const instPitch = (dy * SENS_PITCH) / dt;
      cameraState.velocityYaw = cameraState.velocityYaw * 0.4 + instYaw * 0.6;
      cameraState.velocityPitch =
        cameraState.velocityPitch * 0.4 + instPitch * 0.6;
    };

    const endDrag = (e: PointerEvent) => {
      if (!dragRef.current || !e.isPrimary) return;
      dragRef.current = false;
      setExperienceState({ dragging: false });
      if (getExperienceState().reducedMotion) {
        cameraState.velocityYaw = 0;
        cameraState.velocityPitch = 0;
      }
      // Cap throw speed so a violent flick still feels controlled.
      cameraState.velocityYaw = clamp(cameraState.velocityYaw, -3.2, 3.2);
      cameraState.velocityPitch = clamp(cameraState.velocityPitch, -2.4, 2.4);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (!cameraState.inputEnabled) return;
      if (getExperienceState().phase !== "idle") return;
      const step = 0.5;
      let dYaw = 0;
      let dPitch = 0;
      if (e.key === "ArrowLeft") dYaw = -step;
      else if (e.key === "ArrowRight") dYaw = step;
      else if (e.key === "ArrowUp") dPitch = step * 0.7;
      else if (e.key === "ArrowDown") dPitch = -step * 0.7;
      else return;
      e.preventDefault();
      gsap.to(cameraState, {
        targetYaw: cameraState.targetYaw + dYaw,
        targetPitch: clamp(
          cameraState.targetPitch + dPitch,
          -PITCH_LIMIT,
          PITCH_LIMIT
        ),
        duration: 1.0,
        ease: "glide",
        overwrite: "auto",
      });
    };

    el.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [gl]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30);
    const s = cameraState;
    const reduced = getExperienceState().reducedMotion;

    if (!dragRef.current && s.inputEnabled) {
      // Momentum: the released throw keeps steering the target while decaying.
      if (s.velocityYaw !== 0 || s.velocityPitch !== 0) {
        s.targetYaw += s.velocityYaw * dt;
        s.targetPitch = clamp(
          s.targetPitch + s.velocityPitch * dt,
          -PITCH_LIMIT,
          PITCH_LIMIT
        );
        const decay = Math.exp(-MOMENTUM_DECAY * dt);
        s.velocityYaw *= decay;
        s.velocityPitch *= decay;
        if (Math.abs(s.velocityYaw) < 0.0004) s.velocityYaw = 0;
        if (Math.abs(s.velocityPitch) < 0.0004) s.velocityPitch = 0;
      }
      // The room slowly turns on its own so it never feels frozen.
      if (!reduced) s.targetYaw += DRIFT_SPEED * s.drift * dt;
    }

    const follow = dragRef.current ? FOLLOW_DRAGGING : FOLLOW_RELEASED;
    s.yaw = damp(s.yaw, s.targetYaw, follow, dt);
    s.pitch = damp(s.pitch, s.targetPitch, follow, dt);

    // Grip: holding the room pulls the camera back a touch; releasing lets
    // it settle forward again. Damped by hand so no tween can strand it.
    const gripTarget = dragRef.current && !reduced ? 1 : 0;
    s.grip = damp(s.grip, gripTarget, dragRef.current ? 6 : 3, dt);

    // The wind bed swells with the camera's energy — grip plus spin.
    audio.setWind(
      s.grip * 0.3 + Math.min(0.7, (Math.abs(s.velocityYaw) + Math.abs(s.velocityPitch)) * 0.35)
    );

    const parallaxScale = reduced ? 0 : s.drift;
    s.parallaxCurrentX = damp(s.parallaxCurrentX, s.parallaxX * parallaxScale, 2.5, dt);
    s.parallaxCurrentY = damp(s.parallaxCurrentY, s.parallaxY * parallaxScale, 2.5, dt);

    camera.rotation.y = s.yaw;
    camera.rotation.x = s.pitch;
    
    // Set position at center + parallax
    camera.position.set(
      s.parallaxCurrentX * PARALLAX_X,
      -s.parallaxCurrentY * PARALLAX_Y,
      0
    );
    // Move along local Z axis so we can walk towards any section on the sphere
    camera.translateZ(s.zOffset + s.grip * 7);
  });

  return null;
}
