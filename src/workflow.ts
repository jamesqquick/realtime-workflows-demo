import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";

import type { JobParams } from "./progress.ts";

export class Workflow extends WorkflowEntrypoint<Env, JobParams> {
  async run(event: WorkflowEvent<JobParams>, _step: WorkflowStep) {
    const { prompt } = event.payload;

    return { jobId: event.instanceId, prompt };
  }
}
