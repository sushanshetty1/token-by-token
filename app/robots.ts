import type { MetadataRoute } from "next";
import { SITE_URL, abs } from "@/lib/site";

export const dynamic = "force-static";

/** Search engines and AI assistants are both welcome: a course wants to be cited. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      {
        userAgent: ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "PerplexityBot", "Google-Extended", "Applebot-Extended"],
        allow: "/",
      },
    ],
    sitemap: abs("/sitemap.xml"),
    host: SITE_URL,
  };
}
