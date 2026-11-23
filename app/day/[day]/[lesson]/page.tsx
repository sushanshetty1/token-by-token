import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LessonPlayer } from "@/components/player/LessonPlayer";
import { ALL_LESSONS, getDay, neighbours } from "@/content/curriculum";

export const dynamicParams = false;

export function generateStaticParams() {
  return ALL_LESSONS.map((l) => ({ day: String(l.day), lesson: l.slug }));
}

export async function generateMetadata({ params }: PageProps<"/day/[day]/[lesson]">): Promise<Metadata> {
  const { day, lesson } = await params;
  const ref = ALL_LESSONS.find((l) => l.day === Number(day) && l.slug === lesson);
  return { title: ref ? `${ref.title} (Day ${day})` : "Lesson" };
}

export default async function LessonPage({ params }: PageProps<"/day/[day]/[lesson]">) {
  const { day, lesson } = await params;
  const d = getDay(Number(day));
  const ref = ALL_LESSONS.find((l) => l.day === Number(day) && l.slug === lesson);
  if (!d || !ref) notFound();
  const { next } = neighbours(ref.day, ref.slug);
  return <LessonPlayer lesson={ref} dayTitle={d.title} lessonsInDay={d.lessons.length} next={next} />;
}
