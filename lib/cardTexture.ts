import * as THREE from "three";
import type { ResumeCard } from "./types";

/**
 * Each gallery card is a single canvas-composed texture: frame, image,
 * title, year and category chips are all baked into one bitmap so a card
 * costs exactly one draw call in the scene.
 */

const TEX_WIDTH = 640;

interface FontStack {
  display: string;
  mono: string;
}

let fontStack: FontStack | null = null;

/** Resolve the next/font family names injected as CSS variables. */
async function resolveFonts(): Promise<FontStack> {
  if (fontStack) return fontStack;
  const styles = getComputedStyle(document.documentElement);
  const display =
    styles.getPropertyValue("--font-display").trim() || "system-ui";
  const mono = styles.getPropertyValue("--font-mono").trim() || "monospace";
  try {
    await Promise.all([
      document.fonts.load(`600 40px ${display}`),
      document.fonts.load(`400 20px ${mono}`),
      document.fonts.ready,
    ]);
  } catch {
    // Fonts failing to resolve is cosmetic — system fallbacks are fine.
  }
  fontStack = { display, mono };
  return fontStack;
}

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    // A hung request must never strand the visitor on the loader — after the
    // timeout the card ships with its fallback gradient instead.
    const timer = window.setTimeout(() => resolve(null), 8000);
    img.onload = () => {
      window.clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      resolve(null);
    };
    img.src = url;
  });
}

function roundedPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Cover-fit an image into a rect, cropping the overflow. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

/** Deterministic hue per card so fallback gradients feel intentional. */
function fallbackGradient(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  seedText: string
): void {
  let hash = 0;
  for (let i = 0; i < seedText.length; i++) {
    hash = (hash * 31 + seedText.charCodeAt(i)) | 0;
  }
  const hue = Math.abs(hash) % 360;
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, `hsl(${hue}, 28%, 16%)`);
  g.addColorStop(1, `hsl(${(hue + 40) % 360}, 32%, 7%)`);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

export async function createCardTexture(
  card: ResumeCard,
  aspect: number,
  renderer: THREE.WebGLRenderer
): Promise<THREE.CanvasTexture> {
  const [fonts, img] = await Promise.all([
    resolveFonts(),
    loadImage(card.image),
  ]);

  const w = TEX_WIDTH;
  const h = Math.round(TEX_WIDTH / aspect);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context unavailable");

  const pad = 26;
  const radius = 30;

  // ---- Card body ---------------------------------------------------------
  ctx.clearRect(0, 0, w, h);
  roundedPath(ctx, 0, 0, w, h, radius);
  const body = ctx.createLinearGradient(0, 0, 0, h);
  body.addColorStop(0, "#101012");
  body.addColorStop(1, "#0a0a0b");
  ctx.fillStyle = body;
  ctx.fill();

  // Hairline border.
  roundedPath(ctx, 0.75, 0.75, w - 1.5, h - 1.5, radius - 0.75);
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // ---- Header row: section marker + year --------------------------------
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = `500 21px ${fonts.mono}`;
  ctx.textBaseline = "middle";
  ctx.fillText(card.category[0] ?? "SECTION", pad, pad + 12);

  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255,255,255,0.38)";
  ctx.fillText(card.year, w - pad, pad + 12);
  ctx.textAlign = "left";

  // ---- Image window ------------------------------------------------------
  const imgTop = pad + 44;
  const imgBottom = h - 128;
  const imgX = pad;
  const imgW = w - pad * 2;
  const imgH = imgBottom - imgTop;

  ctx.save();
  roundedPath(ctx, imgX, imgTop, imgW, imgH, 16);
  ctx.clip();
  if (img) {
    drawCover(ctx, img, imgX, imgTop, imgW, imgH);
    // Gentle darkening keeps white photos from blowing out the dark room.
    ctx.fillStyle = "rgba(5,5,5,0.14)";
    ctx.fillRect(imgX, imgTop, imgW, imgH);
  } else {
    fallbackGradient(ctx, imgX, imgTop, imgW, imgH, card.slug);
  }
  ctx.restore();

  // ---- Title -------------------------------------------------------------
  const titleY = imgBottom + 44;
  ctx.fillStyle = "rgba(248,247,243,0.97)";
  let titleSize = 46;
  ctx.font = `600 ${titleSize}px ${fonts.display}`;
  while (ctx.measureText(card.title).width > w - pad * 2 && titleSize > 26) {
    titleSize -= 2;
    ctx.font = `600 ${titleSize}px ${fonts.display}`;
  }
  ctx.fillText(card.title, pad, titleY);

  // ---- Footer: category chips --------------------------------------------
  const chipY = h - pad - 18;
  let chipX = pad;
  ctx.font = `500 18px ${fonts.mono}`;
  for (const cat of card.category.slice(0, 3)) {
    const tw = ctx.measureText(cat).width;
    const cw = tw + 30;
    roundedPath(ctx, chipX, chipY - 17, cw, 34, 17);
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 1.25;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText(cat, chipX + 15, chipY + 1);
    chipX += cw + 10;
    if (chipX > w - pad - 60) break;
  }

  // ---- GPU upload ---------------------------------------------------------
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(
    8,
    renderer.capabilities.getMaxAnisotropy()
  );
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.needsUpdate = true;
  return texture;
}
