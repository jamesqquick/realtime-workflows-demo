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

test("browser follows a real job across refresh and a second tab", {
  timeout: 45000,
}, async (t) => {
  const context = await browser.newContext();
  t.after(() => context.close());
  const page = await context.newPage();
  page.setDefaultTimeout(6000);
  const errors = [];
  let posts = 0;
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      new URL(request.url()).pathname === "/api/jobs"
    )
      posts += 1;
  });
  await page.goto(app.origin);
  await page.getByLabel("Job prompt").fill("The browser smoke test");
  await page.getByRole("button", { name: "Start workflow" }).click();
  await page.waitForURL(/\?jobId=/);
  await page.waitForFunction(
    () => document.querySelector("progress")?.value >= 1,
  );
  const jobUrl = page.url();
  const second = await context.newPage();
  await second.goto(jobUrl);
  await page.reload();
  await page
    .getByRole("status")
    .filter({ hasText: "All stages finished" })
    .waitFor({ timeout: 20000 });
  await second
    .getByRole("status")
    .filter({ hasText: "All stages finished" })
    .waitFor({ timeout: 20000 });
  assert.equal(await page.locator("progress").getAttribute("value"), "4");
  assert.deepEqual(
    await page.locator(".stage-state").allTextContents(),
    Array(4).fill("complete"),
  );
  assert.equal(
    await page.getByLabel("Job prompt").inputValue(),
    "The browser smoke test",
  );
  assert.equal(
    posts,
    1,
    "Refreshing and opening a job URL must not create another job",
  );
  await second.reload();
  await second
    .getByRole("status")
    .filter({ hasText: "All stages finished" })
    .waitFor({ timeout: 3000 });
  assert.deepEqual(errors, []);
});

test("browser displays terminal failures and fits a mobile viewport", {
  timeout: 35000,
}, async (t) => {
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
  });
  t.after(() => context.close());
  const page = await context.newPage();
  page.setDefaultTimeout(6000);
  await page.goto(app.origin);
  await page.getByLabel("Simulate a failure at the draft step").check();
  await page.getByRole("button", { name: "Start workflow" }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "failed on purpose" })
    .waitFor({ timeout: 20000 });
  assert.deepEqual(await page.locator(".stage-state").allTextContents(), [
    "complete",
    "complete",
    "failed",
    "waiting",
  ]);
  assert.equal(await page.locator("progress").getAttribute("value"), "2");
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.getByRole("button", { name: "Start a new job" }).click();
  assert.equal(new URL(page.url()).searchParams.has("jobId"), false);
  await page.getByLabel("Job prompt").fill("A fresh topic");
  assert.equal(
    await page.getByRole("button", { name: "Start workflow" }).isEnabled(),
    true,
  );
});

test("browser can retry after job creation fails", {
  timeout: 15000,
}, async (t) => {
  const context = await browser.newContext();
  t.after(() => context.close());
  const page = await context.newPage();
  page.setDefaultTimeout(6000);
  await page.goto(app.origin);
  await page.route("**/api/jobs", (route) =>
    route.fulfill({ status: 503, body: "Service unavailable" }),
  );
  await page.getByRole("button", { name: "Start workflow" }).click();
  await page.getByRole("alert").waitFor();
  assert.equal(
    await page.getByRole("alert").textContent(),
    "Could not start the job.",
  );
  assert.equal(new URL(page.url()).searchParams.has("jobId"), false);
  assert.equal(
    await page.getByRole("button", { name: "Start workflow" }).isEnabled(),
    true,
  );

  await page.unroute("**/api/jobs");
  await page.getByRole("button", { name: "Start workflow" }).click();
  await page.waitForURL(/\?jobId=/);
  assert.equal(await page.getByRole("alert").count(), 0);
});
