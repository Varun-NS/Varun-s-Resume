/**
 * Mutable camera-control state shared between the drag controller,
 * the render loop and the focus choreography. Kept as a module-level
 * singleton so GSAP can tween it directly without React re-renders.
 */
export interface CameraState {
  yaw: number;
  pitch: number;
  targetYaw: number;
  targetPitch: number;
  /** Angular velocity carried after a drag release (rad/s). */
  velocityYaw: number;
  velocityPitch: number;
  /** Dolly used for the intro pull-in; 0 = seated at the sphere's centre. */
  zOffset: number;
  /** Pointer parallax target, in NDC (-1..1). */
  parallaxX: number;
  parallaxY: number;
  /** Damped parallax actually applied to the camera. */
  parallaxCurrentX: number;
  parallaxCurrentY: number;
  /** When false (focused / transitioning) user input is ignored. */
  inputEnabled: boolean;
  /** Idle drift multiplier — tweened to 0 while dragging or focused. */
  drift: number;
  /** 0..1 — rises while the visitor holds a drag; drives the camera
      pull-back and the lens curvature so the room reacts to the grip. */
  grip: number;
}

export const cameraState: CameraState = {
  yaw: 0,
  pitch: 0,
  targetYaw: 0,
  targetPitch: 0,
  velocityYaw: 0,
  velocityPitch: 0,
  zOffset: 18,
  parallaxX: 0,
  parallaxY: 0,
  parallaxCurrentX: 0,
  parallaxCurrentY: 0,
  inputEnabled: false,
  drift: 1,
  grip: 0,
};

export const PITCH_LIMIT = 1.05; // rad — keep the horizon findable

/**
 * Yaw/pitch that make a YXZ-euler camera at the origin look toward `dir`
 * (normalized direction of a card). Derived from rotating (0,0,-1):
 * forward = (-cosP·sinYaw, sinP, -cosP·cosYaw)
 */
export function anglesToward(x: number, y: number, z: number): {
  yaw: number;
  pitch: number;
} {
  const len = Math.sqrt(x * x + y * y + z * z) || 1;
  return {
    yaw: Math.atan2(-x / len, -z / len),
    pitch: Math.asin(Math.max(-1, Math.min(1, y / len))),
  };
}
