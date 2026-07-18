import assert from "node:assert/strict";
import { setImmediate as waitForImmediate } from "node:timers/promises";
import test from "node:test";
import { fetchAmazonJobs } from "../src/sources/amazon.js";
import { fetchGoogleJobs } from "../src/sources/google.js";

const roleFilters = {
  include: ["software engineer"],
  exclude: ["manager"],
};

test("Googleの検索語を独立したページで並列に取得する", async () => {
  let openPages = 0;
  let peakOpenPages = 0;
  let nextJobId = 1;

  const context = {
    async newPage() {
      const jobId = nextJobId;
      nextJobId += 1;
      openPages += 1;
      peakOpenPages = Math.max(peakOpenPages, openPages);

      return {
        async close() {
          openPages -= 1;
        },
        async goto() {},
        locator() {
          return {
            async evaluateAll(callback) {
              return callback([
                {
                  getAttribute: () => "",
                  href:
                    `https://www.google.com/about/careers/` +
                    `applications/jobs/results/${jobId}-software-engineer`,
                  textContent: `Software Engineer ${jobId}`,
                },
              ]);
            },
            first() {
              return {
                async waitFor() {},
              };
            },
          };
        },
      };
    },
  };
  const config = {
    google: {
      location: "Tokyo, Japan",
      maxPagesPerQuery: 1,
      queries: ["search", "cloud"],
    },
    roleFilters,
  };

  const result = await fetchGoogleJobs(context, config);

  assert.equal(peakOpenPages, 2);
  assert.equal(openPages, 0);
  assert.deepEqual(
    result.jobs.map((job) => job.key),
    ["google:1", "google:2"],
  );
});

test("Amazonの検索語を並列に取得して重複を除く", async () => {
  let activeRequests = 0;
  let peakActiveRequests = 0;

  const request = {
    async get(url) {
      activeRequests += 1;
      peakActiveRequests = Math.max(
        peakActiveRequests,
        activeRequests,
      );
      await waitForImmediate();
      activeRequests -= 1;

      const query = new URL(url).searchParams.get("base_query");
      return {
        async json() {
          return {
            jobs: [
              {
                country_code: "JPN",
                id: query === "SDE" ? "2" : "1",
                job_path:
                  query === "SDE"
                    ? "/en/jobs/2/software-engineer"
                    : "/en/jobs/1/software-engineer",
                title: "Software Engineer",
              },
            ],
          };
        },
        ok() {
          return true;
        },
      };
    },
  };
  const config = {
    amazon: {
      countryCode: "JPN",
      pageSize: 100,
      queries: ["software engineer", "software", "SDE"],
    },
    roleFilters,
  };

  const result = await fetchAmazonJobs(request, config);

  assert.equal(peakActiveRequests, 3);
  assert.deepEqual(
    result.jobs.map((job) => job.key),
    ["amazon:1", "amazon:2"],
  );
});
