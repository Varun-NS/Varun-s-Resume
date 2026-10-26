"use client";

import { useEffect, useState } from "react";
import resume from "@/data/resume.json";
import type { ResumeCard, ResumeData, ResumeSection } from "@/lib/types";
import { setExperienceState } from "@/lib/store";
import { ThemeToggle } from "@/components/UI/ThemeToggle";
import { MODE_SWITCH_SPACE } from "@/components/UI/ModeSwitch";
import { RichText, prettyUrl } from "@/components/UI/RichText";

const data = resume as ResumeData;

/**
 * The default view: the same resume.json content as the sphere, laid out as
 * a plain scrolling page a recruiter can skim in seconds, search with
 * Ctrl+F, and read on any phone. It is server-rendered, so the text is also
 * in the initial HTML.
 */

type Kind = "about" | "timeline" | "projects" | "certs" | "skills" | "contact";

function kindOf(title: string): Kind {
  const t = title.toLowerCase();
  if (t.includes("about")) return "about";
  if (t.includes("project")) return "projects";
  if (t.includes("certif")) return "certs";
  if (t.includes("skill")) return "skills";
  if (t.includes("contact")) return "contact";
  return "timeline"; // experience, education, and anything new
}

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const allCards = data.sections.flatMap((s) => s.cards);
const aboutSection = data.sections.find((s) => kindOf(s.title) === "about");
const aboutCard =
  aboutSection?.cards.find((c) => c.slug === "about-me") ??
  aboutSection?.cards[0];
const aboutExtras =
  aboutSection?.cards.filter(
    (c) => c !== aboutCard && c.slug !== "download-resume"
  ) ?? [];
const contactCard = data.sections.find((s) => kindOf(s.title) === "contact")
  ?.cards[0];
const linkedIn = allCards
  .map((c) => c.description.match(/\((https?:\/\/[^)\s]*linkedin\.com[^)\s]*)\)/))
  .find(Boolean)?.[1];
const phone = contactCard?.description.match(/\+?\d[\d\s-]{8,}\d/)?.[0];
const bodySections = data.sections.filter((s) => kindOf(s.title) !== "about");

/** Category tags that only repeat the section name add nothing. */
const GENERIC_TAGS = new Set(["EXPERIENCE", "EDUCATION", "CERTIFICATION", "SKILLS", "CONTACT"]);

const btnPrimary =
  "inline-flex items-center gap-2 rounded-full bg-fog px-5 py-2.5 text-sm font-semibold text-void transition-colors hover:bg-fog/85";
const btnSecondary =
  "inline-flex items-center gap-2 rounded-full border border-fog/25 px-5 py-2.5 text-sm font-semibold text-fog transition-colors hover:border-fog/60 hover:bg-fog/5";
const surface =
  "rounded-2xl border border-hairline bg-ink/70 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-[border-color,box-shadow] duration-300 hover:border-fog/20 hover:shadow-[0_14px_36px_-18px_rgba(0,0,0,0.3)]";
/** The mode switch's gradient, reused sparingly as the page's one accent. */
const ACCENT_BG = "bg-[linear-gradient(120deg,#ff7a18_0%,#ff3d77_50%,#8b5cf6_100%)]";
const ACCENT_TEXT = `${ACCENT_BG} bg-clip-text text-transparent`;
// Written out in full: Tailwind only generates classes it finds literally.
const ACCENT_UNDERLINE =
  "after:bg-[linear-gradient(120deg,#ff7a18_0%,#ff3d77_50%,#8b5cf6_100%)]";

export function SimpleResume() {
  return (
    <div className="h-dvh overflow-y-auto overflow-x-hidden overscroll-contain motion-safe:scroll-smooth">
      <TopBar />
      <main className="mx-auto max-w-5xl px-5 sm:px-8">
        <Hero />
        {bodySections.map((section, i) => (
          <Section key={section.title} section={section} index={i + 1} />
        ))}
      </main>
      <Footer />
    </div>
  );
}

// ---- Chrome ----------------------------------------------------------------

/** Which body section is mid-screen, for the top bar's highlight. */
function useActiveSection() {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const els = bodySections
      .map((s) => document.getElementById(slugify(s.title)))
      .filter((el): el is HTMLElement => el !== null);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      // A thin band across the middle of the screen.
      { rootMargin: "-45% 0px -50% 0px" }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  return active;
}

