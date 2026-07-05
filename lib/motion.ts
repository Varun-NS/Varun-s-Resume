import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";

let registered = false;

/**
 * Register the project's shared motion language once.
 * Every timeline in the experience pulls from these curves so the whole
 * site breathes with one rhythm.
 */
export function registerMotion(): void {
  if (registered) return;
  registered = true;
  gsap.registerPlugin(CustomEase);

  // Heavy, luxurious deceleration — the workhorse curve.
  CustomEase.create("lux", "M0,0 C0.16,0.84 0.28,0.985 1,1");
  // Gentle anticipation into a long settle — used for the card focus flight.
  CustomEase.create("cinema", "M0,0 C0.5,0 0.06,1 1,1");
  // Soft symmetric drift for camera re-aims.
  CustomEase.create("glide", "M0,0 C0.42,0 0.05,1 1,1");
  // Exit curve — slightly quicker out, per motion best practice.
  CustomEase.create("exit", "M0,0 C0.4,0 0.68,0.9 1,1");
}

/**
 * Framerate-independent exponential smoothing.
 * `lambda` ≈ responsiveness: higher follows the target faster.
 */
export function damp(
  current: number,
  target: number,
  lambda: number,
  dt: number
): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

/** Wrap an angle delta to the shortest path (-π..π). */
export function shortestAngle(from: number, to: number): number {
  const delta = (to - from) % (Math.PI * 2);
  return ((delta + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
}

export const clamp = (v: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, v));
