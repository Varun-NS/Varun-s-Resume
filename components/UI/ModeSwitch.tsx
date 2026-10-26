"use client";

import { usePathname, useRouter } from "next/navigation";
import { setExperienceState, useExperience } from "@/lib/store";

/**
 * Fixed width so both page chromes can reserve exactly this much room in
 * the top-right corner (see MODE_SWITCH_SPACE).
 */
const WIDTH = "w-[132px] sm:w-[172px]";

/** Right margin the simple top bar and the 3D header leave for the switch. */
export const MODE_SWITCH_SPACE = "mr-[144px] sm:mr-[188px]";

/**
 * The one bright element on the page: flips between the simple scrollable
 * resume and the 3D sphere. It sits above every layer — including the 3D
 * loader — so a visitor can always get back to the simple view.
 */
export function ModeSwitch({ mode }: { mode: "simple" | "immersive" }) {
  const router = useRouter();
  const pathname = usePathname();
  const reducedMotion = useExperience((s) => s.reducedMotion);
  const toImmersive = mode === "simple";

  const onClick = () => {
    if (toImmersive) {
      setExperienceState({ mode: "immersive" });
      return;
    }
    setExperienceState({ mode: "simple", activeSection: null });
    // An open card lives on its own route; the sphere unfocuses itself
    // when the path returns to "/".
    if (pathname !== "/") router.push("/", { scroll: false });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={toImmersive ? "Switch to the 3D view" : "Switch to the simple view"}
      className={`group fixed right-4 z-[70] flex h-10 items-center justify-center gap-2 rounded-full px-4 text-[13px] font-bold tracking-wide text-white sm:right-8 sm:h-11 sm:text-sm ${WIDTH} ${
        mode === "simple" ? "top-4 sm:top-5" : "top-6 sm:top-8"
      } bg-[linear-gradient(120deg,#ff7a18_0%,#ff3d77_50%,#8b5cf6_100%)] shadow-[0_10px_30px_-8px_rgba(255,61,119,0.75)] ring-1 ring-inset ring-white/30 transition-[transform,filter,box-shadow] duration-200 hover:brightness-110 hover:shadow-[0_14px_38px_-8px_rgba(255,61,119,0.9)] active:scale-95 ${
        reducedMotion ? "" : "hover:-translate-y-0.5"
      }`}
    >
      {toImmersive ? <OrbitIcon /> : <ListIcon />}
      <span className="sm:hidden">{toImmersive ? "3D View" : "Simple"}</span>
      <span className="hidden sm:inline">
        {toImmersive ? "Explore in 3D" : "Simple View"}
      </span>
    </button>
  );
}

function OrbitIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="h-4 w-4 shrink-0"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3.2" fill="currentColor" stroke="none" />
      <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(-25 12 12)" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      className="h-4 w-4 shrink-0"
      aria-hidden="true"
    >
      <path d="M9 6h11M9 12h11M9 18h11" />
      <circle cx="4.5" cy="6" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="18" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}
