export const stages = [
  {
    id: "research",
    name: "Research",
    message: "Finding sources and useful ideas",
  },
  {
    id: "outline",
    name: "Outline",
    message: "Organizing the work into a clear plan",
  },
  { id: "draft", name: "Draft", message: "Putting the first version together" },
  { id: "review", name: "Review", message: "Checking the result" },
] as const;

export type JobParams = { prompt: string; failAtDraft?: boolean };

export type ProgressUpdate = {
  jobId: string;
  prompt: string;
  stageIndex: number;
  completedStages: number;
  status: "running" | "complete" | "failed";
  message: string;
};

export function isProgressUpdate(value: unknown): value is ProgressUpdate {
  if (typeof value !== "object" || value === null) return false;
  return (
    "jobId" in value &&
    typeof value.jobId === "string" &&
    "prompt" in value &&
    typeof value.prompt === "string" &&
    "message" in value &&
    typeof value.message === "string" &&
    "stageIndex" in value &&
    typeof value.stageIndex === "number" &&
    Number.isInteger(value.stageIndex) &&
    value.stageIndex >= 0 &&
    value.stageIndex < stages.length &&
    "completedStages" in value &&
    typeof value.completedStages === "number" &&
    Number.isInteger(value.completedStages) &&
    value.completedStages >= 0 &&
    value.completedStages <= stages.length &&
    "status" in value &&
    (value.status === "running" ||
      value.status === "complete" ||
      value.status === "failed")
  );
}
