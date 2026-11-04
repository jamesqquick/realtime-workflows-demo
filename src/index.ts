import type { ProgressUpdate } from "./progress";
import {
  RequestValidationError,
  readJobParams,
  validateJobId,
} from "./validation";

export { BlogWorkflow } from "./blog-workflow";
export { ProgressRoom } from "./progress-room";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname === "/api/health" && request.method === "GET") {
        return Response.json({ ok: true, project: "workflow-lab-solution" });
      }
      if (url.pathname === "/api/jobs") {
        if (request.method !== "POST")
          return new Response(null, {
            status: 405,
            headers: { Allow: "POST" },
          });
        const params = await readJobParams(request);
        const jobId = crypto.randomUUID();
        const room = env.PROGRESS_ROOM.getByName(jobId);
        const initial: ProgressUpdate = {
          jobId,
          prompt: params.prompt,
          stageIndex: 0,
          completedStages: 0,
          status: "running",
          message: "Your job is starting.",
        };
        await room.update(initial);
        await env.BLOG_WORKFLOW.create({ id: jobId, params });
        return Response.json({ jobId }, { status: 202 });
      }
      if (url.pathname === "/api/progress") {
        const jobId = validateJobId(url.searchParams.get("jobId"));
        return env.PROGRESS_ROOM.getByName(jobId).fetch(request);
      }
      if (url.pathname.startsWith("/api/jobs/") && request.method === "GET") {
        const jobId = validateJobId(url.pathname.slice("/api/jobs/".length));
        const progress = await env.PROGRESS_ROOM.getByName(jobId).getLatest();
        if (!progress)
          return Response.json({ error: "Job not found." }, { status: 404 });
        const instance = await env.BLOG_WORKFLOW.get(jobId);
        const status = await instance.status();
        return Response.json(
          { jobId, status: status.status, progress },
          { headers: { "Cache-Control": "no-store" } },
        );
      }
      return Response.json({ error: "Not found." }, { status: 404 });
    } catch (error) {
      if (error instanceof RequestValidationError) {
        return Response.json(
          { error: error.message, field: error.field },
          { status: error.status },
        );
      }
      console.error({
        event: "request_failed",
        path: url.pathname,
        message: error instanceof Error ? error.message : String(error),
      });
      return Response.json(
        { error: "The service is unavailable. Try again." },
        { status: 503 },
      );
    }
  },
} satisfies ExportedHandler<Env>;
