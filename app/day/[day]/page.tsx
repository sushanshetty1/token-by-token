import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DayView } from "@/components/day/DayView";
import { DAYS, getDay } from "@/content/curriculum";

export const dynamicParams = false;

export function generateStaticParams() {
  return DAYS.map((d) => ({ day: String(d.n) }));
}

export async function generateMetadata({ params }: PageProps<"/day/[day]">): Promise<Metadata> {
  const { day } = await params;
  const d = getDay(Number(day));
  return { title: d ? `Day ${d.n}: ${d.title}` : "Day" };
}

export default async function DayPage({ params }: PageProps<"/day/[day]">) {
  const { day } = await params;
  const d = getDay(Number(day));
  if (!d) notFound();
  return <DayView day={d} prev={getDay(d.n - 1)} next={getDay(d.n + 1)} />;
}
