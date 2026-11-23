import type { Metadata } from "next";
import { Home } from "@/components/home/Home";
import { JsonLd } from "@/components/seo/JsonLd";
import { course, dayList, organization, website } from "@/lib/schema";
import { SITE, ogImage, pageMeta } from "@/lib/site";

const meta = pageMeta({
  title: SITE.tagline,
  description:
    "A free 7-day course on how LLMs work: 20 animated lessons on tokens, attention and training, Karpathy's videos to build a GPT, and interview answers.",
  path: "/",
  image: ogImage("home"),
  imageAlt: `${SITE.name}: ${SITE.tagline}`,
});

export const metadata: Metadata = { ...meta, title: { absolute: `${SITE.name}: ${SITE.tagline}` } };

export default function Page() {
  return (
    <>
      <JsonLd data={[organization, website, course(), dayList()]} />
      <Home />
    </>
  );
}