function TopBar() {
  const active = useActiveSection();
  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between gap-6 border-b border-hairline bg-void/85 px-4 backdrop-blur-md sm:h-[84px] sm:px-8">
      <a href="#top" className="min-w-0">
        <p className="truncate text-base font-bold text-fog">
          {data.profile.name}
        </p>
        <p className="truncate font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-fog/65 sm:tracking-[0.18em]">
          {data.profile.role}
        </p>
      </a>
      <div className={`flex shrink-0 items-center gap-5 ${MODE_SWITCH_SPACE}`}>
        <nav aria-label="Sections" className="hidden items-center gap-5 xl:flex">
          {bodySections.map((s) => {
            const id = slugify(s.title);
            const isActive = active === id;
            return (
              <a
                key={s.title}
                href={`#${id}`}
                aria-current={isActive ? "true" : undefined}
                className={`relative text-sm transition-colors after:absolute after:-bottom-1.5 after:left-0 after:h-[2px] after:rounded-full after:transition-all after:duration-300 ${
                  isActive
                    ? `font-semibold text-fog after:w-full ${ACCENT_UNDERLINE}`
                    : "font-medium text-fog/70 after:w-0 hover:text-fog"
                }`}
              >
                {s.title}
              </a>
            );
          })}
        </nav>
        <ThemeToggle />
        <a
          href="/resume.pdf"
          download
          className="hidden items-center gap-1.5 rounded-full border border-fog/30 px-4 py-2 text-sm font-semibold text-fog transition-colors hover:border-fog/60 hover:bg-fog/5 sm:inline-flex"
        >
          <DownloadIcon /> PDF
        </a>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section
      id="top"
      className="relative grid scroll-mt-24 items-center gap-10 pb-2 pt-12 sm:grid-cols-[1fr_auto] sm:pt-20"
    >
      {/* Soft wash of the accent colours behind the intro. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 right-0 -z-10 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(255,61,119,0.16),transparent_70%)] blur-2xl sm:h-[28rem] sm:w-[28rem]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-24 -z-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(255,122,24,0.12),transparent_70%)] blur-2xl"
      />
      <div className="min-w-0">
        {aboutCard && (
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-fog/60">
            {aboutCard.subtitle}
          </p>
        )}
        <h1 className="mt-3 text-5xl font-bold tracking-tight text-fog sm:text-7xl">
          {data.profile.name}
        </h1>
        <p className="mt-3 text-xl font-medium text-fog/80 sm:text-2xl">
          {data.profile.role}
        </p>
        {aboutCard && (
          <RichText
            text={aboutCard.simpleDescription ?? aboutCard.description}
            className="mt-6 max-w-2xl text-base leading-relaxed text-fog/85 sm:text-lg"
          />
        )}
        <div className="mt-8 flex flex-wrap gap-3">
          <a href="/resume.pdf" download="Varun_NS_Resume.pdf" className={btnPrimary}>
            <DownloadIcon /> Download resume
          </a>
          <a href={`mailto:${data.profile.email}`} className={btnSecondary}>
            {data.profile.email}
          </a>
          {linkedIn && (
            <a href={linkedIn} target="_blank" rel="noopener noreferrer" className={btnSecondary}>
              LinkedIn ↗
            </a>
          )}
          {phone && (
            <a href={`tel:${phone.replace(/[\s-]/g, "")}`} className={btnSecondary}>
              {phone}
            </a>
          )}
        </div>
        {aboutExtras.length > 0 && (
          <dl
            className={`mt-10 grid max-w-2xl gap-6 border-t border-hairline pt-8 ${
              // A lone item would strand itself in half the width.
              aboutExtras.length > 1 ? "sm:grid-cols-2" : ""
            }`}
          >
            {aboutExtras.map((card) => (
              <div key={card.slug}>
                <dt className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-fog/60">
                  {card.title}
                </dt>
                <dd className="mt-2 text-[15px] leading-relaxed text-fog/85">
                  {card.description}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      {aboutCard && (
        <div
          className={`order-first w-32 rounded-[26px] p-[3px] shadow-xl sm:order-none sm:w-60 sm:rounded-[28px] ${ACCENT_BG}`}
        >
          {/* Cut-out portraits sit on a soft, theme-aware backdrop rather
              than letting the gradient ring show through. */}
          <div className="overflow-hidden rounded-[23px] bg-[radial-gradient(120%_70%_at_50%_0%,rgba(255,61,119,0.16),transparent_65%),linear-gradient(to_bottom,rgb(var(--ink)),rgb(var(--void)))] sm:rounded-[25px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={aboutCard.image}
              alt={data.profile.name}
              className="aspect-[4/5] w-full object-cover object-top"
            />
          </div>
        </div>
      )}
    </section>
  );
}

