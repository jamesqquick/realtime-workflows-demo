import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

class AppStartupError extends Error {
  constructor(output) {
    super(`Could not start the app:\n${output}`);
    this.name = "AppStartupError";
  }
}

export async function startApp() {
  const reservation = createServer();
  reservation.listen(0, "127.0.0.1");
  await once(reservation, "listening");
  const { port } = reservation.address();
  await new Promise((resolve) => reservation.close(resolve));
  const origin = `http://127.0.0.1:${port}`;
  const child = spawn(
    "pnpm",
    [
      "exec",
      "vite",
      "--host",
      "127.0.0.1",
      "--port",
      String(port),
      "--strictPort",
    ],
    {
      cwd: fileURLToPath(new URL("../", import.meta.url)),
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let output = "";
  for (const stream of [child.stdout, child.stderr]) {
    stream.on("data", (chunk) => {
      output = (output + chunk).slice(-12000);
    });
  }
  const stop = async () => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    const exit = once(child, "exit");
    process.kill(-child.pid, "SIGTERM");
    await exit;
  };
  try {
    for (let attempt = 0; attempt < 300; attempt += 1) {
      if (child.exitCode !== null) throw new AppStartupError(output);
      try {
        const response = await fetch(`${origin}/api/health`, {
          signal: AbortSignal.timeout(1000),
        });
        if (response.ok) return { origin, stop };
      } catch {
        /* The dev server is still starting. */
      }
      await delay(100);
    }
    throw new AppStartupError(output);
  } catch (error) {
    await stop();
    throw error;
  }
}
