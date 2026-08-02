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

function textFromHtml(value = "") {
  return normalizeSpace(
    String(value)
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;|&#160;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'"),
  );
}

export function classifyEventContact({
  title = "",
  description = "",
  venueName = "",
  venueAddress = "",
  organizer = "",
  eventType = "",
  tags = [],
} = {}) {
  const body = textFromHtml(
    [
      title,
      description,
      venueName,
      venueAddress,
      organizer,
      eventType,
      ...tags,
    ].join(" "),
  );
  const reasons = [];
  let score = 0;

  if (/\bgooglers?\b|google社員|グーグル社員/i.test(body)) {
    reasons.push("Googlerの参加・登壇が明記");
    score += 4;
  }
  if (/\bgoogle(?: japan)?\b|グーグル/i.test(venueName)) {
    reasons.push("Google拠点で現地開催");
    score += 3;
  }
  if (/交流|懇親|意見交換|質問|networking|office hours?/i.test(body)) {
    reasons.push("交流・質問機会が明記");
    score += 2;
  }
  if (/\bgde\b|google developer expert|developer advocate/i.test(body)) {
    reasons.push("Google技術コミュニティの専門家が明記");
    score += 2;
  }
  if (/ハンズオン|ワークショップ|ハッカソン|hands-on|workshop|hackathon/i.test(body)) {
    reasons.push("会話しやすい双方向形式");
    score += 1;
  }
  if (/\bgdg\b|google developer groups?/i.test(organizer)) {
    reasons.push("GDGコミュニティ主催");
    score += 1;
  }

  return {
    level: score >= 6 ? "高" : score >= 3 ? "中" : "参考",
    reasons,
    score,
  };
}

export function sortEvents(events) {
  return [...events].sort((left, right) => {
    const dateOrder = String(left.startAt).localeCompare(String(right.startAt));
    return dateOrder || left.title.localeCompare(right.title, "ja");
  });
}

export function diffEvents(currentEvents, previousEvents) {
  const previous = new Set(previousEvents.map((event) => event.key));
  return {
    added: sortEvents(
      currentEvents.filter((event) => !previous.has(event.key)),
    ),
  };
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

function formatEventDate(event) {
  const timezone = event.timezone || "Asia/Tokyo";
  const date = new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(event.startAt));
  return `${date} (${timezone})`;
}

function renderEvent(event, addedKeys) {
  const marker = addedKeys.has(event.key) ? " 🆕" : "";
  const registrationUrl = event.registrationUrl || event.url;
  const details = [
    formatEventDate(event),
    event.location,
    event.format,
  ].filter(Boolean);
  const reasons = event.contactReasons?.length
    ? event.contactReasons.join(" / ")
    : "公開情報から接点の根拠を確認してください";
  const officialDetails =
    event.url && event.url !== registrationUrl
      ? ` / [公式詳細](${event.url})`
      : "";

  return [
    `- [${event.title}](${registrationUrl})${marker}`,
    details.length ? `  - ${details.join(" / ")}` : "",
    `  - 接点期待度: ${event.contactLevel} — ${reasons}`,
    `  - 主催: ${event.organizer}${officialDetails}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function renderReport({
  checkedAt,
  currentJobs,
  previousJobs,
  currentEvents = [],
  previousEvents = [],
  diagnostics,
}) {
  const { added, removed } = diffJobs(currentJobs, previousJobs);
  const { added: addedEvents } = diffEvents(
    currentEvents,
    previousEvents,
  );
  const addedKeys = new Set(added.map((job) => job.key));
  const addedEventKeys = new Set(addedEvents.map((event) => event.key));
  const google = sortJobs(
    currentJobs.filter((job) => job.company === "google"),
  );
  const amazon = sortJobs(
    currentJobs.filter((job) => job.company === "amazon"),
  );
  const date = checkedAt.slice(0, 10);

  const lines = [
    `# 今週のSWE求人・接点イベント（${date}）`,
    "",
    "対象: Google 東京、Amazon / AWS 日本のSWE求人と、Googler・Google技術コミュニティとの接点が期待できる公開イベント。",
    "",
    "## サマリー",
    "",
    `- Google: ${google.length}件`,
    `- Amazon / AWS: ${amazon.length}件`,
    `- 新着: ${added.length}件`,
    `- 掲載終了: ${removed.length}件`,
    `- 接点イベント: ${currentEvents.length}件（新着 ${addedEvents.length}件）`,
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
    "## Googler・Google技術コミュニティと会えるイベント",
    "",
    currentEvents.length
      ? sortEvents(currentEvents)
          .map((event) => renderEvent(event, addedEventKeys))
          .join("\n")
      : "- 現在、条件に合う開催予定はありません",
    "",
    "> 接点期待度は公開ページにある登壇者属性、会場、交流時間、開催形式から判定した目安です。参加や社員紹介を保証するものではありません。",
    "",
  );

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

export async function loadPreviousEvents(statePath) {
  try {
    const body = await fs.readFile(statePath, "utf8");
    const parsed = JSON.parse(body);
    return Array.isArray(parsed.events) ? parsed.events : [];
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export function selectReportBaseline(
  stored,
  { date, jobs = [], events = [] },
) {
  if (
    stored?.date === date &&
    Array.isArray(stored.jobs) &&
    Array.isArray(stored.events)
  ) {
    return {
      date,
      jobs: sortJobs(stored.jobs),
      events: sortEvents(stored.events),
    };
  }
  return {
    date,
    jobs: sortJobs(jobs),
    events: sortEvents(events),
  };
}

export async function loadReportBaseline(
  statePath,
  fallback,
) {
  try {
    const body = await fs.readFile(statePath, "utf8");
    return selectReportBaseline(JSON.parse(body), fallback);
  } catch (error) {
    if (error.code === "ENOENT") {
      return selectReportBaseline(null, fallback);
    }
    throw error;
  }
}

export async function writeResults({
  rootDir,
  checkedAt,
  jobs,
  events = [],
  reportBaseline,
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
    fs.writeFile(
      path.join(dataDir, "events.json"),
      `${JSON.stringify(
        { checkedAt, events: sortEvents(events) },
        null,
        2,
      )}\n`,
      "utf8",
    ),
    fs.writeFile(
      path.join(dataDir, "report-baseline.json"),
      `${JSON.stringify(reportBaseline, null, 2)}\n`,
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
