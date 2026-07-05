import * as THREE from "three";
import type { ResumeSection, ResumeCard } from "./types";

export interface CardPlacement {
  card: ResumeCard;
  index: number;
  /** Title of the section this card belongs to */
  sectionTitle: string;
  /** World position on the inside of the sphere. */
  position: [number, number, number];
  /** Plane width/height in world units. */
  width: number;
  height: number;
  /** Per-card deterministic randomness used for idle motion phase, tilt, etc. */
  seed: number;
  floatPhase: number;
  floatSpeed: number;
  tilt: number;
}

export interface SectionPlacement {
  title: string;
  yaw: number;
  pitch: number;
  center: [number, number, number];
  labelPosition: [number, number, number];
  panelWidthAngle: number;
  panelHeightAngle: number;
}

export interface SphereLayout {
  placements: CardPlacement[];
  sections: SectionPlacement[];
}

/**
 * Camera dolly (zOffset) that frames a section: compact sections pull the
 * camera in, oversized ones push it back so their outer rows stay in view.
 * Negative values move the camera toward the section.
 */
export function sectionZoomOffset(section: SectionPlacement): number {
  const maxAngle = Math.max(
    section.panelWidthAngle,
    section.panelHeightAngle
  );
  // Backing off needs a steeper slope than zooming in: an oversized grid
  // wraps around the camera, so every extra radian costs more distance.
  // The back-off cap keeps even the widest section out of heavy fog.
  const gap = 1.6 - maxAngle;
  const offset = -gap * (gap > 0 ? 65 : 220);
  return Math.max(-45, Math.min(25, offset));
}

// Increased radius for massive 360° planetary feel
export const SPHERE_RADIUS = 100;

