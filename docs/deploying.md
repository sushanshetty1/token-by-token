# Deploying

`bun run build` writes a fully static site to `out/`: one `index.html` per route (`trailingSlash: true`), the assets under `_next/`, and `sitemap.xml`, `robots.txt`, `manifest.webmanifest`, `llms.txt` and `llms-full.txt` at the root. There is no server code, so any static host works.

## Set the site address

Canonical links, share cards, the sitemap and the structured data use absolute URLs. Build with the address the site will live at:

```bash
NEXT_PUBLIC_SITE_URL=https://your-domain.example bun run build
```

Without it, every absolute link points at `https://tokenbytoken.app` (see `lib/site.ts`).

## Hosts

| Host | Build command | Output directory |
| --- | --- | --- |
| Cloudflare Pages | `bun install && bun run build` | `out` |
| Netlify | `bun install && bun run build` | `out` |
| Vercel | `bun run build` | `out` |
| Any web server | `bun run build`, then copy `out/` | |

Set `NEXT_PUBLIC_SITE_URL` in the host's environment variables. The site expects to be served from the root of its domain, not from a sub-path.

## After the first deploy

1. Open `/sitemap.xml` and `/robots.txt` and check that they show your domain.
2. Submit the sitemap in Google Search Console and Bing Webmaster Tools.
3. Paste a lesson URL into the [Rich Results Test](https://search.google.com/test/rich-results) to check the `Course` and `FAQPage` data.
4. Share a link in a chat app to check the preview card.
