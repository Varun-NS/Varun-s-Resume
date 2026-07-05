import { notFound } from "next/navigation";
import resume from "@/data/resume.json";
import type { ResumeData } from "@/lib/types";
import { DetailView } from "@/components/UI/DetailView";

const data = resume as ResumeData;

export function generateStaticParams() {
  const allCards = data.sections.flatMap(s => s.cards);
  return allCards.map((card) => ({ slug: card.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const slug = (await params).slug;
  const allCards = data.sections.flatMap(s => s.cards);
  const card = allCards.find((c) => c.slug === slug);
  if (!card) return {};
  return {
    title: `${card.title} — ${data.profile.name}`,
    description: card.subtitle,
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const slug = (await params).slug;
  const allCards = data.sections.flatMap(s => s.cards);
  const card = allCards.find((c) => c.slug === slug);
  if (!card) notFound();
  return <DetailView card={card} />;
}
