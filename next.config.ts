import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Test builds use a separate folder so they never overwrite the running dev server's .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
