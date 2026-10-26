import type { ReactNode } from "react";

/**
 * Renders the light markdown used in resume.json descriptions: one block per
 * line, "•" lines grouped into a bullet list ("1." lines nest under the
 * bullet above), a line that is entirely **bold** becomes a subheading,
 * plus inline **bold** and [text](url).
 */
export function RichText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const blocks: ReactNode[] = [];
  let bullets: { text: string; marker?: string; nested?: boolean }[] = [];

  const flushBullets = () => {
    if (!bullets.length) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="space-y-2">
        {bullets.map((item, i) =>
          item.marker ? (
            <li key={i} className={`relative ${item.nested ? "pl-10 sm:pl-12" : "pl-7"}`}>
              <span
                aria-hidden="true"
                className={`absolute font-mono text-sm font-semibold text-fog/60 ${
                  item.nested ? "left-4 sm:left-5" : "left-0"
                }`}
              >
                {item.marker}
              </span>
              {renderInline(item.text)}
            </li>
          ) : (
            <li key={i} className="relative pl-5">
              <span
                aria-hidden="true"
                className="absolute left-0 top-[0.7em] h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-fog/50"
              />
              {renderInline(item.text)}
            </li>
          )
        )}
      </ul>
    );
    bullets = [];
  };

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const bullet = line.match(/^[•\-–]\s+(.*)$/);
    if (bullet) {
      bullets.push({ text: bullet[1] });
      continue;
    }
    const numbered = line.match(/^(\d+\.)\s+(.*)$/);
    if (numbered) {
      // Directly under a "•" item it is a sub-point; on its own, a list.
      const prev = bullets[bullets.length - 1];
      const nested = prev ? (prev.marker ? !!prev.nested : true) : false;
      bullets.push({ text: numbered[2], marker: numbered[1], nested });
      continue;
    }
    flushBullets();
    const heading = line.match(/^\*\*([^*]+)\*\*$/);
    if (heading) {
      blocks.push(
        <h4
          key={`h-${blocks.length}`}
          className="pt-4 text-sm font-bold uppercase tracking-[0.08em] text-fog first:pt-0 sm:text-[15px]"
        >
          {heading[1]}
        </h4>
      );
      continue;
    }
    blocks.push(<p key={`p-${blocks.length}`}>{renderInline(line)}</p>);
  }
  flushBullets();

  return <div className={`space-y-3 ${className}`}>{blocks}</div>;
}

function renderInline(text: string): ReactNode[] {
  return text.split(/(\[.*?\]\(.*?\)|\*\*.*?\*\*)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-fog">
          {part.slice(2, -2)}
        </strong>
      );
    }
    const link = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (link) {
      return (
        <a
          key={i}
          href={link[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-fog underline decoration-fog/30 underline-offset-4 transition-colors hover:decoration-fog"
        >
          {link[1] === link[2] ? prettyUrl(link[2]) : link[1]}
        </a>
      );
    }
    return part;
  });
}

/** "https://kanban-app.vercel.app/" → "kanban-app.vercel.app" */
export function prettyUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}
