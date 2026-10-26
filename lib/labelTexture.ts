import * as THREE from "three";

export async function createLabelTexture(
  title: string,
  gl: THREE.WebGLRenderer,
  fill: string
): Promise<THREE.CanvasTexture> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) throw new Error("No 2D context");

  // High resolution for crisp text
  const width = 1024;
  const height = 256;
  canvas.width = width;
  canvas.height = height;

  // Clear background (fully transparent)
  ctx.clearRect(0, 0, width, height);

  // next/font registers Space Grotesk under a generated family name, so
  // resolve it from the CSS variable rather than asking for it by name.
  const family =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--font-display")
      .trim() || "system-ui, sans-serif";
  const font = `600 86px ${family}`;
  try {
    await document.fonts.load(font);
  } catch {
    // Fonts failing to resolve is cosmetic — system fallbacks are fine.
  }

  ctx.font = font;
  ctx.fillStyle = fill;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.letterSpacing = "6px";

  // Draw the text
  ctx.fillText(title.toUpperCase(), width / 2, height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  // Power-of-two canvas — mipmaps keep the title smooth at any distance.
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = gl.capabilities.getMaxAnisotropy();
  texture.generateMipmaps = true;

  return texture;
}
