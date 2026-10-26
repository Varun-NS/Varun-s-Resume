"use client";

import { useExperience } from "@/lib/store";
import { applyTheme } from "@/lib/theme";

/**
 * Midnight room ↔ daylight gallery, as a real switch: the knob carries the
 * current mode's icon and slides moon-side/sun-side, so the state is
 * readable at a glance instead of guessing what a text button will do.
 */
export function ThemeToggle({ chrome = false }: { chrome?: boolean }) {
  const theme = useExperience((s) => s.theme);
  const isLight = theme === "light";
  return (
    <button
      type="button"
      data-chrome={chrome || undefined}
      role="switch"
      aria-checked={isLight}
      onClick={() => applyTheme(isLight ? "dark" : "light")}
      className={`group pointer-events-auto relative flex h-6 w-12 shrink-0 items-center rounded-full border border-fog/30 bg-fog/10 px-1 transition-colors duration-200 hover:border-fog/60 ${
        chrome ? "opacity-0" : ""
      }`}
      aria-label="Toggle light mode"
    >
      {/* Destination icons, faint in the track. */}
      <MoonIcon className="absolute left-[7px] h-2.5 w-2.5 text-fog/50" />
      <SunIcon className="absolute right-[6px] h-3 w-3 text-fog/50" />
      <span
        className={`relative flex h-4 w-4 items-center justify-center rounded-full bg-fog transition-transform duration-300 ${
          isLight ? "translate-x-6" : "translate-x-0"
        }`}
      >
        {isLight ? (
          <SunIcon className="h-2.5 w-2.5 text-void" />
        ) : (
          <MoonIcon className="h-2 w-2 text-void" />
        )}
      </span>
    </button>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
      <path d="M13.2 10.4A6 6 0 0 1 5.6 2.8 6 6 0 1 0 13.2 10.4Z" />
    </svg>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className={className} aria-hidden="true">
      <circle cx="8" cy="8" r="3" fill="currentColor" stroke="none" />
      <path d="M8 1.2v1.8M8 13v1.8M1.2 8H3M13 8h1.8M3.2 3.2l1.3 1.3M11.5 11.5l1.3 1.3M12.8 3.2l-1.3 1.3M4.5 11.5l-1.3 1.3" />
    </svg>
  );
}

