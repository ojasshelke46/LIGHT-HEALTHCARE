import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Compile shared workspace packages from source (no prebuild step).
  transpilePackages: ["@light/ui", "@light/shared-types"],
};

export default nextConfig;
