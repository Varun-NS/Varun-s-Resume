import { setExperienceState } from "./store";

/**
 * The two rooms: "dark" is the original planetarium-at-midnight; "light" is
 * the same sphere reimagined as a bright gallery rotunda — warm paper walls,
 * ink type, white cards. Everything themed (DOM chrome, canvas clear color,
 * fog, baked card bitmaps) reads from this single table.
 */

export type ThemeName = "dark" | "light";

export interface CardPalette {
  bodyTop: string;
  bodyBottom: string;
  border: string;
  title: string;
  meta: string;
  metaDim: string;
  /** Overlay drawn on cover-fit photos so they sit into the card. */
  imageScrim: string;
  /** HSL lightness pair for the no-image fallback gradient. */
  fallbackLightness: [number, number];
}

export interface ThemeSpec {
  /** Canvas clear color — must match the page background. */
  clear: string;
  fog: string;
  atmosphereDeep: string;
  atmosphereBand: string;
  /** Dust motes only make sense in the dark room (additive blending). */
  sparkles: boolean;
  veil: string;
  veilClear: string;
  panelColor: number;
  panelEmissive: number;
  /** Fill for baked 3D section labels / card eyebrows. */
  label: string;
  /** Fill for the role title above each experience card. */
  eyebrow: string;
  card: CardPalette;
}

export const themes: Record<ThemeName, ThemeSpec> = {
  dark: {
    clear: "#050505",
    fog: "#000000",
    atmosphereDeep: "#000000",
    atmosphereBand: "#03040a",
    sparkles: true,
    veil: "rgba(2,2,2,0.52)",
    veilClear: "rgba(2,2,2,0)",
    panelColor: 0x111115,
    panelEmissive: 0x222230,
    label: "rgba(255,255,255,0.78)",
    eyebrow: "rgba(250,249,245,0.95)",
    card: {
      bodyTop: "#15151a",
      bodyBottom: "#0d0d10",
      border: "rgba(255,255,255,0.18)",
      title: "rgba(250,249,245,0.98)",
      meta: "rgba(255,255,255,0.86)",
      metaDim: "rgba(255,255,255,0.7)",
      imageScrim: "rgba(5,5,5,0.10)",
      // Bright enough that a failed image reads as a deliberate tinted
      // panel, not a hole in the card.
      fallbackLightness: [28, 18],
    },
  },
  light: {
    clear: "#f2efe7",
    fog: "#f2efe7",
    atmosphereDeep: "#f6f4ed",
    atmosphereBand: "#e0dbcc",
    sparkles: false,
    veil: "rgba(242,239,231,0.6)",
    veilClear: "rgba(242,239,231,0)",
    // Paper, not white — under the daylight lights a pure-white panel still
    // reads as a bright sheet whenever it fills the background.
    panelColor: 0xe9e5d8,
    panelEmissive: 0xfff6e0,
    label: "rgba(30,29,24,0.78)",
    eyebrow: "rgba(28,27,22,0.92)",
    card: {
      bodyTop: "#fffefb",
      bodyBottom: "#f3f0e8",
      border: "rgba(28,27,22,0.16)",
      title: "rgba(28,27,22,0.96)",
      meta: "rgba(35,34,28,0.84)",
      metaDim: "rgba(35,34,28,0.68)",
      imageScrim: "rgba(0,0,0,0)",
      fallbackLightness: [88, 78],
    },
  },
};

/**
 * Apple-style liquid glass, shared by the hero panel and the detail reader.
 * Full literal class strings so Tailwind's scanner picks them up.
 */
export const glassPanel: Record<ThemeName, string> = {
  dark: "border-white/15 bg-[#141417]/45 shadow-[0_28px_80px_-24px_rgba(0,0,0,0.85)]",
  light:
    "border-white/60 bg-white/45 shadow-[0_28px_80px_-24px_rgba(70,60,40,0.4)]",
};

/** Top specular sheen (gradient-from color) matching the glass tint. */
export const glassSheen: Record<ThemeName, string> = {
  dark: "from-white/[0.14]",
  light: "from-white/70",
};

const STORAGE_KEY = "theme";

/** Read what the pre-hydration inline script stamped on <html>. */
export function readInitialTheme(): ThemeName {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

/** Single entry point for switching: DOM attribute, persistence, store. */
export function applyTheme(theme: ThemeName): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Private browsing — the choice just won't persist.
  }
  setExperienceState({ theme });
}
