import type { JobParams } from "./progress";

export { JobWorkflow } from "./job-workflow";
export { ProgressRoom } from "./progress-room";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/api/health") {
      return Response.json({ ok: true });
    }

    if (request.method === "POST" && url.pathname === "/api/jobs") {
      const params = (await request.json()) as JobParams;
      const jobId = crypto.randomUUID();
      const room = env.PROGRESS_ROOM.getByName(jobId);

      await room.update({
        jobId,
        prompt: params.prompt,
        stageIndex: 0,
        completedStages: 0,
        status: "running",
        message: "Your job is starting.",
      });

      await env.JOB_WORKFLOW.create({ id: jobId, params });

      return Response.json({ jobId }, { status: 202 });
    }

    if (url.pathname === "/api/progress") {
      const jobId = url.searchParams.get("jobId");

      if (!jobId) {
        return Response.json({ error: "Missing job ID." }, { status: 400 });
      }

      const room = env.PROGRESS_ROOM.getByName(jobId);
      return room.fetch(request);
    }

    if (request.method === "GET" && url.pathname.startsWith("/api/jobs/")) {
      const jobId = url.pathname.slice("/api/jobs/".length);
      const room = env.PROGRESS_ROOM.getByName(jobId);
      const progress = await room.getLatest();

      if (!progress) {
        return Response.json({ error: "Job not found." }, { status: 404 });
      }

      const instance = await env.JOB_WORKFLOW.get(jobId);
      const { status } = await instance.status();

      return Response.json({ jobId, status, progress });
    }

    return Response.json({ error: "Not found." }, { status: 404 });
  },
} satisfies ExportedHandler<Env>;
