import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalUrl,
  diffJobs,
  estimateLevel,
  isTargetRole,
  renderReport,
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
