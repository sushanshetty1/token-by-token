import type { DayContent, LessonMeta } from "@/lib/types";
import day1 from "./day-1/day";
import day2 from "./day-2/day";
import day3 from "./day-3/day";
import day4 from "./day-4/day";
import day5 from "./day-5/day";
import day6 from "./day-6/day";
import day7 from "./day-7/day";

export const DAYS: DayContent[] = [day1, day2, day3, day4, day5, day6, day7];

export const getDay = (n: number) => DAYS.find((d) => d.n === n);

export const lessonKey = (day: number, slug: string) => `${day}/${slug}`;

export interface LessonRef extends LessonMeta {
  day: number;
  index: number;
}

export const ALL_LESSONS: LessonRef[] = DAYS.flatMap((d) =>
  d.lessons.map((l, index) => ({ ...l, day: d.n, index })),
);

export const TOTAL_MINUTES = DAYS.reduce(
  (sum, d) => sum + d.schedule.reduce((s, b) => s + b.minutes, 0),
  0,
);

export function neighbours(day: number, slug: string) {
  const i = ALL_LESSONS.findIndex((l) => l.day === day && l.slug === slug);
  return { prev: ALL_LESSONS[i - 1], next: ALL_LESSONS[i + 1] };
}
