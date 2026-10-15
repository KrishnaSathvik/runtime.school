import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Test builds use a separate folder so they never overwrite the running dev server's .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // The older app routes still work, but /sql/… is the canonical site: keep them out of search results.
  async headers() {
    const legacy = [
      "/learn", "/learn/:path*", "/lesson/:path*", "/practice", "/practice/:path*", "/projects", "/projects/:path*",
      "/explore", "/subjects", "/skills/:path*",
      "/my-learning", "/progress", "/review", "/review/:path*", "/settings", "/placement",
    ];
    return [
      ...legacy.map((source) => ({ source, headers: [{ key: "X-Robots-Tag", value: "noindex, follow" }] })),
      // Pyodide files live under a versioned folder, so they never change in place.
      { source: "/vendor/pyodide/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      // Canonical SQL datasets are named by content hash, so a new build always gets a new URL.
      { source: "/datasets/canonical/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
    ];
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
    ];
  },
};

export default nextConfig;
