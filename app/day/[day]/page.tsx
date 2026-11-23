import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DayView } from "@/components/day/DayView";
import { JsonLd } from "@/components/seo/JsonLd";
import { DAYS, getDay } from "@/content/curriculum";
import { breadcrumbs, dayCourse, dayFaq } from "@/lib/schema";
import { ogImage, pageMeta, snippet } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return DAYS.map((d) => ({ day: String(d.n) }));
}

export async function generateMetadata({ params }: PageProps<"/day/[day]">): Promise<Metadata> {
  const { day } = await params;
  const d = getDay(Number(day));
  if (!d) return { title: "Day" };
  return pageMeta({
    title: `Day ${d.n}: ${d.title}`,
    description: snippet(`Day ${d.n} of 7. ${d.tagline} ${d.lessons.length} animated lessons, the videos to watch, what to build and ${d.checks.length} interview questions with answers.`),
    path: `/day/${d.n}/`,
    image: ogImage(`day-${d.n}`),
    imageAlt: `Day ${d.n} of building an LLM from scratch: ${d.title}`,
    keywords: d.lessons.map((l) => l.title.toLowerCase()),
  });
}

export default async function DayPage({ params }: PageProps<"/day/[day]">) {
  const { day } = await params;
  const d = getDay(Number(day));
  if (!d) notFound();
  return (
    <>
      <JsonLd data={[dayCourse(d), dayFaq(d), breadcrumbs([{ name: `Day ${d.n}: ${d.title}`, path: `/day/${d.n}/` }])]} />
      <DayView day={d} prev={getDay(d.n - 1)} next={getDay(d.n + 1)} />
    </>
  );
}
