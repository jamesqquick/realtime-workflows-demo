import { defineConfig, defineWorker } from "cf/config";
import * as entrypoint from "./src/index.ts" with { type: "cf-worker" };

const workerName = "workflow-lab-solution";

const app = defineWorker({
  name: workerName,
  compatibilityDate: "2026-11-03",
  entrypoint,
});

export default defineConfig({
  worker: {
    ...app,
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
