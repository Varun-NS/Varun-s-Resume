"use client";

import { useEffect } from "react";
import {
  getExperienceState,
  useExperience,
  setExperienceState,
} from "@/lib/store";
import resume from "@/data/resume.json";
import type { ResumeData } from "@/lib/types";

export function SectionNavigation() {
  const phase = useExperience((s) => s.phase);
  const activeSection = useExperience((s) => s.activeSection);
  const data = resume as ResumeData;

  // Escape steps back out of a framed section.
  useEffect(() => {
    if (!activeSection) return;
    const onKey = (e: KeyboardEvent) => {
      // While a card is open the detail view owns Escape.
      if (getExperienceState().phase !== "idle") return;
      if (e.key === "Escape") setExperienceState({ activeSection: null });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeSection]);

  // Only show navigation when the gallery is fully in its idle state.
  if (phase !== "idle") return null;

  return (
    <div className="fixed bottom-8 left-0 right-0 z-50 pointer-events-none flex justify-center px-4">
      <nav className="pointer-events-auto flex flex-wrap justify-center gap-x-6 gap-y-3 bg-void/70 backdrop-blur-md px-6 py-4 rounded-full border border-hairline shadow-2xl transition-all duration-700">
        {data.sections.map((section) => {
          const isActive = activeSection === section.title;
          return (
            <button
              key={section.title}
              onClick={() => {
                if (isActive) {
                  setExperienceState({ activeSection: null });
                } else {
                  setExperienceState({ activeSection: section.title });
                }
              }}
              aria-pressed={isActive}
              className={`relative text-xs font-semibold uppercase tracking-[0.18em] transition-colors duration-300 outline-none focus-visible:text-fog
                after:absolute after:-bottom-1.5 after:left-1/2 after:h-[2px] after:-translate-x-1/2 after:rounded-full after:bg-fog after:transition-all after:duration-300
                ${
                  isActive
                    ? "text-fog after:w-5"
                    : "text-fog/60 after:w-0 hover:text-fog"
                }
              `}
            >
              {section.title}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
