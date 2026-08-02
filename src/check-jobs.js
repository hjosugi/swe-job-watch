#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import {
  loadPreviousEvents,
  loadPreviousJobs,
  loadReportBaseline,
  renderReport,
  sortEvents,
  sortJobs,
  writeResults,
} from "./job-checker.js";
import { fetchAmazonJobs } from "./sources/amazon.js";
import { fetchGdgEvents } from "./sources/gdg-events.js";
import { fetchGoogleCloudEvents } from "./sources/google-cloud-events.js";
import { fetchGoogleJobs } from "./sources/google.js";

const sourceDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(sourceDir, "..");

function parseArgs(argv) {
  return {
    dryRun: argv.includes("--dry-run"),
    headed: argv.includes("--headed"),
  };
}

async function loadConfig() {
  const body = await fs.readFile(
    path.join(rootDir, "job-search.config.json"),
    "utf8",
  );
  return JSON.parse(body);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const config = await loadConfig();
  const browser = await chromium.launch({ headless: !options.headed });
  const context = await browser.newContext({
    locale: "en-US",
    timezoneId: "Asia/Tokyo",
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
  });

  await context.route("**/*", async (route) => {
    const resourceType = route.request().resourceType();
    if (["font", "image", "media", "stylesheet"].includes(resourceType)) {
      await route.abort();
      return;
    }
    await route.continue();
  });

  try {
    const fetches = [];

    if (config.google.enabled) {
      fetches.push(fetchGoogleJobs(context, config));
    }
    if (config.amazon.enabled) {
      fetches.push(fetchAmazonJobs(context.request, config));
    }
    if (config.events?.enabled) {
      fetches.push(fetchGdgEvents(context, config));
      if (config.events.googleCloud?.enabled) {
        fetches.push(fetchGoogleCloudEvents(context, config));
      }
    }
    const results = await Promise.all(fetches);

    const jobs = sortJobs(
      results.flatMap((result) => result.jobs || []),
    );
    const events = sortEvents(
      results.flatMap((result) => result.events || []),
    );
    const checkedAt = new Date().toISOString();
    const [latestJobs, latestEvents] = await Promise.all(
      [
        loadPreviousJobs(path.join(rootDir, "data", "jobs.json")),
        loadPreviousEvents(path.join(rootDir, "data", "events.json")),
      ],
    );
    const reportBaseline = await loadReportBaseline(
      path.join(rootDir, "data", "report-baseline.json"),
      {
        date: checkedAt.slice(0, 10),
        jobs: latestJobs,
        events: latestEvents,
      },
    );
    const report = renderReport({
      checkedAt,
      currentJobs: jobs,
      previousJobs: reportBaseline.jobs,
      currentEvents: events,
      previousEvents: reportBaseline.events,
      diagnostics: results.map((result) => result.diagnostic),
    });

    process.stdout.write(report);
    if (!options.dryRun) {
      await writeResults({
        rootDir,
        checkedAt,
        jobs,
        events,
        reportBaseline,
        report,
      });
      process.stderr.write(
        "[job-watch] data/jobs.json, data/events.json, data/report-baseline.json, LATEST.md, reports/YYYY-MM-DD.md を更新しました。\n",
      );
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  process.stderr.write(`[job-watch] ${error.stack || error.message}\n`);
  process.exitCode = 1;
});
