import { useEffect, useRef, useState } from "react";
import type { ProgressUpdate } from "../src/progress";

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
  const terminal = useRef(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Changing attempt reconnects to the same job.
  useEffect(() => {
    setProgress(null);
    setConnection(jobId ? "Connecting" : "Ready");
    terminal.current = false;
    if (!jobId) return;

    let active = true;
    const url = new URL("/api/progress", location.href);
    url.protocol = location.protocol === "https:" ? "wss:" : "ws:";
    url.searchParams.set("jobId", jobId);
    const socket = new WebSocket(url);
    socket.onopen = () => {
      if (active && !terminal.current) setConnection("Live");
    };

    // Add socket.onmessage here in the Connect the browser exercise.

    const disconnected = () => {
      if (active && !terminal.current) setConnection("Disconnected");
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
