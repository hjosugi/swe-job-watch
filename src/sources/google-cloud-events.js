import {
  canonicalUrl,
  classifyEventContact,
  normalizeSpace,
  sortEvents,
} from "../job-checker.js";

const EVENT_CARD_SELECTOR =
  'a[track-type="card"][track-metadata-eventdetail]';
const FILTER_OPTION_SELECTOR =
  'li[role="option"][track-type="checkbox"]';
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function jstDate(year, month, day, hour = 0, minute = 0) {
  const value = new Date(
    Date.UTC(year, month - 1, day, hour - 9, minute),
  );
  const local = new Date(value.valueOf() + JST_OFFSET_MS);
  if (
    local.getUTCFullYear() !== year ||
    local.getUTCMonth() + 1 !== month ||
    local.getUTCDate() !== day ||
    local.getUTCHours() !== hour ||
    local.getUTCMinutes() !== minute
  ) {
    throw new Error("Google Cloudイベントの日時形式が変わりました。");
  }
  return value;
}

function inferYear(month, day, now) {
  const nowInJst = new Date(now.valueOf() + JST_OFFSET_MS);
  const currentYear = nowInJst.getUTCFullYear();
  const currentCandidate = jstDate(currentYear, month, day, 23, 59);
  return currentCandidate >= now ? currentYear : currentYear + 1;
}

export function parseJapaneseDateRange(dateText, now = new Date()) {
  const value = normalizeSpace(dateText).replace(/\s/g, "");
  const fullRange = value.match(
    /^(\d{4})年(\d{1,2})月(\d{1,2})日[～〜~–-](?:(\d{4})年)?(?:(\d{1,2})月)?(\d{1,2})日$/,
  );
  if (fullRange) {
    const startYear = Number(fullRange[1]);
    const startMonth = Number(fullRange[2]);
    const endYear = Number(fullRange[4] || startYear);
    const endMonth = Number(fullRange[5] || startMonth);
    return {
      startAt: jstDate(startYear, startMonth, Number(fullRange[3])),
      endAt: jstDate(endYear, endMonth, Number(fullRange[6]), 23, 59),
    };
  }

  const fullSingle = value.match(
    /^(\d{4})年(\d{1,2})月(\d{1,2})日$/,
  );
  if (fullSingle) {
    const year = Number(fullSingle[1]);
    const month = Number(fullSingle[2]);
    const day = Number(fullSingle[3]);
    return {
      startAt: jstDate(year, month, day),
      endAt: jstDate(year, month, day, 23, 59),
    };
  }

  const shortRange = value.match(
    /^(\d{1,2})月(\d{1,2})日[～〜~–-](?:(\d{1,2})月)?(\d{1,2})日$/,
  );
  if (shortRange) {
    const startMonth = Number(shortRange[1]);
    const startDay = Number(shortRange[2]);
    const endMonth = Number(shortRange[3] || startMonth);
    const endDay = Number(shortRange[4]);
    const startYear = inferYear(startMonth, startDay, now);
    const endYear = endMonth < startMonth ? startYear + 1 : startYear;
    return {
      startAt: jstDate(startYear, startMonth, startDay),
      endAt: jstDate(endYear, endMonth, endDay, 23, 59),
    };
  }

  const shortSingle = value.match(/^(\d{1,2})月(\d{1,2})日$/);
  if (shortSingle) {
    const month = Number(shortSingle[1]);
    const day = Number(shortSingle[2]);
    const year = inferYear(month, day, now);
    return {
      startAt: jstDate(year, month, day),
      endAt: jstDate(year, month, day, 23, 59),
    };
  }

  throw new Error("Google Cloudイベントの日付表示が変わりました。");
}