/** Deterministic pseudo-random in [0,1) so SSR and client agree. */
function seeded(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Distribute cards on a sphere by section.
 * Each section gets a dynamically computed sector based on a 3-band world map layout.
 */
export function buildPlacements(
  sections: ResumeSection[],
  radius: number = SPHERE_RADIUS
): SphereLayout {
  let globalIndex = 0;
  
  const placements: CardPlacement[] = [];
  const sectionPlacements: SectionPlacement[] = [];

  // Increased spacing angles to accommodate larger cards
  const cardWidthAngle = 0.36;
  const cardHeightAngle = 0.45;

  // Latitudinal separation of ~45 degrees (0.8 rad)
  const pitchTop = 0.8;
  const pitchMid = 0.0;
  const pitchBottom = -0.8;

  // Grid per section, capped at 2 rows: rows stacked toward a pole converge
  // and overlap, so big sections grow sideways instead of upward.
  const grids = sections.map((section) => {
    const n = section.cards.length;
    let cols = 1;
    let rows = 1;
    if (n > 3) {
      rows = 2;
      cols = Math.ceil(n / 2);
    } else if (n > 0) {
      cols = n;
    }
    return { cols, rows };
  });

  // Partition into latitude bands. Wide sections (4+ columns) only stay
  // readable at the equator, so they claim it first; the earliest resume
  // sections fill the remaining equator slots (section one keeps yaw 0 —
  // dead ahead of the initial camera). Everything else splits top/bottom.
  const equatorIdx: number[] = [];
  sections.forEach((_, i) => {
    if (grids[i].cols >= 4) equatorIdx.push(i);
  });
  for (let i = 0; i < sections.length && equatorIdx.length < 3; i++) {
    if (!equatorIdx.includes(i)) equatorIdx.push(i);
  }
  equatorIdx.sort((a, b) => a - b);
  const restIdx = sections
    .map((_, i) => i)
    .filter((i) => !equatorIdx.includes(i));
  const topIdx = restIdx.slice(0, Math.ceil(restIdx.length / 2));
  const bottomIdx = restIdx.slice(Math.ceil(restIdx.length / 2));

  sections.forEach((section, sIdx) => {
    let indexInBand: number, countInBand: number, pitch: number, baseYaw: number;

    if (equatorIdx.includes(sIdx)) {
      indexInBand = equatorIdx.indexOf(sIdx);
      countInBand = equatorIdx.length;
      pitch = pitchMid;
      baseYaw = 0;
    } else if (topIdx.includes(sIdx)) {
      indexInBand = topIdx.indexOf(sIdx);
      countInBand = topIdx.length;
      pitch = pitchTop;
      baseYaw = Math.PI / Math.max(1, countInBand); // sit between equator sections
    } else {
      indexInBand = bottomIdx.indexOf(sIdx);
      countInBand = bottomIdx.length;
      pitch = pitchBottom;
      baseYaw = Math.PI / Math.max(1, countInBand);
    }

    // Spread evenly across 360 degrees (2*PI) in longitude
    const yaw = baseYaw + (indexInBand * (2 * Math.PI)) / Math.max(1, countInBand);
    const sector = { pitch, yaw };

    const n = section.cards.length;
    const { cols, rows } = grids[sIdx];

    // Calculate exact center position of this section's region
    const centerEuler = new THREE.Euler(sector.pitch, sector.yaw, 0, "YXZ");
    const centerVec = new THREE.Vector3(0, 0, -radius).applyEuler(centerEuler);

    // Label goes above the top row — close enough to stay inside the FOV
    // when the camera frames the section.
    const topRowPitchOffset = ((rows - 1) / 2) * cardHeightAngle;
    const labelPitch = sector.pitch + topRowPitchOffset + 0.28;
    const labelEuler = new THREE.Euler(labelPitch, sector.yaw, 0, "YXZ");
    const labelVec = new THREE.Vector3(0, 0, -radius).applyEuler(labelEuler);

    // Away from the equator, meridians converge: a fixed yaw step shrinks to
    // yawStep·cos(pitch) of real distance. Widen the step so the physical
    // gap between columns stays constant on every row.
    const rowYawStep = (rowPitch: number) =>
      cardWidthAngle / Math.max(0.45, Math.cos(rowPitch));
    const widestRowStep = rowYawStep(
      Math.abs(sector.pitch) + topRowPitchOffset
    );

    // Panel angular size (with generous 8-12% padding)
    const paddingAngle = 0.25;
    const panelWidthAngle = Math.max(1, cols - 1) * widestRowStep + 2 * paddingAngle;
    // Extra top padding for the label and larger cards
    const panelHeightAngle = Math.max(1, rows - 1) * cardHeightAngle + 2 * paddingAngle + 0.35;

    sectionPlacements.push({
      title: section.title,
      yaw: sector.yaw,
      pitch: sector.pitch,
      center: [centerVec.x, centerVec.y, centerVec.z],
      labelPosition: [labelVec.x, labelVec.y, labelVec.z],
      panelWidthAngle,
      panelHeightAngle,
    });

    section.cards.forEach((card, i) => {
      const r = Math.floor(i / cols);
      const itemsInRow = (r === rows - 1) ? n - (r * cols) : cols;
      const c = i % cols;

      const localPitch = - (r - (rows - 1) / 2) * cardHeightAngle;
      const cardPitch = sector.pitch + localPitch;
      const localYaw = (c - (itemsInRow - 1) / 2) * rowYawStep(cardPitch);
      const cardYaw = sector.yaw + localYaw;
      const euler = new THREE.Euler(cardPitch, cardYaw, 0, "YXZ");
      const vec = new THREE.Vector3(0, 0, -radius).applyEuler(euler);

      // Uniform cards for clean exhibition grid
      const scale = 2.4; // 25% larger cards
      const aspect = 0.74;
      const height = 9.4 * scale;
      const width = height * aspect;
      
      const seed = seeded(globalIndex + 1);

      placements.push({
        card,
        index: globalIndex,
        sectionTitle: section.title,
        position: [vec.x, vec.y, vec.z],
        width,
        height,
        seed,
        floatPhase: seed * Math.PI * 2,
        floatSpeed: 0.35 + seeded(globalIndex + 71) * 0.4,
        tilt: (seeded(globalIndex + 97) - 0.5) * 0.03, // Very subtle random tilt
      });

      globalIndex++;
    });
  });

  return { placements, sections: sectionPlacements };
}
