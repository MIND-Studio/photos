import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server (.next/standalone/server.js) so a prod
  // Docker image can run without node_modules — mirrors drive's setup.
  output: "standalone",
  transpilePackages: ["@mind-studio/core", "@mind-studio/ui"],
};

export default nextConfig;