function detailedDateRange(description) {
  const entries = [];
  const pattern =
    /(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日[^\d]{0,12}(\d{1,2})[:：](\d{2})\s*[-–〜~]\s*(\d{1,2})[:：](\d{2})/g;
  for (const match of description.matchAll(pattern)) {
    entries.push({
      startAt: jstDate(
        Number(match[1]),
        Number(match[2]),
        Number(match[3]),
        Number(match[4]),
        Number(match[5]),
      ),
      endAt: jstDate(
        Number(match[1]),
        Number(match[2]),
        Number(match[3]),
        Number(match[6]),
        Number(match[7]),
      ),
    });
  }
  if (!entries.length) {
    return null;
  }
  return {
    startAt: entries[0].startAt,
    endAt: entries.at(-1).endAt,
  };
}

function eventFormat(body) {
  if (/ハイブリッド|hybrid/i.test(body)) {
    return "ハイブリッド";
  }
  if (/現地|対面|会場|in[- ]person|on[- ]site/i.test(body)) {
    return "現地開催";
  }
  return null;
}

function eventLocation(body, locationTerms) {
  const venue = body.match(
    /(?:^|[・•。])\s*会場\s*[：:]?\s*([^※＜<>]{2,100})/i,
  )?.[1];
  if (venue) {
    return normalizeSpace(venue);
  }
  const matchedTerm = locationTerms.find((term) =>
    body.toLocaleLowerCase("ja-JP").includes(
      term.toLocaleLowerCase("ja-JP"),
    ),
  );
  return matchedTerm
    ? `${matchedTerm}（詳細は公式ページ参照）`
    : "日本（会場は公式ページ参照）";
}

async function waitForFilterState(page, filterName, selected) {
  await page.waitForFunction(
    ({ filterName: expectedName, selected: expectedState }) =>
      [...document.querySelectorAll(
        'li[role="option"][track-type="checkbox"]',
      )].some(
        (element) =>
          element.getAttribute("track-name") === expectedName &&
          element.getAttribute("aria-selected") === expectedState,
      ),
    { filterName, selected: String(selected) },
    { timeout: 20_000 },
  );
}

async function applyExplicitFilter(page, filterName) {
  const filter = page
    .locator(FILTER_OPTION_SELECTOR, { hasText: filterName })
    .first();
  await filter.waitFor({ state: "attached", timeout: 20_000 });

  const selected = (await filter.getAttribute("aria-selected")) === "true";
  const hasExplicitState = Boolean(
    new URL(page.url()).searchParams.get("ser"),
  );
  if (selected && !hasExplicitState) {
    await filter.click({ force: true });
    await waitForFilterState(page, filterName, false);
  }
  if ((await filter.getAttribute("aria-selected")) !== "true") {
    await filter.click({ force: true });
  }
  await waitForFilterState(page, filterName, true);
  await page.waitForFunction(
    () => Boolean(new URL(window.location.href).searchParams.get("ser")),
    null,
    { timeout: 20_000 },
  );

  const filteredUrl = page.url();
  await page.goto(filteredUrl, {
    waitUntil: "networkidle",
    timeout: 60_000,
  });
  const confirmed = page
    .locator(FILTER_OPTION_SELECTOR, { hasText: filterName })
    .first();
  if ((await confirmed.getAttribute("aria-selected")) !== "true") {
    throw new Error(
      `Google Cloudイベントの${filterName}フィルタを固定できません。`,
    );
  }
}

export function eventFromGoogleCloudCard(
  card,
  { lookaheadDays = 120, locationTerms = [] } = {},
  now = new Date(),
) {
  const title = normalizeSpace(card.title || "");
  const description = normalizeSpace(card.description || "");
  const labels = Array.isArray(card.labels)
    ? card.labels.map((label) => normalizeSpace(label))
    : [];
  const body = normalizeSpace(
    [title, description, ...labels].join(" "),
  );

  if (labels.some((label) => /オンデマンド|on[- ]demand/i.test(label))) {
    return null;
  }
  const format = eventFormat(body);
  if (!format) {
    return null;
  }
  if (
    locationTerms.length &&
    !locationTerms.some((term) =>
      body.toLocaleLowerCase("ja-JP").includes(
        term.toLocaleLowerCase("ja-JP"),
      ),
    )
  ) {
    return null;
  }

  const dateRange =
    detailedDateRange(description) ||
    parseJapaneseDateRange(card.dateText, now);
  const latestStart = new Date(now.valueOf() + lookaheadDays * DAY_MS);
  if (dateRange.endAt < now || dateRange.startAt > latestStart) {
    return null;
  }

  if (!title || !card.url) {
    throw new Error(
      "Google Cloudイベントの必須フィールドが不足しています。",
    );
  }
  const url = canonicalUrl(card.url);
  const location = eventLocation(body, locationTerms);
  const contact = classifyEventContact({
    title,
    description,
    venueName: location,
    organizer: "Google Cloud",
    eventType: format,
    tags: labels,
    googleHosted: true,
  });

  return {
    key: `google-cloud:${url}`,
    source: "Google Cloud Events",
    organizer: "Google Cloud",
    title,
    url,
    registrationUrl: url,
    startAt: dateRange.startAt.toISOString(),
    endAt: dateRange.endAt.toISOString(),
    timezone: "Asia/Tokyo",
    location,
    format,
    contactLevel: contact.level,
    contactReasons: contact.reasons,
    contactScore: contact.score,
  };
}

export async function fetchGoogleCloudEvents(
  context,
  config,
  now = new Date(),
) {
  const settings = config.events?.googleCloud;
  const page = await context.newPage();
  try {
    await page.goto(settings.url, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await applyExplicitFilter(page, settings.regionFilter);
    const cards = page.locator(EVENT_CARD_SELECTOR);
    await cards.first().waitFor({ state: "attached", timeout: 20_000 });
    const sources = await cards.evaluateAll((elements) =>
      elements.map((element) => ({
        title:
          element.querySelector(".CilWo")?.textContent || "",
        dateText:
          element.querySelector(".mmPl6c")?.textContent || "",
        description:
          element.querySelector(".Y1Fktf")?.textContent || "",
        labels: [...element.querySelectorAll(".aNvNV")].map(
          (label) => label.textContent || "",
        ),
        url: element.href,
      })),
    );
    if (!sources.length) {
      throw new Error(
        "Google Cloudイベント一覧を確認できません。ページ構造またはアクセス状態を確認してください。",
      );
    }

    const events = sources
      .map((source) =>
        eventFromGoogleCloudCard(source, settings, now),
      )
      .filter(Boolean);
    return {
      events: sortEvents(events),
      diagnostic:
        `Google Cloudイベント: ${settings.regionFilter}フィルタで` +
        `公式一覧${sources.length}件を確認` +
        `（日本の現地・ハイブリッド対象${events.length}件）`,
    };
  } finally {
    await page.close();
  }
}
