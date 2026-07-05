import resume from "@/data/resume.json";
import type { ResumeData } from "@/lib/types";
import Link from "next/link";

const data = resume as ResumeData;

/**
 * The gallery itself renders in the persistent layout shell.
 * The home page contributes a semantic, screen-reader-friendly index of
 * every section so the resume is fully navigable without WebGL.
 */
export default function HomePage() {
  return (
    <nav aria-label="Resume sections" className="sr-only">
      <h1>
        {data.profile.name} — {data.profile.role}
      </h1>
      <ul>
        {data.sections.map((section) => (
          <li key={section.title}>
            <h2>{section.title}</h2>
            <ul>
              {section.cards.map((card) => (
                <li key={card.slug}>
                  <Link href={`/project/${card.slug}`}>
                    {card.title} — {card.subtitle}
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  );
}
