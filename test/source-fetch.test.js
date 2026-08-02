import assert from "node:assert/strict";
import { setImmediate as waitForImmediate } from "node:timers/promises";
import test from "node:test";
import { fetchAmazonJobs } from "../src/sources/amazon.js";
import {
  eventFromBevyData,
  fetchGdgEvents,
} from "../src/sources/gdg-events.js";
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

test("GDGイベントの公開JSONから接点情報を作る", () => {
  const event = eventFromBevyData(
    {
      id: 123,
      title: "Googler と学ぶ AI ワークショップ",
      url: "https://gdg.community.dev/events/details/test/",
      custom_tickets_url: "https://example.com/register?from=gdg",
      start_date_iso: "2026-08-10T19:00:00+09:00",
      end_date_iso: "2026-08-10T21:00:00+09:00",
      event_timezone: "Asia/Tokyo",
      audience_type: "IN_PERSON",
      venue_name: "Google Japan - Shibuya",
      venue_city: "渋谷区",
      venue_state: "東京都",
      chapter_title: "GDG Tokyo",
      description: "交流と質問の時間があります。",
      tags: ["ワークショップ"],
    },
    { lookaheadDays: 120 },
    new Date("2026-08-02T00:00:00Z"),
  );

  assert.equal(event.key, "gdg:123");
  assert.equal(event.contactLevel, "高");
  assert.equal(event.registrationUrl, "https://example.com/register");

  const ended = eventFromBevyData(
    {
      id: 124,
      title: "終了済みイベント",
      relative_url: "/events/details/ended/",
      start_date: "2026-07-01T10:00:00Z",
      end_date: "2026-07-01T11:00:00Z",
    },
    { lookaheadDays: 120 },
    new Date("2026-08-02T00:00:00Z"),
  );
  assert.equal(ended, null);
});

test("GDGに開催予定がなくても正常終了しページを閉じる", async () => {
  let closed = false;
  const context = {
    async newPage() {
      return {
        async close() {
          closed = true;
        },
        async goto() {},
        locator(selector) {
          return {
            async evaluateAll(callback) {
              return callback([]);
            },
            async innerText() {
              assert.equal(selector, "body");
              return "現時点で予定されているイベントはありません。";
            },
          };
        },
      };
    },
  };
  const result = await fetchGdgEvents(context, {
    events: {
      lookaheadDays: 120,
      chapters: [
        { name: "GDG Tokyo", url: "https://gdg.community.dev/gdg-tokyo/" },
      ],
    },
  });

  assert.equal(closed, true);
  assert.deepEqual(result.events, []);
  assert.match(result.diagnostic, /開催予定0件/);
});
