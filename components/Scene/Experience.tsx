"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";
import { CameraRig } from "@/components/Camera/CameraRig";
import { Gallery } from "@/components/Gallery/Gallery";
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

export function Experience() {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ fov: 60, near: 0.1, far: 260, position: [0, 0, 18] }}
      gl={{
        antialias: true, // Turn native AA back on
        powerPreference: "high-performance",
      }}
      onCreated={({ gl }) => {
        gl.setClearColor("#000000"); // True black for premium contrast
        gl.toneMapping = THREE.ACESFilmicToneMapping;
      }}
    >
      <ResponsiveFov />

      {/* Distance fog gives the shell its depth falloff. Near/far are tuned
          so cards seated at the sphere radius stay readable. */}
      <fog attach="fog" args={["#000000", 60, 220]} />

      {/* Premium Environment Lighting */}
      <ambientLight intensity={1.5} />
      <directionalLight position={[10, 20, 15]} intensity={0.8} />
      {/* Subtle blue rim light from below */}
      <directionalLight position={[-10, -20, -15]} intensity={0.3} color="#4060ff" />
      
      {/* Atmospheric volumetric dust */}
      <Sparkles count={400} scale={180} size={1.5} speed={0.2} opacity={0.15} color="#a0c0ff" />

      <Atmosphere />
      <CameraRig />
      <Gallery />
      <Effects />
    </Canvas>
  );
}
