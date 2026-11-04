import { DurableObject } from "cloudflare:workers";
import type { ProgressUpdate } from "./progress";

export class ProgressRoom extends DurableObject<Env> {
  async update(update: ProgressUpdate): Promise<void> {
    const previous = await this.getLatest();
    if (
      previous &&
      (previous.status !== "running" ||
        update.completedStages < previous.completedStages)
    )
      return;
    await this.ctx.storage.put("latest", update);
    const message = JSON.stringify(update);
    for (const socket of this.ctx.getWebSockets()) {
      try {
        socket.send(message);
      } catch {
        console.warn({
          event: "progress_delivery_failed",
          jobId: update.jobId,
        });
      }
    }
  }

  getLatest(): Promise<ProgressUpdate | undefined> {
    return this.ctx.storage.get<ProgressUpdate>("latest");
  }

  async fetch(request: Request): Promise<Response> {
    if (
      request.method !== "GET" ||
      request.headers.get("Upgrade")?.toLowerCase() !== "websocket"
    ) {
      return Response.json(
        { error: "Expected a WebSocket connection." },
        { status: 426 },
      );
    }
    const latest = await this.getLatest();
    if (!latest)
      return Response.json({ error: "Job not found." }, { status: 404 });
    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server);
    server.send(JSON.stringify(latest));
    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(socket: WebSocket): void {
    socket.close(1008, "Progress connections are read-only.");
  }

  webSocketClose(socket: WebSocket): void {
    socket.close(1000, "Connection closed.");
  }

  webSocketError(socket: WebSocket): void {
    socket.close(1011, "Connection error.");
  }
}
