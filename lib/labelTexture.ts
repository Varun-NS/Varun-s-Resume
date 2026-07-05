import * as THREE from "three";

export async function createLabelTexture(
  title: string,
  gl: THREE.WebGLRenderer
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

  // Typography settings - match the elegant display font used in the app
  ctx.font = "300 86px 'Space Grotesk', system-ui, sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)"; // Semi-transparent elegant white
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.letterSpacing = "4px";

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
