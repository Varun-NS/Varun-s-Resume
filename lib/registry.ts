import type * as THREE from "three";

/**
 * Animatable proxy for a single card. GSAP tweens these plain numbers;
 * the card's useFrame applies them to the mesh/material every frame.
 */
export interface CardAnim {
  opacity: number;
  brightness: number;
  scale: number;
  /** Inward lift along the card's normal (world units). */
  lift: number;
  /** 0 = seated on the sphere, 1 = flown to the focus point. */
  focus: number;
  /** Multiplier for idle float amplitude, tweened out during focus. */
  floatAmp: number;
}

export interface CardHandle {
  slug: string;
  index: number;
  sectionTitle: string;
  group: THREE.Group;
  anim: CardAnim;
  /** Unit direction from sphere centre to the card. */
  direction: THREE.Vector3;
  basePosition: THREE.Vector3;
}

/** slug → live handle for every mounted card. */
export const cardRegistry = new Map<string, CardHandle>();
