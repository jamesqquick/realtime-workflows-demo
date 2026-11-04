import type { JobParams } from "./progress";

export class RequestValidationError extends Error {
  constructor(
    public readonly field: string,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "RequestValidationError";
  }
}

export function validateJobId(value: string | null): string {
  if (
    !value ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    throw new RequestValidationError("jobId", "Provide a valid job ID.");
  }
  return value;
}

export async function readJobParams(request: Request): Promise<JobParams> {
  if (
    !request.headers
      .get("content-type")
      ?.split(";")[0]
      .trim()
      .toLowerCase()
      .match(/^application\/json$/)
  ) {
    throw new RequestValidationError("body", "Send application/json.", 415);
  }
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    throw new RequestValidationError("body", "Send valid JSON.");
  }
  if (
    typeof value !== "object" ||
    value === null ||
    !("prompt" in value) ||
    typeof value.prompt !== "string" ||
    !value.prompt.trim() ||
    value.prompt.trim().length > 280
  ) {
    throw new RequestValidationError(
      "prompt",
      "Enter a topic between 1 and 280 characters.",
    );
  }
  if ("failAtDraft" in value && typeof value.failAtDraft !== "boolean") {
    throw new RequestValidationError(
      "failAtDraft",
      "failAtDraft must be a boolean.",
    );
  }
  return {
    prompt: value.prompt.trim(),
    failAtDraft: "failAtDraft" in value && value.failAtDraft === true,
  };
}
