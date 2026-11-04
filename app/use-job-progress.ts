import { useEffect, useState } from "react";
import { isProgressUpdate, type ProgressUpdate } from "../src/progress";

type Connection =
  | "Ready"
  | "Connecting"
  | "Live"
  | "Complete"
  | "Failed"
  | "Disconnected";

export function useJobProgress(jobId: string | null) {
  const [progress, setProgress] = useState<ProgressUpdate | null>(null);
  const [connection, setConnection] = useState<Connection>("Ready");
  const [attempt, setAttempt] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Changing attempt reconnects to the same job.
  useEffect(() => {
    setProgress(null);
    setConnection(jobId ? "Connecting" : "Ready");
    if (!jobId) return;
    let active = true;
    let terminal = false;
    const url = new URL("/api/progress", location.href);
    url.protocol = location.protocol === "https:" ? "wss:" : "ws:";
    url.searchParams.set("jobId", jobId);
    const socket = new WebSocket(url);
    socket.onopen = () => {
      if (active && !terminal) setConnection("Live");
    };
    socket.onmessage = (event) => {
      if (!active) return;
      let update: unknown;
      try {
        update = JSON.parse(event.data);
      } catch {
        return;
      }
      if (!isProgressUpdate(update) || update.jobId !== jobId) return;
      setProgress(update);
      if (update.status !== "running") {
        terminal = true;
        setConnection(update.status === "complete" ? "Complete" : "Failed");
        socket.close(1000, "Job finished.");
      }
    };
    const disconnected = () => {
      if (active && !terminal) setConnection("Disconnected");
    };
    socket.onerror = disconnected;
    socket.onclose = disconnected;
    return () => {
      active = false;
      socket.close();
    };
  }, [jobId, attempt]);

  return {
    progress: progress?.jobId === jobId ? progress : null,
    connection,
    reconnect: () => setAttempt((value) => value + 1),
  };
}
