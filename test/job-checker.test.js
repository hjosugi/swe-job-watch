import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalUrl,
  classifyEventContact,
  diffJobs,
  estimateLevel,
  isTargetRole,
  renderReport,
  selectReportBaseline,
} from "../src/job-checker.js";

const filters = {
  include: [
    "software engineer",
    "software development engineer",
    "software dev engineer",
  ],
  exclude: ["manager", "director"],
};

test("SWEタイトルだけを対象にする", () => {
  assert.equal(isTargetRole("Software Engineer III, Search", filters), true);
  assert.equal(
    isTargetRole("Software Engineering Manager, Maps", filters),
    false,
  );
  assert.equal(isTargetRole("Customer Engineer, Google Cloud", filters), false);
});

test("求人URLからクエリとフラグメントを除く", () => {
  assert.equal(
    canonicalUrl(
      "https://example.com/jobs/123-role?location=Tokyo#description",
    ),
    "https://example.com/jobs/123-role",
  );
});

test("Google L4とAmazon L5の目安を付ける", () => {
  assert.equal(
    estimateLevel("google", "Software Engineer III, Search"),
    "Google L4 目安",
  );
  assert.equal(
    estimateLevel("amazon", "Software Development Engineer II, AWS"),
    "Amazon L5 / Google L4前後 目安",
  );
  assert.equal(
    estimateLevel(
      "amazon",
      "Software Development Engineer, Japan Seller Services Tech",
    ),
    "Amazon L5候補 / Google L4前後 目安",
  );
});

test("前回との差分を求人キーで判定する", () => {
  const previous = [
    { key: "google:1", company: "google", title: "Old role" },
  ];
  const current = [
    { key: "google:2", company: "google", title: "New role" },
  ];
  const result = diffJobs(current, previous);

  assert.deepEqual(result.added.map((job) => job.key), ["google:2"]);
  assert.deepEqual(result.removed.map((job) => job.key), ["google:1"]);
});

test("レポートに直接リンクと差分を出す", () => {
  const current = [
    {
      key: "google:2",
      company: "google",
      companyName: "Google",
      title: "Software Engineer III, Search",
      url: "https://example.com/jobs/2",
      location: "Tokyo, Japan",
      postedDate: "",
      levelEstimate: "Google L4 目安",
    },
  ];
  const report = renderReport({
    checkedAt: "2026-07-18T00:00:00.000Z",
    currentJobs: current,
    previousJobs: [],
    diagnostics: ["test"],
  });

  assert.match(
    report,
    /\[Software Engineer III, Search\]\(https:\/\/example.com\/jobs\/2\) 🆕/,
  );
  assert.match(report, /新着: 1件/);
});

test("イベントの接点期待度を公開情報の根拠から判定する", () => {
  const result = classifyEventContact({
    title: "Googler と学ぶ AI ワークショップ",
    description: "終了後に参加者との交流と質問の時間があります。",
    venueName: "Google Japan - Shibuya",
    organizer: "GDG Tokyo",
    tags: ["Workshop"],
  });

  assert.equal(result.level, "高");
  assert.match(result.reasons.join(" "), /Googler/);
  assert.match(result.reasons.join(" "), /Google拠点/);
  assert.match(result.reasons.join(" "), /交流/);
});

test("レポートにイベントと紹介非保証の注意書きを出す", () => {
  const report = renderReport({
    checkedAt: "2026-08-02T00:00:00.000Z",
    currentJobs: [],
    previousJobs: [],
    currentEvents: [
      {
        key: "gdg:1",
        title: "Googler と学ぶ AI ワークショップ",
        url: "https://gdg.community.dev/events/details/test/",
        registrationUrl: "https://example.com/register",
        startAt: "2026-08-10T10:00:00.000Z",
        timezone: "Asia/Tokyo",
        location: "Google Japan - Shibuya",
        format: "現地開催",
        organizer: "GDG Tokyo",
        contactLevel: "高",
        contactReasons: ["Googlerの参加・登壇が明記"],
      },
    ],
    previousEvents: [],
    diagnostics: ["test"],
  });

  assert.match(report, /Googler・Google技術コミュニティ/);
  assert.match(report, /接点期待度: 高/);
  assert.match(report, /社員紹介を保証するものではありません/);
});

test("同日の再実行では日次baselineを維持する", () => {
  const stored = {
    date: "2026-08-02",
    jobs: [
      { key: "google:old", company: "google", title: "Old role" },
    ],
    events: [{ key: "gdg:old", startAt: "2026-08-10", title: "Old event" }],
  };
  const sameDay = selectReportBaseline(stored, {
    date: "2026-08-02",
    jobs: [{ key: "google:new", company: "google", title: "New role" }],
    events: [],
  });
  assert.equal(sameDay.jobs[0].key, "google:old");
  assert.equal(sameDay.events[0].key, "gdg:old");

  const nextDay = selectReportBaseline(stored, {
    date: "2026-08-03",
    jobs: [{ key: "google:new", company: "google", title: "New role" }],
    events: [],
  });
  assert.equal(nextDay.jobs[0].key, "google:new");
  assert.deepEqual(nextDay.events, []);
});
