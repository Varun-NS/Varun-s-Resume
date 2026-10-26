"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";
import { CameraRig } from "@/components/Camera/CameraRig";
import { Gallery } from "@/components/Gallery/Gallery";
import { useExperience } from "@/lib/store";
import { themes } from "@/lib/theme";
import { Atmosphere } from "./Atmosphere";
import { Effects } from "./Effects";
import { Sparkles } from "@react-three/drei";

/** Widen the field of view on narrow screens so the room stays immersive. */
function ResponsiveFov() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const width = useThree((s) => s.size.width);

  useEffect(() => {
    camera.fov = width < 640 ? 78 : width < 1024 ? 68 : 60;
    camera.updateProjectionMatrix();
  }, [camera, width]);
  return null;
}

/** Keep clear color and fog in step with the active theme. */
function SceneTheme() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const theme = useExperience((s) => s.theme);

  useEffect(() => {
    const spec = themes[theme];
    gl.setClearColor(spec.clear);
    if (scene.fog) (scene.fog as THREE.Fog).color.set(spec.fog);
  }, [gl, scene, theme]);
  return null;
}

export function Experience() {
  const theme = useExperience((s) => s.theme);
  const mode = useExperience((s) => s.mode);
  const sparkles = themes[theme].sparkles;

  return (
    <Canvas
      // The scene stays mounted behind the simple page so switching back is
      // instant, but it stops drawing frames while hidden.
      frameloop={mode === "immersive" ? "always" : "never"}
      dpr={[1, 2]}
      camera={{ fov: 60, near: 0.1, far: 260, position: [0, 0, 18] }}
      gl={{
        antialias: true, // Turn native AA back on
        powerPreference: "high-performance",
      }}
      onCreated={({ gl }) => {
        gl.setClearColor(themes[getInitialTheme()].clear);
        gl.toneMapping = THREE.ACESFilmicToneMapping;
      }}
    >
      <ResponsiveFov />
      <SceneTheme />

      {/* Distance fog gives the shell its depth falloff. Near/far are tuned
          so cards seated at the sphere radius stay readable. SceneTheme
          recolors it live. */}
      <fog attach="fog" args={["#000000", 60, 220]} />

      {/* Lighting only touches the section panels (cards are unlit). The
          dark room can afford drama; daylight must stay under 1.0 total on
          white surfaces or the panels clip to pure white — especially while
          dragging, when the composer path skips ACES tone mapping. */}
      {theme === "dark" ? (
        <>
          <ambientLight intensity={1.5} />
          <directionalLight position={[10, 20, 15]} intensity={0.8} />
          {/* Subtle blue rim light from below */}
          <directionalLight position={[-10, -20, -15]} intensity={0.3} color="#4060ff" />
        </>
      ) : (
        <>
          <ambientLight intensity={0.75} />
          <directionalLight position={[10, 20, 15]} intensity={0.2} color="#fff6e6" />
        </>
      )}

      {/* Atmospheric dust — additive, so it only exists in the dark room.
          Kept sparse: it's a hint of depth, not weather. */}
      {sparkles && (
        <Sparkles count={120} scale={180} size={1.5} speed={0.2} opacity={0.08} color="#a0c0ff" />
      )}

      <Atmosphere />
      <CameraRig />
      <Gallery />
      <Effects />
    </Canvas>
  );
}

/** onCreated runs before the store sync effect — read the DOM stamp direct. */
function getInitialTheme(): "dark" | "light" {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}
