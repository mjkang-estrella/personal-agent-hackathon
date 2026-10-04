import { withWorkflow } from "workflow/next";
import type { NextConfig } from "next";
const config: NextConfig = {
  serverExternalPackages: [
    "@mastra/core",
    "@mastra/pg",
    "pg",
    "pdf-parse",
    "@napi-rs/canvas",
    "agentmail",
    "@browserbasehq/stagehand",
  ],
  outputFileTracingIncludes: {
    "/api/documents": [
      "./node_modules/@napi-rs/canvas*/**/*",
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
    ],
    // Stagehand v4 uploads its Chrome extension zip to each Kernel browser.
    "/api/browser": ["./node_modules/@browserbasehq/stagehand/dist/**/*"],
  },
  devIndicators: false,
  allowedDevOrigins: ["192.168.0.241", "192.168.0.24"],
};
export default withWorkflow(config);
