import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";
import { type JobParams, stages } from "./progress";

class DemoStageError extends NonRetryableError {
  constructor() {
    super("The draft step failed on purpose. Start another job to try again.");
  }
}

export class JobWorkflow extends WorkflowEntrypoint<Env, JobParams> {
  async run(event: WorkflowEvent<JobParams>, step: WorkflowStep) {
    const room = this.env.PROGRESS_ROOM.getByName(event.instanceId);
    const base = { jobId: event.instanceId, prompt: event.payload.prompt };
    let stageIndex = 0;

    try {
      for (const [index, stage] of stages.entries()) {
        stageIndex = index;
        await step.do(`publish ${stage.id}`, async () => {
          await room.update({
            ...base,
            stageIndex: index,
            completedStages: index,
            status: "running",
            message: stage.message,
          });
        });
        await step.sleep(`simulate ${stage.id}`, "2 seconds");
        await step.do(`run ${stage.id}`, async () => {
          if (stage.id === "draft" && event.payload.failAtDraft)
            throw new DemoStageError();
          return { stage: stage.id, prompt: event.payload.prompt };
        });
      }
      await step.do("publish completion", async () => {
        await room.update({
          ...base,
          stageIndex: stages.length - 1,
          completedStages: stages.length,
          status: "complete",
          message: "All stages finished. Your background job is complete.",
        });
      });
      return { prompt: event.payload.prompt, completedStages: stages.length };
    } catch (error) {
      await step.do("publish failure", async () => {
        await room.update({
          ...base,
          stageIndex,
          completedStages: stageIndex,
          status: "failed",
          message:
            error instanceof Error
              ? error.message
              : "The workflow failed. Start another job to try again.",
        });
      });
      throw error;
    }
  }
}
