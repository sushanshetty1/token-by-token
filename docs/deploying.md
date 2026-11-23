# Deploying

`bun run build` writes a fully static site to `out/`: one `index.html` per route (`trailingSlash: true`), the assets under `_next/`, and `sitemap.xml`, `robots.txt`, `manifest.webmanifest`, `llms.txt` and `llms-full.txt` at the root. There is no server code, so any static host works.

## Set the site address

Canonical links, share cards, the sitemap and the structured data use absolute URLs. Build with the address the site will live at:

```bash
NEXT_PUBLIC_SITE_URL=https://your-domain.example bun run build
```

Without it, every absolute link points at `https://tokenbytoken.app` (see `lib/site.ts`).

## Docker behind Traefik (how llm.sushans.dev runs)

`deploy/` builds the export on Node 24 and serves it with nginx (128 MB, read-only filesystem, no Node at runtime). `deploy/docker-compose.yml` publishes no ports: it joins an existing Traefik network (`dokploy-network` by default) and labels the container so Traefik routes the domain to it and gets a Let's Encrypt certificate.

```bash
# first time, on the server
mkdir -p /opt/token-by-token && echo "DOMAIN=llm.example.com" > /opt/token-by-token/deploy/.env

# every update, from your machine
git archive HEAD | ssh root@your-server 'tar -x -C /opt/token-by-token'
ssh root@your-server 'cd /opt/token-by-token && docker compose -p token-by-token -f deploy/docker-compose.yml --env-file deploy/.env up -d --build'
```

`NEXT_PUBLIC_SITE_URL` comes from `DOMAIN` as a build argument, so changing the domain means a rebuild. nginx answers a real 404 for unknown paths (never the homepage), adds the trailing slash with a 301, and caches `/_next/static/` for a year.

## Other hosts

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
