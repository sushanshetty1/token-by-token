import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // A separate build folder lets `next build` run while `next dev` keeps using .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  trailingSlash: true,
  images: { unoptimized: true },
  // Sandboxed shells cannot open the sockets Turbopack's child-process loader pool uses;
  // NEXT_LOADER_THREADS=1 runs CSS loaders in worker threads instead.
  experimental: process.env.NEXT_LOADER_THREADS
    ? { turbopackPluginRuntimeStrategy: "forceWorkerThreads" }
    : {},
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
