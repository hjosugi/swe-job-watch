import assert from "node:assert/strict";
import { setImmediate as waitForImmediate } from "node:timers/promises";
import test from "node:test";
import { fetchAmazonJobs } from "../src/sources/amazon.js";
import {
  eventFromBevyData,
  fetchGdgEvents,
} from "../src/sources/gdg-events.js";
import {
  eventFromGoogleCloudCard,
  fetchGoogleCloudEvents,
  parseJapaneseDateRange,
} from "../src/sources/google-cloud-events.js";
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

test("Google Cloud公式カードから日本の接点イベントを作る", () => {
  const event = eventFromGoogleCloudCard(
    {
      title: "Build with Gemini Tokyo",
      dateText: "9月3日～4日",
      description:
        "Build with Gemini Tokyo は 2 日間のハンズオンイベントです。" +
        "Day 1：2026 年 9 月 3 日（木）13:00 - 19:30（予定） " +
        "Day 2：2026 年 9 月 4 日（金）13:00 - 19:00（予定） " +
        "ハイブリッド開催（現地会場参加 / オンラインリモート参加） " +
        "・会場 TAKANAWA GATEWAY Convention Center " +
        "※ Google Cloud 担当者によるサポートは現地会場のみです。",
      labels: ["オンライン", "1日 6時間"],
      url:
        "https://cloudonair.withgoogle.com/events/" +
        "build-with-gemini26q3?utm_source=test",
    },
    {
      lookaheadDays: 120,
      locationTerms: ["Tokyo", "東京", "Japan", "日本"],
    },
    new Date("2026-08-02T00:00:00Z"),
  );

  assert.equal(
    event.key,
    "google-cloud:https://cloudonair.withgoogle.com/events/" +
      "build-with-gemini26q3",
  );
  assert.equal(event.startAt, "2026-09-03T04:00:00.000Z");
  assert.equal(event.endAt, "2026-09-04T10:00:00.000Z");
  assert.equal(event.format, "ハイブリッド");
  assert.equal(event.location, "TAKANAWA GATEWAY Convention Center");
  assert.equal(event.contactLevel, "高");
  assert.match(event.contactReasons.join(" "), /Google担当者/);

  const onlineOnly = eventFromGoogleCloudCard(
    {
      title: "Tokyo Cloud Webinar",
      dateText: "9月10日",
      description: "オンラインで開催します。",
      labels: ["オンライン"],
      url: "https://cloudonair.withgoogle.com/events/webinar",
    },
    {
      lookaheadDays: 120,
      locationTerms: ["Tokyo"],
    },
    new Date("2026-08-02T00:00:00Z"),
  );
  assert.equal(onlineOnly, null);
});

test("Google Cloudの日付表示を年またぎも含めて解釈する", () => {
  const sameYear = parseJapaneseDateRange(
    "9月3日～4日",
    new Date("2026-08-02T00:00:00Z"),
  );
  assert.equal(sameYear.startAt.toISOString(), "2026-09-02T15:00:00.000Z");
  assert.equal(sameYear.endAt.toISOString(), "2026-09-04T14:59:00.000Z");

  const nextYear = parseJapaneseDateRange(
    "1月8日",
    new Date("2026-12-20T00:00:00Z"),
  );
  assert.equal(nextYear.startAt.toISOString(), "2027-01-07T15:00:00.000Z");
});

test("Google Cloud一覧はオンデマンドを除外してページを閉じる", async () => {
  let closed = false;
  const context = {
    async newPage() {
      return {
        async close() {
          closed = true;
        },
        async goto() {},
        locator() {
          return {
            first() {
              return { async waitFor() {} };
            },
            async evaluateAll() {
              return [
                {
                  title: "Build with Gemini Tokyo",
                  dateText: "9月3日～4日",
                  description:
                    "2026 年 9 月 3 日（木）13:00 - 19:30（予定） " +
                    "ハイブリッド開催、Google Cloud 担当者がサポート。",
                  labels: ["オンライン"],
                  url: "https://cloudonair.withgoogle.com/events/build",
                },
                {
                  title: "過去セッション",
                  dateText: "",
                  description: "",
                  labels: ["オンデマンド", "オンライン"],
                  url: "https://cloudonair.withgoogle.com/events/archive",
                },
              ];
            },
          };
        },
      };
    },
  };
  const result = await fetchGoogleCloudEvents(
    context,
    {
      events: {
        googleCloud: {
          enabled: true,
          url: "https://cloud.google.com/events?hl=ja",
          lookaheadDays: 120,
          locationTerms: ["Tokyo"],
        },
      },
    },
    new Date("2026-08-02T00:00:00Z"),
  );

  assert.equal(closed, true);
  assert.equal(result.events.length, 1);
  assert.match(result.diagnostic, /公式一覧2件/);
});
