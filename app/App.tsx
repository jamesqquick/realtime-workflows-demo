import { useEffect, useState } from "react";
import { type ProgressUpdate, stages } from "../src/progress";
import { useJobProgress } from "./use-job-progress";

export function App() {
  const [prompt, setPrompt] = useState(
    "How to send real-time updates from a background job",
  );
  const [jobId, setJobId] = useState(() =>
    new URLSearchParams(location.search).get("jobId"),
  );
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { progress, connection, reconnect } = useJobProgress(jobId);
  const busy =
    starting || (!!jobId && (!progress || progress.status === "running"));
  const percent = Math.round(
    ((progress?.completedStages ?? 0) / stages.length) * 100,
  );
  const message = starting
    ? "Starting your workflow…"
    : (progress?.message ??
      (jobId ? "Connecting to your job…" : "Ready when you are."));

  useEffect(() => {
    const onPopState = () => {
      setJobId(new URLSearchParams(location.search).get("jobId"));
      setError(null);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  async function startJob(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setStarting(true);
    setError(null);
    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!response.ok) {
        setError("Could not start the job.");
        return;
      }
      const { jobId } = (await response.json()) as { jobId: string };
      const url = new URL(location.href);
      url.searchParams.set("jobId", jobId);
      history.pushState(null, "", url);
      setJobId(jobId);
    } catch {
      setError("Could not start the job.");
    } finally {
      setStarting(false);
    }
  }

  function startFresh(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    const url = new URL(location.href);
    url.searchParams.delete("jobId");
    history.pushState(null, "", url);
    setJobId(null);
    setError(null);
  }

  return (
    <div className="shell">
      <header className="site-header">
        <a className="wordmark" href="/">
          Workflow Lab
        </a>
        <span className="badge">Reference solution</span>
      </header>
      <main>
        <p className="eyebrow">Cloudflare Workflows + Durable Objects</p>
        <h1>
          Give your background jobs
          <br />a little foreground.
        </h1>
        <p className="intro">
          A real Workflow runs each stage. A Durable Object sends its progress
          to this page over a WebSocket.
        </p>
        <div className="workspace">
          <section className="input-panel" aria-labelledby="job-heading">
            <p className="eyebrow">01 / Start a job</p>
            <h2 id="job-heading">What are you working on?</h2>
            <form onSubmit={startJob}>
              <label htmlFor="prompt">Job prompt</label>
              <textarea
                id="prompt"
                value={progress?.prompt ?? prompt}
                onChange={(event) => setPrompt(event.target.value)}
                disabled={!!jobId || starting}
                rows={5}
                maxLength={280}
                required
              />
              <p className="hint">
                The stages simulate background work. The Workflow, storage, and
                WebSocket connection are real.
              </p>
              {jobId ? (
                <button type="button" onClick={startFresh}>
                  Start a new job <span aria-hidden="true">↗</span>
                </button>
              ) : (
                <button type="submit" disabled={starting || !prompt.trim()}>
                  {starting ? "Starting…" : "Start workflow"}
                  <span aria-hidden="true">↗</span>
                </button>
              )}
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
            </form>
            {jobId && (
              <p className="job-link">
                Job <a href={`?jobId=${encodeURIComponent(jobId)}`}>{jobId}</a>
                <br />
                Open this link in another tab to follow the same job.
              </p>
            )}
          </section>
          <section
            className="progress-panel"
            aria-labelledby="progress-heading"
          >
            <div className="panel-heading">
              <div>
                <p className="eyebrow">02 / Follow along</p>
                <h2 id="progress-heading">Workflow progress</h2>
              </div>
              <span className="badge">{connection}</span>
            </div>
            <p className="status" role="status">
              {message}
            </p>
            {connection === "Disconnected" && (
              <div>
                <p className="error" role="alert">
                  Progress updates disconnected. The workflow may still be
                  running. Reconnect, or check the job link.
                </p>
                <button type="button" onClick={reconnect}>
                  Reconnect
                </button>
              </div>
            )}
            <div className="progress-row">
              <progress
                value={progress?.completedStages ?? 0}
                max={stages.length}
                aria-label="Completed stages"
              />
              <span>{percent}%</span>
            </div>
            <ol className="stages">
              {stages.map((stage, index) => {
                const state = stageState(progress, index);
                return (
                  <li key={stage.id} data-state={state}>
                    <span className="stage-number">
                      {state === "complete" ? "✓" : index + 1}
                    </span>
                    <div>
                      <strong>{stage.name}</strong>
                      <p>{stage.message}</p>
                    </div>
                    <span className="stage-state">{state}</span>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>
        <p className="architecture">
          Browser <span>→</span> Worker <span>→</span> Workflow <span>→</span>{" "}
          Durable Object <span>→</span> WebSocket <span>→</span> Browser
        </p>
      </main>
      <footer>
        Simulated background work. Real background execution and progress
        delivery.
        <br />
        Demo job links are public to anyone who has the URL.
      </footer>
    </div>
  );
}

function stageState(progress: ProgressUpdate | null, index: number) {
  if (!progress) return "waiting";
  if (index < progress.completedStages) return "complete";
  if (index === progress.stageIndex)
    return progress.status === "failed" ? "failed" : "running";
  return "waiting";
}
