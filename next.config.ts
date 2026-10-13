import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Test builds use a separate folder so they never overwrite the running dev server's .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // The older app routes still work, but /sql/… is the canonical site: keep them out of search results.
  async headers() {
    const legacy = [
      "/learn", "/learn/:path*", "/lesson/:path*", "/practice", "/practice/:path*", "/projects", "/projects/:path*",
      "/playground", "/database-lab", "/query-performance", "/sql-syntax", "/explore", "/subjects", "/skills/:path*",
      "/my-learning", "/progress", "/review", "/review/:path*", "/settings", "/placement",
    ];
    return legacy.map((source) => ({ source, headers: [{ key: "X-Robots-Tag", value: "noindex, follow" }] }));
  },
  async redirects() {
    return [
      { source: "/rt", destination: "/", permanent: true },
      { source: "/rt/:path*", destination: "/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
