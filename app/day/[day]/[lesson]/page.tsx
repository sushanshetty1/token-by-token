import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LessonPlayer } from "@/components/player/LessonPlayer";
import { LessonTranscript } from "@/components/player/LessonTranscript";
import { JsonLd } from "@/components/seo/JsonLd";
import { ALL_LESSONS, getDay, neighbours } from "@/content/curriculum";
import { lessonGraph } from "@/lib/schema";
import { ogImage, pageMeta, snippet } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return ALL_LESSONS.map((l) => ({ day: String(l.day), lesson: l.slug }));
}

const find = (day: string, lesson: string) => ALL_LESSONS.find((l) => l.day === Number(day) && l.slug === lesson);

export async function generateMetadata({ params }: PageProps<"/day/[day]/[lesson]">): Promise<Metadata> {
  const { day, lesson } = await params;
  const ref = find(day, lesson);
  const d = getDay(Number(day));
  if (!ref || !d) return { title: "Lesson" };
  return pageMeta({
    title: `${ref.title}, explained visually`,
    description: snippet(`${ref.promise} A free ${ref.minutes}-minute animated lesson, Day ${d.n}: ${d.title}.`),
    path: `/day/${ref.day}/${ref.slug}/`,
    image: ogImage(`day-${ref.day}-${ref.slug}`),
    imageAlt: `${ref.title}: ${ref.promise}`,
    type: "article",
    keywords: [ref.title.toLowerCase(), d.title.toLowerCase()],
  });
}

export default async function LessonPage({ params }: PageProps<"/day/[day]/[lesson]">) {
  const { day, lesson } = await params;
  const d = getDay(Number(day));
  const ref = find(day, lesson);
  if (!d || !ref) notFound();
  const { next } = neighbours(ref.day, ref.slug);
  return (
    <>
      <JsonLd data={lessonGraph(ref, d)} />
      <LessonPlayer lesson={ref} dayTitle={d.title} lessonsInDay={d.lessons.length} next={next} />
      <LessonTranscript lessonKey={`${ref.day}/${ref.slug}`} title={ref.title} />
    </>
  );
}
