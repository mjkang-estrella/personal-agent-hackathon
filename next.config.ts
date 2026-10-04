import type { NextConfig } from "next";
const config: NextConfig = {
  serverExternalPackages: [
    "@mastra/core",
    "@mastra/pg",
    "pg",
    "pdf-parse",
    "@napi-rs/canvas",
    "agentmail",
  ],
  outputFileTracingIncludes: {
    "/api/documents": [
      "./node_modules/@napi-rs/canvas*/**/*",
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
    ],
  },
  devIndicators: false,
  allowedDevOrigins: ["192.168.0.241", "192.168.0.24"],
};
export default config;
