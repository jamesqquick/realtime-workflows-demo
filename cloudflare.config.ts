import { defineConfig } from "cf/config";
import * as entrypoint from "./src/index.ts" with { type: "cf-worker" };

export default defineConfig({
  worker: {
    name: "workflow-lab-starter",
    compatibilityDate: "2026-11-03",
    entrypoint,
    assets: {
      notFoundHandling: "single-page-application",
      runWorkerFirst: ["/api/*"],
    },
    observability: {
      enabled: true,
      traces: { enabled: true },
    },
  },
});
