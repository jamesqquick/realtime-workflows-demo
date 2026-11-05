import { bindings, defineConfig, defineWorker, exports } from "cf/config";
import * as entrypoint from "./src/index.ts" with { type: "cf-worker" };

const workerName = "workflow-lab-solution";
const workflowName = `${workerName}-job`;
const app = defineWorker({
  name: workerName,
  compatibilityDate: "2026-11-03",
  entrypoint,
  exports: {
    JobWorkflow: exports.workflow({ name: workflowName }),
    ProgressRoom: exports.durableObject({ storage: "sqlite" }),
  },
});

export default defineConfig({
  worker: {
    ...app,
    assets: {
      notFoundHandling: "single-page-application",
      runWorkerFirst: ["/api/*"],
    },
    env: {
      JOB_WORKFLOW: bindings.workflow({
        name: workflowName,
        worker: app,
        exportName: "JobWorkflow",
      }),
      PROGRESS_ROOM: bindings.durableObject({
        worker: app,
        exportName: "ProgressRoom",
      }),
    },
    observability: {
      enabled: true,
      traces: { enabled: true },
    },
  },
});
