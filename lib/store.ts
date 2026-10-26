"use client";

import { useSyncExternalStore } from "react";
import type { ExperiencePhase } from "./types";

/**
 * "simple" is the default scrollable resume; "immersive" is the 3D sphere,
 * mounted only once a visitor asks for it.
 */
export type ViewMode = "simple" | "immersive";

export interface ExperienceState {
  mode: ViewMode;
  phase: ExperiencePhase;
  /** Slug of the card currently focused (detail view) or animating to it. */
  focusedSlug: string | null;
  /** Slug of the card currently hovered in the 3D scene. */
  hoveredSlug: string | null;
  /** Title of the active section navigated to via UI. */
  activeSection: string | null;
  dragging: boolean;
  /** 0..1 texture preload progress. */
  progress: number;
  reducedMotion: boolean;
  /** Visual theme — drives DOM tokens, scene colors and card bakes. */
  theme: "dark" | "light";
}

type Listener = () => void;

let state: ExperienceState = {
  mode: "simple",
  phase: "loading",
  focusedSlug: null,
  hoveredSlug: null,
  activeSection: null,
  dragging: false,
  progress: 0,
  reducedMotion: false,
  theme: "dark",
};

const listeners = new Set<Listener>();

export function getExperienceState(): ExperienceState {
  return state;
}

export function setExperienceState(partial: Partial<ExperienceState>): void {
  let changed = false;
  for (const key of Object.keys(partial) as (keyof ExperienceState)[]) {
    if (state[key] !== partial[key]) {
      changed = true;
      break;
    }
  }
  if (!changed) return;
  state = { ...state, ...partial };
  listeners.forEach((l) => l());
}

export function subscribeExperience(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** React hook — select a slice of the experience state. */
export function useExperience<T>(selector: (s: ExperienceState) => T): T {
  return useSyncExternalStore(
    subscribeExperience,
    () => selector(state),
    () => selector(state)
  );
}
