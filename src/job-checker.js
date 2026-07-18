import fs from "node:fs/promises";
import path from "node:path";

export function normalizeSpace(value = "") {
  return value.replace(/\s+/g, " ").trim();
}

export function canonicalUrl(rawUrl) {
  const url = new URL(rawUrl);
  url.search = "";
  url.hash = "";
  return url.toString();
}

export function createRoleMatcher(roleFilters) {
  const includeTerms = roleFilters.include.map((term) =>
    normalizeSpace(term).toLocaleLowerCase("en-US"),
  );
  const excludeTerms = roleFilters.exclude.map((term) =>
    normalizeSpace(term).toLocaleLowerCase("en-US"),
  );

  return (title) => {
    const normalized = normalizeSpace(title).toLocaleLowerCase("en-US");
    return (
      includeTerms.some((term) => normalized.includes(term)) &&
      !excludeTerms.some((term) => normalized.includes(term))
    );
  };
}

export function isTargetRole(title, roleFilters) {
  return createRoleMatcher(roleFilters)(title);
}

export function estimateLevel(company, title) {
  const value = normalizeSpace(title).toLocaleLowerCase("en-US");

  if (company === "google") {
    if (/\bstaff software engineer\b/.test(value)) {
      return "Google L6+ 目安";
    }
    if (/\bsenior software engineer\b/.test(value)) {
      return "Google L5 目安";
    }
    if (/\bsoftware engineer iii\b/.test(value)) {
      return "Google L4 目安";
    }
    if (/\bsoftware engineer ii\b/.test(value)) {
      return "Google L3 目安";
    }
    return "レベル要確認";
  }

  if (/\b(senior|sr\.?)\b/.test(value)) {
    return "Amazon L6 / Google L5前後 目安";
  }
  if (/\b(sde|software development engineer)\s*(ii|2)\b/.test(value)) {
    return "Amazon L5 / Google L4前後 目安";
  }
  if (
    /\bsoftware (development|dev) engineer\b/.test(value) ||
    /\bsde\b/.test(value)
  ) {
    return "Amazon L5候補 / Google L4前後 目安";
  }
  return "レベル要確認";
}

export function sortJobs(jobs) {
  return [...jobs].sort((left, right) => {
    const companyOrder = left.company.localeCompare(right.company);
    return companyOrder || left.title.localeCompare(right.title, "en");
  });
}

export function diffJobs(currentJobs, previousJobs) {
  const current = new Map(currentJobs.map((job) => [job.key, job]));
  const previous = new Map(previousJobs.map((job) => [job.key, job]));

  return {
    added: sortJobs(
      currentJobs.filter((job) => !previous.has(job.key)),
    ),
    removed: sortJobs(
      previousJobs.filter((job) => !current.has(job.key)),
    ),
  };
}

function renderJob(job, addedKeys) {
  const marker = addedKeys.has(job.key) ? " 🆕" : "";
  const details = [
    job.levelEstimate,
    job.location,
    job.postedDate ? `掲載 ${job.postedDate}` : "",
    job.companyName && job.companyName !== job.company
      ? job.companyName
      : "",
  ].filter(Boolean);

  return [
    `- [${job.title}](${job.url})${marker}`,
    details.length ? `  - ${details.join(" / ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function renderReport({
  checkedAt,
  currentJobs,
  previousJobs,
  diagnostics,
}) {
  const { added, removed } = diffJobs(currentJobs, previousJobs);
  const addedKeys = new Set(added.map((job) => job.key));
  const google = sortJobs(
    currentJobs.filter((job) => job.company === "google"),
  );
  const amazon = sortJobs(
    currentJobs.filter((job) => job.company === "amazon"),
  );
  const date = checkedAt.slice(0, 10);

  const lines = [
    `# 今週のSWE求人（${date}）`,
    "",
    "対象: Google 東京、および Amazon / AWS 日本。求人タイトルからSWE系職種に絞り込んでいます。",
    "",
    "## サマリー",
    "",
    `- Google: ${google.length}件`,
    `- Amazon / AWS: ${amazon.length}件`,
    `- 新着: ${added.length}件`,
    `- 掲載終了: ${removed.length}件`,
    "",
    "## Google（東京）",
    "",
    google.length
      ? google.map((job) => renderJob(job, addedKeys)).join("\n")
      : "- 該当求人なし",
    "",
    "## Amazon / AWS（日本）",
    "",
    amazon.length
      ? amazon.map((job) => renderJob(job, addedKeys)).join("\n")
      : "- 該当求人なし",
    "",
  ];

  if (removed.length) {
    lines.push(
      "## 前回から掲載終了",
      "",
      ...removed.map((job) => `- [${job.title}](${job.url})`),
      "",
    );
  }

  lines.push(
    "## 取得メモ",
    "",
    ...diagnostics.map((item) => `- ${item}`),
    "",
    `_自動確認: ${checkedAt}_`,
    "",
  );

  return lines.join("\n");
}

export async function loadPreviousJobs(statePath) {
  try {
    const body = await fs.readFile(statePath, "utf8");
    const parsed = JSON.parse(body);
    return Array.isArray(parsed.jobs) ? parsed.jobs : [];
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export async function writeResults({
  rootDir,
  checkedAt,
  jobs,
  report,
}) {
  const date = checkedAt.slice(0, 10);
  const dataDir = path.join(rootDir, "data");
  const reportDir = path.join(rootDir, "reports");

  await Promise.all([
    fs.mkdir(dataDir, { recursive: true }),
    fs.mkdir(reportDir, { recursive: true }),
  ]);

  const state = {
    checkedAt,
    jobs: sortJobs(jobs),
  };

  await Promise.all([
    fs.writeFile(
      path.join(dataDir, "jobs.json"),
      `${JSON.stringify(state, null, 2)}\n`,
      "utf8",
    ),
    fs.writeFile(path.join(rootDir, "LATEST.md"), report, "utf8"),
    fs.writeFile(
      path.join(reportDir, `${date}.md`),
      report,
      "utf8",
    ),
  ]);
}