function Footer() {
  return (
    <footer className="mt-24 border-t border-hairline">
      <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-4 px-5 py-10 text-sm text-fog/60 sm:flex-row sm:items-center sm:px-8">
        <p>
          © {new Date().getFullYear()} {data.profile.name}
        </p>
        <button
          type="button"
          onClick={() => setExperienceState({ mode: "immersive" })}
          className="font-semibold text-fog underline decoration-fog/30 underline-offset-4 transition-colors hover:decoration-fog"
        >
          Prefer something more interactive? Explore the 3D version →
        </button>
      </div>
    </footer>
  );
}

// ---- Sections --------------------------------------------------------------

function Section({ section, index }: { section: ResumeSection; index: number }) {
  const kind = kindOf(section.title);
  return (
    <section
      id={slugify(section.title)}
      className="scroll-mt-24 border-t border-hairline pt-12 sm:scroll-mt-28 sm:pt-16 mt-12 sm:mt-16"
    >
      <div className="mb-8 sm:mb-10">
        <div className="flex items-baseline gap-4">
          <span className={`font-mono text-sm font-bold ${ACCENT_TEXT}`}>
            {String(index).padStart(2, "0")}
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-fog sm:text-4xl">
            {section.title}
          </h2>
        </div>
        <div aria-hidden="true" className={`mt-4 h-1 w-12 rounded-full ${ACCENT_BG}`} />
      </div>
      {kind === "timeline" && (
        <ol className="space-y-5">
          {section.cards.map((card) => (
            <TimelineItem key={card.slug} card={card} />
          ))}
        </ol>
      )}
      {kind === "projects" && (
        <div className="grid gap-6 md:grid-cols-2">
          {section.cards.map((card) => (
            <ProjectCard key={card.slug} card={card} />
          ))}
        </div>
      )}
      {kind === "certs" && (
        <ul className="grid gap-5 md:grid-cols-2">
          {section.cards.map((card) => (
            <CertItem key={card.slug} card={card} />
          ))}
        </ul>
      )}
      {kind === "skills" && (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {section.cards.map((card) => (
            <li key={card.slug} className={`${surface} p-6`}>
              <h3 className="text-lg font-bold text-fog">{card.title}</h3>
              <p className="mt-1 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-fog/60">
                {card.subtitle}
              </p>
              <p className="mt-3 text-[15px] leading-relaxed text-fog/85">
                {card.description}
              </p>
            </li>
          ))}
        </ul>
      )}
      {kind === "contact" &&
        section.cards.map((card) => <ContactPanel key={card.slug} card={card} />)}
    </section>
  );
}

