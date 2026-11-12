import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // checks build into their own folder so they never touch a running `next dev` (which owns `.next`)
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
