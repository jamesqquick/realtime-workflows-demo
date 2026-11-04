export const stages = [
  {
    id: "research",
    name: "Research",
    message: "Finding sources and useful ideas",
  },
  {
    id: "outline",
    name: "Outline",
    message: "Giving the post a clear structure",
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
