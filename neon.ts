import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  auth: true,
  aiGateway: true,
  preview: {
    functions: {
      api: { name: "api", source: "./lib/portal.ts" },
    },
  },
});
