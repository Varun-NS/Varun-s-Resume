# Stunning Resume — an interactive spherical gallery

An immersive WebGL resume: the visitor stands at the centre of a hollow sphere
whose inner surface holds ~40 floating cards, one per resume section. Drag to
look around with heavy, Lenis-like inertia; click a card for a cinematic
transition into a detail page.

## Stack

- **Next.js 15** (App Router) · **React 19** · **TypeScript** (strict, no `any`)
- **Three.js** + **React Three Fiber** for the scene
- **GSAP** (+ CustomEase) for every animation and timeline
- **Lenis** for smooth scrolling inside the detail reader
- **TailwindCSS** for the DOM chrome

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

## Replace the content

Everything is data-driven from **`data/resume.json`**:

```json
{
  "profile": { "name", "role", "email", "tagline" },
  "cards": [
    { "slug", "title", "subtitle", "year", "category": [], "image", "description" }
  ]
}
```

Edit that file and the sphere, the detail routes (`/project/[slug]`), metadata
and the screen-reader index all update automatically. Images can be any
CORS-enabled URL (Unsplash works out of the box); a card falls back to a
generated gradient if its image fails.

## How it's built

- **Persistent scene** — the `<Canvas>` mounts once in `app/layout.tsx` via
  `AppShell`; route changes only swap the DOM overlay, so gallery ↔ detail
  feels like one continuous space.
- **Fibonacci sphere** (`lib/sphere.ts`) — golden-angle lattice with
  deterministic jitter in angle, radius, scale and aspect for an organic feel.
- **Custom camera** (`components/Camera/CameraRig.tsx`) — no OrbitControls.
  Pointer input writes yaw/pitch *targets*, a velocity model carries momentum
  after release, and the camera chases the targets with framerate-independent
  exponential damping (double-smoothed, like Lenis).
- **Baked card textures** (`lib/cardTexture.ts`) — image, title, year and
  category chips are composed on an offscreen canvas into a single texture:
  one draw call per card.
- **Choreography** (`components/Gallery/Gallery.tsx`) — GSAP timelines with
  hand-drawn CustomEase curves (`lib/motion.ts`) run the intro reveal, hover
  dimming, and the focus/unfocus flight; a card registry of plain animatable
  proxies bridges GSAP and the render loop.
- **State** (`lib/store.ts`) — a dependency-free external store
  (`useSyncExternalStore`) shared by the 3D scene and the DOM UI.

## Accessibility

- Full keyboard support: arrow keys rotate the camera, `Tab` reaches a
  visually-hidden semantic index of every section, `Esc` closes the detail view.
- `prefers-reduced-motion` collapses idle drift, momentum and flights to fades.
- Every section is a real, deep-linkable route with proper metadata.
