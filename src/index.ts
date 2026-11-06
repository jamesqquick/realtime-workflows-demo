import type { JobParams } from "./progress";

export default {
  async fetch(request, _env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return Response.json({ ok: true, project: "workflow-lab-starter" });
    }
    if (url.pathname === "/api/jobs" && request.method === "POST") {
      const params = (await request.json()) as JobParams;
      const jobId = crypto.randomUUID();
      void params;
      void jobId;

      return Response.json(
        {
          error: "This endpoint is not implemented.",
        },
        { status: 501 },
      );
    }

    if (url.pathname === "/api/progress") {
      const jobId = url.searchParams.get("jobId");

      if (!jobId) {
        return Response.json({ error: "Missing job ID." }, { status: 400 });
      }
      return Response.json(
        {
          error: "This endpoint is not implemented.",
        },
        { status: 501 },
      );
    }

    const jobStatusPath = url.pathname.match(/^\/api\/jobs\/([^/]+)$/);
    if (request.method === "GET" && jobStatusPath) {
      const jobId = url.pathname.slice("/api/jobs/".length);
      void jobId;

      return Response.json(
        {
          error: "This endpoint is not implemented.",
        },
        { status: 501 },
      );
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  },
} satisfies ExportedHandler<Env>;
