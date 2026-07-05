"use client";

import { useEffect } from "react";
import {
  getExperienceState,
  useExperience,
  setExperienceState,
} from "@/lib/store";
import resume from "@/data/resume.json";
import type { ResumeData } from "@/lib/types";
import { audio } from "@/lib/audio";

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
      <nav className="pointer-events-auto flex flex-wrap justify-center gap-x-6 gap-y-3 bg-black/30 backdrop-blur-md px-6 py-4 rounded-full border border-white/10 shadow-2xl transition-all duration-700">
        {data.sections.map((section) => {
          const isActive = activeSection === section.title;
          return (
            <button
              key={section.title}
              onClick={() => {
                audio.tick();
                if (isActive) {
                  setExperienceState({ activeSection: null });
                } else {
                  setExperienceState({ activeSection: section.title });
                }
              }}
              className={`text-xs uppercase tracking-[0.2em] transition-all duration-300 outline-none
                ${
                  isActive
                    ? "text-white font-medium scale-105"
                    : "text-white/40 hover:text-white/80"
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
