import type { MetadataRoute } from "next";
import { ALL_LESSONS, DAYS } from "@/content/curriculum";
import { abs, ogImage } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const page = (path: string, priority: number, image: string) => ({
    url: abs(path),
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority,
    images: [abs(image)],
  });
  return [
    page("/", 1, ogImage("home")),
    page("/plan/", 0.9, ogImage("plan")),
    page("/cheatsheet/", 0.9, ogImage("cheatsheet")),
    page("/build/", 0.9, ogImage("build")),
    ...DAYS.map((d) => page(`/day/${d.n}/`, 0.8, ogImage(`day-${d.n}`))),
    ...ALL_LESSONS.map((l) => page(`/day/${l.day}/${l.slug}/`, 0.7, ogImage(`day-${l.day}-${l.slug}`))),
  ];
}
