import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { chromium } from "playwright";
import { startApp } from "./helpers.mjs";

let app;
let browser;
before(async () => {
  app = await startApp();
  browser = await chromium.launch();
});
after(async () => {
  await browser?.close();
  await app?.stop();
});

test("starter submits the form and allows retrying an unimplemented job", async (t) => {
  const page = await browser.newPage();
  t.after(() => page.close());
  page.setDefaultTimeout(6000);
  await page.goto(app.origin);
  await page.getByLabel("Job prompt").fill("A starter job");
  const request = page.waitForRequest(
    (request) =>
      request.method() === "POST" &&
      new URL(request.url()).pathname === "/api/jobs",
  );
  await page.getByRole("button", { name: "Start workflow" }).click();
  assert.deepEqual((await request).postDataJSON(), { prompt: "A starter job" });
  await page.getByRole("alert").waitFor();
  assert.equal(
    await page.getByRole("alert").textContent(),
    "Could not start the job.",
  );
  assert.equal(await page.locator("progress").getAttribute("value"), "0");
  assert.equal(new URL(page.url()).searchParams.has("jobId"), false);
  assert.equal(
    await page.getByRole("button", { name: "Start workflow" }).isEnabled(),
    true,
  );
});

test("starter manages job links, history, and reconnects without new jobs", async (t) => {
  const page = await browser.newPage();
  t.after(() => page.close());
  page.setDefaultTimeout(6000);
  const jobId = "81a3f43b-74a6-41fc-acd0-bd6be0da20cf";
  const sockets = [];
  const errors = [];
  let posts = 0;
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/jobs", (route) => {
    posts += 1;
    return route.fulfill({
      status: 202,
      contentType: "application/json",
      body: JSON.stringify({ jobId }),
    });
  });
  await page.routeWebSocket(/\/api\/progress\?/, (socket) => {
    assert.equal(new URL(socket.url()).searchParams.get("jobId"), jobId);
    sockets.push(socket);
  });

  await page.goto(app.origin);
  await page.getByRole("button", { name: "Start workflow" }).click();
  await page.waitForURL(`**/?jobId=${jobId}`);
  await page.getByText("Live", { exact: true }).waitFor();
  assert.equal(await page.locator("progress").getAttribute("value"), "0");
  assert.equal(await page.getByRole("link", { name: jobId }).count(), 1);
  assert.equal(await page.getByLabel("Job prompt").count(), 0);

  await page.reload();
  await page.getByText("Live", { exact: true }).waitFor();
  const beforeReconnect = sockets.length;
  sockets.at(-1).close({ code: 1011, reason: "Test disconnect" });
  await page.getByText("Disconnected", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Reconnect" }).click();
  await page.getByText("Live", { exact: true }).waitFor();
  assert.ok(sockets.length > beforeReconnect);

  await page.getByRole("button", { name: "Start a new job" }).click();
  assert.equal(new URL(page.url()).searchParams.has("jobId"), false);
  await page.getByText("Ready", { exact: true }).waitFor();
  await page.getByLabel("Job prompt").fill("Another job");
  await page.goBack();
  await page.waitForURL(`**/?jobId=${jobId}`);
  await page.getByText("Live", { exact: true }).waitFor();
  await page.goForward();
  await page.getByText("Ready", { exact: true }).waitFor();

  assert.equal(posts, 1, "Only submitting the form creates a job");
  assert.deepEqual(errors, []);
});

test("starter follows a shared job link on mobile without submitting the form", async (t) => {
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
  });
  t.after(() => context.close());
  const page = await context.newPage();
  page.setDefaultTimeout(6000);
  const jobId = "26243a74-5d02-42da-8cd6-e25caa49fb58";
  let posts = 0;
  page.on("request", (request) => {
    if (request.method() === "POST") posts += 1;
  });
  await page.routeWebSocket(/\/api\/progress\?/, () => {});
  await page.goto(`${app.origin}/?jobId=${jobId}`);
  await page.getByText("Live", { exact: true }).waitFor();
  assert.equal(await page.getByRole("link", { name: jobId }).count(), 1);
  assert.equal(await page.getByLabel("Job prompt").count(), 0);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  assert.equal(posts, 0);
});
