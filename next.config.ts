import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standard rendering for a live, data-driven product dashboard.
  // The scanner reads the bundled sample target from disk at runtime, so make
  // sure it ships inside the serverless functions that use it.
  outputFileTracingIncludes: {
    "/api/scan": ["./samples/**/*"],
    "/api/scan/stream": ["./samples/**/*"],
  },
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