function Logo({ card, size }: { card: ResumeCard; size: string }) {
  const contain = card.objectFit === "contain" || card.objectFit === "contain-dark";
  return (
    <div
      className={`${size} shrink-0 overflow-hidden rounded-xl border border-hairline ${
        card.objectFit === "contain-dark" ? "bg-[#0b0b0d]" : "bg-white"
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={card.image}
        alt=""
        loading="lazy"
        className={`h-full w-full ${contain ? "object-contain p-1.5" : "object-cover"}`}
      />
    </div>
  );
}

function Tags({ card }: { card: ResumeCard }) {
  const tags = card.category.filter((c) => !GENERIC_TAGS.has(c.toUpperCase()));
  if (!tags.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span
          key={tag}
          className="rounded-full border border-fog/20 bg-fog/5 px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-fog/70"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

function TimelineItem({ card }: { card: ResumeCard }) {
  const heading = card.eyebrow ?? card.subtitle;
  const detail =
    card.eyebrow && card.subtitle !== card.eyebrow ? card.subtitle : null;
  return (
    <li className={`${surface} flex flex-col gap-4 p-5 sm:flex-row sm:gap-7 sm:p-8`}>
      <Logo card={card} size="h-12 w-12 sm:h-16 sm:w-16" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <h3 className="text-xl font-bold leading-snug text-fog sm:text-2xl">
              {heading}
            </h3>
            <p className="mt-1 text-base font-semibold text-fog/80">
              {card.title}
              {detail && <span className="font-normal text-fog/65"> · {detail}</span>}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end sm:gap-2 sm:pt-1.5">
            <p className="font-mono text-sm font-semibold text-fog/70">{card.year}</p>
            {/present/i.test(card.year) && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-fog/20 px-2.5 py-0.5 text-xs font-semibold text-fog">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60 motion-safe:animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Current
              </span>
            )}
          </div>
        </div>
        <div className="mt-3">
          <Tags card={card} />
        </div>
        <RichText
          text={card.description}
          className="mt-4 text-[15px] leading-relaxed text-fog/85 sm:text-base"
        />
      </div>
    </li>
  );
}

/** A leading line that is only a link is the project's live URL. */
function splitProject(description: string) {
  const lines = description.split("\n");
  const first = lines.findIndex((l) => l.trim());
  const link = lines[first]?.trim().match(/^\[(.*?)\]\((.*?)\)$/);
  if (!link) return { url: null, body: description };
  return {
    url: link[2],
    body: lines.slice(first + 1).join("\n").trim(),
  };
}

function ProjectCard({ card }: { card: ResumeCard }) {
  const [open, setOpen] = useState(false);
  const { url, body } = splitProject(card.description);
  const links = card.links?.length
    ? card.links
    : url
      ? [{ label: "Visit live site", url }]
      : [];
  const paragraphs = body.split("\n").filter((l) => l.trim());
  const preview = paragraphs.slice(0, 1).join("\n");
  const hasMore = paragraphs.length > 1;
  const contain = card.objectFit === "contain" || card.objectFit === "contain-dark";

  return (
    <article className={`${surface} flex flex-col overflow-hidden`}>
      {/* The frame owns the 16:9 shape (absolute image, clipped) so a lazy
          image arriving can never resize the card and shift the page. */}
      <div
        className={`relative aspect-[16/9] shrink-0 overflow-hidden ${
          card.objectFit === "contain-dark" ? "bg-[#0b0b0d]" : "bg-white"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={card.image}
          alt={`${card.title} screenshot`}
          loading="lazy"
          className={`absolute inset-0 h-full w-full ${contain ? "object-contain p-3" : "object-cover"}`}
        />
      </div>
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-center justify-between gap-4">
          <Tags card={card} />
          <span className="font-mono text-sm font-semibold text-fog/70">{card.year}</span>
        </div>
        <h3 className="mt-3 text-xl font-bold text-fog">{card.title}</h3>
        <p className="mt-0.5 text-[15px] font-medium text-fog/70">{card.subtitle}</p>
        <RichText
          text={open ? body : preview}
          className="mt-4 text-[15px] leading-relaxed text-fog/85"
        />
        <div className="mt-auto flex flex-wrap items-center gap-4 pt-5">
          {links.map((link, i) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={i === 0 ? btnPrimary : btnSecondary}
            >
              {link.label} ↗
            </a>
          ))}
          {hasMore && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="text-sm font-semibold text-fog/75 underline decoration-fog/30 underline-offset-4 transition-colors hover:text-fog hover:decoration-fog"
            >
              {open ? "Show less" : "Read more"}
            </button>
          )}
        </div>
        {url && !card.links?.length && (
          <p className="mt-3 truncate font-mono text-xs text-fog/55">{prettyUrl(url)}</p>
        )}
      </div>
    </article>
  );
}

function CertItem({ card }: { card: ResumeCard }) {
  return (
    <li className={`${surface} flex gap-5 p-5 sm:p-6`}>
      <Logo card={card} size="h-14 w-14" />
      <div className="min-w-0">
        <h3 className="text-lg font-bold leading-snug text-fog">{card.title}</h3>
        <p className="mt-0.5 text-[15px] font-semibold text-fog/75">
          {card.eyebrow ?? card.subtitle}
          <span className="font-mono text-sm font-semibold text-fog/60"> · {card.year}</span>
        </p>
        <p className="mt-2 text-[15px] leading-relaxed text-fog/80">{card.description}</p>
      </div>
    </li>
  );
}

function ContactPanel({ card }: { card: ResumeCard }) {
  return (
    <div className={`${surface} p-6 sm:p-10`}>
      <h3 className="text-2xl font-bold text-fog sm:text-3xl">{card.subtitle}</h3>
      <RichText
        text={card.description}
        className="mt-4 max-w-2xl text-base leading-relaxed text-fog/85 sm:text-lg"
      />
      <div className="mt-8 flex flex-wrap gap-3">
        <a href={`mailto:${data.profile.email}`} className={btnPrimary}>
          Email me
        </a>
        {linkedIn && (
          <a href={linkedIn} target="_blank" rel="noopener noreferrer" className={btnSecondary}>
            LinkedIn ↗
          </a>
        )}
        <a href="/resume.pdf" download="Varun_NS_Resume.pdf" className={btnSecondary}>
          <DownloadIcon /> Resume PDF
        </a>
      </div>
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 2.5v8m0 0L4.8 7.3M8 10.5l3.2-3.2M3 12.5h10"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
