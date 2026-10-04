import type { NextConfig } from "next";
const config: NextConfig = {
  serverExternalPackages: [
    "@mastra/core",
    "@mastra/pg",
    "pg",
    "pdf-parse",
    "agentmail",
  ],
  devIndicators: false,
  allowedDevOrigins: ["192.168.0.241", "192.168.0.24"],
};
export default config;
