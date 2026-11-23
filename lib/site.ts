import type { Metadata } from "next";

/**
 * Where the site is served. Canonical links, the sitemap, share cards and
 * structured data are all absolute, so set NEXT_PUBLIC_SITE_URL at build time
 * when the domain changes.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://tokenbytoken.app").replace(/\/+$/, "");

export const SITE = {
  name: "Token by Token",
  tagline: "Build an LLM from scratch in 7 days",
  description:
    "A free, visual 7-day course on how large language models work. Animated lessons on tokenization, embeddings, attention, transformers, training and inference, paired with Andrej Karpathy's build-it-yourself videos and interview questions with answers.",
  locale: "en_US",
  keywords: [
    "build an LLM from scratch",
    "how large language models work",
    "LLM course",
    "transformer explained",
    "attention mechanism explained",
    "self-attention visualized",
    "queries keys and values",
    "GPT from scratch",
    "nanoGPT",
    "Andrej Karpathy",
    "Zero to Hero",
    "3Blue1Brown transformers",
    "tokenization BPE",
    "embeddings",
    "backpropagation",
    "KV cache",
    "LLM interview questions",
    "machine learning interview prep",
    "deep learning course",
  ],
};

export const abs = (path = "/") => new URL(path, `${SITE_URL}/`).toString();

export const ogImage = (slug: string) => `/og/${slug}.png`;

/** ISO 8601 duration from minutes, for schema.org timeRequired. */
export const isoMinutes = (m: number) => {
  const h = Math.floor(m / 60);
  const r = m % 60;
  return `PT${h ? `${h}H` : ""}${r || !h ? `${r}M` : ""}`;
};

/** Trim to a search-snippet length on a word boundary. */
export function snippet(text: string, max = 158) {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:.\s]+$/, "")}…`;
}

/** Everything a page needs to be found and shared: canonical, Open Graph, X card. */
export function pageMeta({
  title,
  description,
  path,
  image,
  imageAlt,
  type = "website",
  keywords = [],
}: {
  title: string;
  description: string;
  path: string;
  image: string;
  imageAlt: string;
  type?: "website" | "article";
  keywords?: string[];
}): Metadata {
  const images = [{ url: image, width: 1200, height: 630, alt: imageAlt, type: "image/png" }];
  return {
    title,
    description,
    keywords: [...keywords, ...SITE.keywords],
    alternates: { canonical: path },
    openGraph: {
      type,
      url: path,
      siteName: SITE.name,
      locale: SITE.locale,
      title: `${title} | ${SITE.name}`,
      description,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${SITE.name}`,
      description,
      images: [{ url: image, alt: imageAlt }],
    },
  };
}
