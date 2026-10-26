import * as THREE from "three";
import type { ResumeCard } from "./types";
import { themes, type ThemeName } from "./theme";

/**
 * Each gallery card is a single canvas-composed texture: frame, image,
 * category, date and title are all baked into one bitmap so a card
 * costs exactly one draw call in the scene.
 */

// 1024px keeps titles crisp at reading distance on desktop; phones get a
// lighter bake (44 cards × RGBA + mips adds up in GPU memory).
const TEX_WIDTH =
  typeof window !== "undefined" && window.innerWidth < 768 ? 768 : 1024;

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
      document.fonts.load(`700 40px ${display}`),
      document.fonts.load(`600 20px ${mono}`),
      document.fonts.ready,
    ]);
  } catch {
    // Fonts failing to resolve is cosmetic — system fallbacks are fine.
  }
  fontStack = { display, mono };
  return fontStack;
}

const imageCache = new Map<string, Promise<HTMLImageElement | null>>();

function loadImage(url: string): Promise<HTMLImageElement | null> {
  // Cached so a theme re-bake never re-hits the network.
  const cached = imageCache.get(url);
  if (cached) return cached;
  const promise = new Promise<HTMLImageElement | null>((resolve) => {
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
  imageCache.set(url, promise);
  return promise;
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

/** Contain-fit an image into a rect, showing the whole image with letterboxing. */
function drawContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  const scale = Math.min(w / img.naturalWidth, h / img.naturalHeight);
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
  seedText: string,
  lightness: [number, number]
): void {
  let hash = 0;
  for (let i = 0; i < seedText.length; i++) {
    hash = seedText.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, `hsl(${hue}, 12%, ${lightness[0]}%)`);
  grad.addColorStop(1, `hsl(${(hue + 40) % 360}, 16%, ${lightness[1]}%)`);
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
}

export async function createCardTexture(
  card: ResumeCard,
  aspect: number,
  renderer: THREE.WebGLRenderer,
  theme: ThemeName
): Promise<THREE.CanvasTexture> {
  const palette = themes[theme].card;
  const [fonts, img] = await Promise.all([
    resolveFonts(),
    loadImage(card.image),
  ]);

  const w = TEX_WIDTH;
  const h = Math.round(TEX_WIDTH / aspect);
  // All metrics scale off the bake width so both phone and desktop bakes
  // compose identically.
  const u = TEX_WIDTH / 1024;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context unavailable");

  const pad = Math.round(42 * u);
  const radius = Math.round(48 * u);

  // ---- Card body ---------------------------------------------------------
  ctx.clearRect(0, 0, w, h);
  roundedPath(ctx, 0, 0, w, h, radius);
  const body = ctx.createLinearGradient(0, 0, 0, h);
  body.addColorStop(0, palette.bodyTop);
  body.addColorStop(1, palette.bodyBottom);
  ctx.fillStyle = body;
  ctx.fill();

  // Hairline border.
  roundedPath(ctx, 1.25, 1.25, w - 2.5, h - 2.5, radius - 1.25);
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // ---- Header row: category + date ---------------------------------------
  // Sized for reading distance: a card spans ~200px on a laptop screen, so
  // anything much under ~48px in the bake turns to noise. That is also why
  // the card carries no small chips — the detail view lists every tag.
  const category = (card.category[0] ?? "").toUpperCase();
  const headerY = pad + Math.round(28 * u);
  const headerGap = Math.round(32 * u);
  let headerSize = Math.round(48 * u);
  const headerFont = (size: number) => `600 ${size}px ${fonts.mono}`;
  ctx.font = headerFont(headerSize);
  while (
    ctx.measureText(category).width +
      ctx.measureText(card.year).width +
      headerGap >
      w - pad * 2 &&
    headerSize > Math.round(34 * u)
  ) {
    headerSize -= 2;
    ctx.font = headerFont(headerSize);
  }
  ctx.textBaseline = "middle";
  ctx.fillStyle = palette.metaDim;
  ctx.fillText(category, pad, headerY);

  ctx.textAlign = "right";
  ctx.fillStyle = palette.meta;
  ctx.fillText(card.year, w - pad, headerY);
  ctx.textAlign = "left";

  // ---- Footer layout (measured first so the image takes what's left) -----

  // Title: one line as large as fits; long titles wrap to two lines rather
  // than shrinking into illegibility.
  const maxTitleW = w - pad * 2;
  const titleFont = (size: number) => `700 ${size}px ${fonts.display}`;
  const fits = (text: string, size: number) => {
    ctx.font = titleFont(size);
    return ctx.measureText(text).width <= maxTitleW;
  };
  let titleSize = Math.round(112 * u);
  let titleLines = [card.title];
  while (!fits(card.title, titleSize) && titleSize > Math.round(84 * u)) {
    titleSize -= 2;
  }
  if (!fits(card.title, titleSize)) {
    const words = card.title.split(" ");
    let best: [string, string] = [card.title, ""];
    let bestWidth = Infinity;
    ctx.font = titleFont(titleSize);
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(" ");
      const b = words.slice(i).join(" ");
      const widest = Math.max(ctx.measureText(a).width, ctx.measureText(b).width);
      if (widest < bestWidth) {
        bestWidth = widest;
        best = [a, b];
      }
    }
    titleLines = best[1] ? best : [card.title];
    while (
      titleLines.some((line) => !fits(line, titleSize)) &&
      titleSize > Math.round(60 * u)
    ) {
      titleSize -= 2;
    }
  }
  const titleLineH = Math.round(titleSize * 1.08);

  const footerH = Math.round(30 * u) + titleLines.length * titleLineH;

  // ---- Image window ------------------------------------------------------
  const imgTop = pad + Math.round(84 * u);
  const imgBottom = h - pad - footerH;
  const imgX = pad;
  const imgW = w - pad * 2;
  const imgH = imgBottom - imgTop;

  ctx.save();

  if (img) {
    if (card.objectFit === 'contain' || card.objectFit === 'contain-dark') {
        // For contain, we don't clip tightly because we might want a background color
        // to fill the letterboxing. Let's fill the background with white since logos often need it.
        roundedPath(ctx, imgX, imgTop, imgW, imgH, Math.round(26 * u));
        if (card.objectFit === 'contain') {
          ctx.fillStyle = "#ffffff";
          ctx.fill();
        }
        ctx.clip();
        drawContain(ctx, img, imgX, imgTop, imgW, imgH);
    } else {
        roundedPath(ctx, imgX, imgTop, imgW, imgH, Math.round(26 * u));
        ctx.clip();
        drawCover(ctx, img, imgX, imgTop, imgW, imgH);
        // Gentle scrim seats bright photos into the room (no-op in light).
        ctx.fillStyle = palette.imageScrim;
        ctx.fillRect(imgX, imgTop, imgW, imgH);
    }
  } else {
    roundedPath(ctx, imgX, imgTop, imgW, imgH, Math.round(26 * u));
    ctx.clip();
    fallbackGradient(
      ctx,
      imgX,
      imgTop,
      imgW,
      imgH,
      card.slug,
      palette.fallbackLightness
    );
  }
  ctx.restore();

  // ---- Title -------------------------------------------------------------
  ctx.fillStyle = palette.title;
  ctx.font = titleFont(titleSize);
  ctx.textBaseline = "alphabetic";
  let baseline = imgBottom + Math.round(30 * u) + titleSize * 0.8;
  for (const line of titleLines) {
    ctx.fillText(line, pad, baseline);
    baseline += titleLineH;
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
