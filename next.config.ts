import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // A separate build folder lets `next build` run while `next dev` keeps using .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  trailingSlash: true,
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
