import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components is deliberately left off: every page in this app is a
  // live, session-gated internal tool (dashboard stats, stock, sales) with
  // nothing worth prerendering, and opting in would require wrapping every
  // data read in Suspense boundaries / "use cache: private" for no benefit.
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
