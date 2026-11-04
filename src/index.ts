export default {
  fetch(request) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/health") {
      return Response.json({ ok: true, project: "workflow-lab-starter" });
    }
    if (pathname === "/api/jobs" && request.method === "POST") {
      return Response.json(
        {
          error: "The job endpoint is not implemented. No job has started yet.",
        },
        { status: 501 },
      );
    }

    const jobPath = pathname.match(/^\/api\/jobs\/([^/]+)$/);
    if (jobPath && request.method === "GET") {
      const jobId = jobPath[1];
      return Response.json(
        {
          error: "The job status endpoint is not implemented.",
        },
        { status: 501 },
      );
    }
    return Response.json({ error: "Not found" }, { status: 404 });
  },
} satisfies ExportedHandler<Env>;
