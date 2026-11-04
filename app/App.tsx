import { useState } from "react";
import { stages } from "../src/progress";

export function App() {
  const [prompt, setPrompt] = useState(
    "How to send real-time updates from a background job",
  );
  const [message, setMessage] = useState(
    "Ready to connect. Implement the job endpoint to start tracking.",
  );

  return (
    <div className="shell">
      <header className="site-header">
        <a className="wordmark" href="/">
          Workflow Lab
        </a>
        <span className="badge">Starter</span>
      </header>
      <main>
        <p className="eyebrow">Cloudflare Workflows + Durable Objects</p>
        <h1>
          Give your background jobs
          <br />a little foreground.
        </h1>
        <p className="intro">
          Follow a job from its first step to its last. You’ll build the
          connection that brings its progress to this page.
        </p>
        <div className="workspace">
          <section className="input-panel" aria-labelledby="job-heading">
            <p className="eyebrow">01 / Start a job</p>
            <h2 id="job-heading">What are you working on?</h2>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setMessage(
                  "The interface is ready. Connect this form to a job endpoint to start tracking progress.",
                );
              }}
            >
              <label htmlFor="prompt">Blog post topic</label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                rows={5}
                maxLength={280}
                required
              />
              <p className="hint">
                Research, outline, draft, review. Choose your own stages and
                messages.
              </p>
              <button type="submit">
                Start workflow <span aria-hidden="true">↗</span>
              </button>
            </form>
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
              <span className="badge">Not connected</span>
            </div>
            <p className="status" role="status">
              {message}
            </p>
            <div className="progress-row">
              <progress
                value={0}
                max={stages.length}
                aria-label="Completed stages"
              />
              <span>0%</span>
            </div>
            <ol className="stages">
              {stages.map((stage, index) => (
                <li key={stage.id} data-state="waiting">
                  <span className="stage-number">{index + 1}</span>
                  <div>
                    <strong>{stage.name}</strong>
                    <p>{stage.message}</p>
                  </div>
                  <span className="stage-state">Waiting</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
        <p className="architecture">
          Browser <span>→</span> Worker <span>→</span> Workflow <span>→</span>{" "}
          Durable Object <span>→</span> WebSocket <span>→</span> Browser
        </p>
      </main>
      <footer>
        Starter interface. Job creation and progress tracking are not connected.
      </footer>
    </div>
  );
}
