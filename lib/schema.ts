import { ALL_LESSONS, DAYS, TOTAL_MINUTES, type LessonRef } from "@/content/curriculum";
import type { DayContent } from "@/lib/types";
import { SITE, abs, isoMinutes, ogImage } from "@/lib/site";

const ORG_ID = abs("/#org");
const SITE_ID = abs("/#website");
const COURSE_ID = abs("/#course");

const dayUrl = (n: number) => abs(`/day/${n}/`);
const lessonUrl = (l: { day: number; slug: string }) => abs(`/day/${l.day}/${l.slug}/`);
const dayMinutes = (d: DayContent) => d.schedule.reduce((s, b) => s + b.minutes, 0);

const LEVEL: Record<string, string> = { Beginner: "Beginner", Core: "Intermediate", Deep: "Advanced" };

const free = {
  "@type": "Offer",
  category: "Free",
  price: 0,
  priceCurrency: "USD",
  availability: "https://schema.org/InStock",
};

const instance = (minutes: number) => ({
  "@type": "CourseInstance",
  courseMode: "Online",
  courseSchedule: { "@type": "Schedule", repeatFrequency: "Daily", repeatCount: 7 },
  courseWorkload: isoMinutes(minutes),
  inLanguage: "en",
});

export const organization = {
  "@type": "Organization",
  "@id": ORG_ID,
  name: SITE.name,
  url: abs("/"),
  logo: { "@type": "ImageObject", url: abs("/icons/icon-512.png"), width: 512, height: 512 },
};

export const website = {
  "@type": "WebSite",
  "@id": SITE_ID,
  name: SITE.name,
  alternateName: SITE.tagline,
  url: abs("/"),
  description: SITE.description,
  inLanguage: "en",
  publisher: { "@id": ORG_ID },
};

export function breadcrumbs(items: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: [{ name: SITE.name, path: "/" }, ...items].map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: abs(it.path),
    })),
  };
}

function lessonResource(l: LessonRef, dayTitle: string) {
  return {
    "@type": "LearningResource",
    "@id": `${lessonUrl(l)}#lesson`,
    name: l.title,
    description: l.promise,
    url: lessonUrl(l),
    image: abs(ogImage(`day-${l.day}-${l.slug}`)),
    learningResourceType: ["Interactive lesson", "Animation"],
    interactivityType: "mixed",
    educationalLevel: LEVEL[l.level],
    timeRequired: isoMinutes(l.minutes),
    teaches: l.promise,
    inLanguage: "en",
    isAccessibleForFree: true,
    position: l.index + 1,
    isPartOf: { "@type": "Course", "@id": `${dayUrl(l.day)}#course`, name: `Day ${l.day}: ${dayTitle}` },
    provider: { "@id": ORG_ID },
  };
}

/** The whole seven days as one Course, with each day as a syllabus section. */
export function course() {
  return {
    "@type": "Course",
    "@id": COURSE_ID,
    name: SITE.tagline,
    alternateName: SITE.name,
    description: SITE.description,
    url: abs("/"),
    image: abs(ogImage("home")),
    provider: { "@id": ORG_ID },
    publisher: { "@id": ORG_ID },
    inLanguage: "en",
    isAccessibleForFree: true,
    educationalLevel: "Beginner to advanced",
    timeRequired: isoMinutes(TOTAL_MINUTES),
    coursePrerequisites: ["Basic Python", "High school algebra"],
    teaches: DAYS.map((d) => d.outcome),
    about: ["Large language models", "Transformers", "Self-attention", "GPT", "Deep learning"].map((name) => ({
      "@type": "Thing",
      name,
    })),
    numberOfCredits: 0,
    offers: free,
    hasCourseInstance: instance(TOTAL_MINUTES),
    syllabusSections: DAYS.map((d) => ({
      "@type": "Syllabus",
      name: `Day ${d.n}: ${d.title}`,
      description: d.tagline,
      timeRequired: isoMinutes(dayMinutes(d)),
      url: dayUrl(d.n),
    })),
    hasPart: DAYS.map((d) => ({ "@id": `${dayUrl(d.n)}#course` })),
  };
}

/** Every day as a list of courses, the shape search engines use for course carousels. */
export function dayList() {
  return {
    "@type": "ItemList",
    name: `${SITE.tagline}: the seven days`,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    numberOfItems: DAYS.length,
    itemListElement: DAYS.map((d, i) => ({ "@type": "ListItem", position: i + 1, url: dayUrl(d.n) })),
  };
}

export function dayCourse(d: DayContent) {
  return {
    "@type": "Course",
    "@id": `${dayUrl(d.n)}#course`,
    name: `Day ${d.n}: ${d.title}`,
    description: `${d.tagline} ${d.outcome}`,
    url: dayUrl(d.n),
    image: abs(ogImage(`day-${d.n}`)),
    provider: { "@id": ORG_ID },
    inLanguage: "en",
    isAccessibleForFree: true,
    timeRequired: isoMinutes(dayMinutes(d)),
    teaches: d.explainOutLoud,
    offers: free,
    hasCourseInstance: instance(dayMinutes(d)),
    isPartOf: { "@id": COURSE_ID },
    position: d.n,
    hasPart: ALL_LESSONS.filter((l) => l.day === d.n).map((l) => lessonResource(l, d.title)),
    citation: d.watch.map((r) => ({ "@type": "CreativeWork", name: r.title, author: r.by, url: r.url })),
  };
}

/** Each day's self-check, question and model answer. */
export function dayFaq(d: DayContent) {
  return {
    "@type": "FAQPage",
    "@id": `${dayUrl(d.n)}#check`,
    name: `Day ${d.n} interview questions: ${d.title}`,
    mainEntity: d.checks.map((c) => ({
      "@type": "Question",
      name: c.q,
      acceptedAnswer: { "@type": "Answer", text: c.a },
    })),
  };
}

export function lessonGraph(l: LessonRef, d: DayContent) {
  return [
    lessonResource(l, d.title),
    breadcrumbs([
      { name: `Day ${d.n}: ${d.title}`, path: `/day/${d.n}/` },
      { name: l.title, path: `/day/${d.n}/${l.slug}/` },
    ]),
  ];
}
