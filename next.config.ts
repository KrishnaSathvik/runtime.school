import type { NextConfig } from "next";
import { retiredRedirects } from "./src/platform/retired-urls";

const nextConfig: NextConfig = {
  // Test builds use a separate folder so they never overwrite the running dev server's .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async headers() {
    return [
      // The isolated Python runner (an opaque origin) loads its files cross-origin, without credentials, from /runner/.
      // It's a separate path on purpose: browsers that cached /vendor/pyodide/* (immutable, before CORS was needed)
      // would otherwise reuse those copies without the CORS header and fail to load Python.
      { source: "/runner/:path*", headers: [{ key: "Access-Control-Allow-Origin", value: "*" }] },
      { source: "/runner/pyodide/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      // Pyodide files live under a versioned folder, so they never change in place.
      { source: "/vendor/pyodide/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      // Canonical SQL datasets are named by content hash, so a new build always gets a new URL.
      { source: "/datasets/canonical/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      // Python dataset editions live under a versioned folder, and a published version is never rebuilt differently.
      { source: "/datasets/python/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
    ];
  },
  async rewrites() {
    // The runner's files (python-sandbox.mjs, python-worker.mjs, pyodide/…) are served from public/vendor under /runner/.
    return [{ source: "/runner/:path*", destination: "/vendor/:path*" }];
  },
  async redirects() {
    return [
      { source: "/rt", destination: "/", permanent: true },
      { source: "/rt/:path*", destination: "/:path*", permanent: true },
      // The SQL tools live under /sql; older addresses keep working (query strings are kept).
      { source: "/playground", destination: "/sql/playground", permanent: true },
      { source: "/database-lab", destination: "/sql/lab", permanent: true },
      { source: "/query-performance", destination: "/sql/query-performance", permanent: true },
      { source: "/sql-syntax", destination: "/sql/syntax", permanent: true },
      { source: "/sql/query-plans", destination: "/sql/query-performance", permanent: true },
      { source: "/sql/lab/datasets", destination: "/sql/lab", permanent: true },
      ...retiredRedirects(),
    ];
  },
};

export default nextConfig;
