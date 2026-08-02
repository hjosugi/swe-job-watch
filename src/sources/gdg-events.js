import {
  canonicalUrl,
  classifyEventContact,
  normalizeSpace,
  sortEvents,
} from "../job-checker.js";

const UPCOMING_EVENT_SELECTOR =
  '[data-testid^="data-block-for-upcomingEvents"] a[href*="/events/details/"]';
const GDG_ORIGIN = "https://gdg.community.dev";

function gdgUrl(value) {
  return canonicalUrl(new URL(value, GDG_ORIGIN).toString());
}

function formatLocation(source) {
  return normalizeSpace(
    [
      source.venue_name,
      source.venue_city,
      source.venue_state,
    ]
      .filter(Boolean)
      .join(", "),
  );
}

function eventFormat(source) {
  if (source.audience_type === "HYBRID") {
    return "ハイブリッド";
  }
  if (source.is_virtual_event) {
    return "オンライン";
  }
  return "現地開催";
}

export function eventFromBevyData(
  source,
  { lookaheadDays = 120 } = {},
  now = new Date(),
) {
  const startAt = new Date(source.start_date_iso || source.start_date);
  const endAt = new Date(
    source.end_date_iso ||
      source.end_date ||
      source.start_date_iso ||
      source.start_date,
  );
  if (Number.isNaN(startAt.valueOf()) || Number.isNaN(endAt.valueOf())) {
    throw new Error("GDGイベントの日時形式が変わりました。");
  }

  const latestStart = new Date(
    now.valueOf() + lookaheadDays * 24 * 60 * 60 * 1000,
  );
  if (endAt < now || startAt > latestStart) {
    return null;
  }

  const title = normalizeSpace(source.title || "");
  const url = gdgUrl(
    source.url || source.cohost_registration_url || source.relative_url,
  );
  if (!source.id || !title || !url) {
    throw new Error("GDGイベントの必須フィールドが不足しています。");
  }

  const organizer = normalizeSpace(source.chapter_title || "GDG");
  const contact = classifyEventContact({
    title,
    description: source.description || source.description_short || "",
    venueName: source.venue_name || "",
    venueAddress: source.venue_address || "",
    organizer,
    eventType: source.event_type_title || "",
    tags: Array.isArray(source.tags) ? source.tags : [],
  });

  return {
    key: `gdg:${source.id}`,
    source: "Google Developer Groups",
    organizer,
    title,
    url,
    registrationUrl: source.custom_tickets_url
      ? gdgUrl(source.custom_tickets_url)
      : url,
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    timezone: source.event_timezone || "Asia/Tokyo",
    location: formatLocation(source) || "オンライン",
    format: eventFormat(source),
    contactLevel: contact.level,
    contactReasons: contact.reasons,
    contactScore: contact.score,
  };
}

async function fetchChapterEventUrls(context, chapter) {
  const page = await context.newPage();
  try {
    await page.goto(chapter.url, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    const urls = await page.locator(UPCOMING_EVENT_SELECTOR).evaluateAll(
      (elements) => [...new Set(elements.map((element) => element.href))],
    );
    if (urls.length) {
      return urls;
    }

    const body = normalizeSpace(await page.locator("body").innerText());
    if (
      !/予定されているイベントはありません|今後のイベントはありません|no upcoming events/i.test(
        body,
      )
    ) {
      throw new Error(
        `${chapter.name}の今後のイベント欄を確認できません。ページ構造またはアクセス状態を確認してください。`,
      );
    }
    return [];
  } finally {
    await page.close();
  }
}

async function fetchEventData(context, url) {
  const page = await context.newPage();
  try {
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    const body = await page.locator("#__NEXT_DATA__").textContent({
      timeout: 20_000,
    });
    const nextData = JSON.parse(body);
    const eventData =
      nextData?.props?.pageProps?.customBlockData?.eventData;
    if (!eventData) {
      throw new Error("GDGイベントの公開JSON形式が変わりました。");
    }
    return eventData;
  } finally {
    await page.close();
  }
}

export async function fetchGdgEvents(
  context,
  config,
  now = new Date(),
) {
  const chapters = config.events?.chapters || [];
  const chapterResults = await Promise.all(
    chapters.map((chapter) => fetchChapterEventUrls(context, chapter)),
  );
  const urls = [
    ...new Set(chapterResults.flat()),
  ];
  const sources = await Promise.all(
    urls.map((url) => fetchEventData(context, url)),
  );
  const events = sources
    .map((source) => eventFromBevyData(source, config.events, now))
    .filter(Boolean);

  return {
    events: sortEvents(events),
    diagnostic:
      `GDGイベント: ${chapters.length}チャプターを確認` +
      `（開催予定${urls.length}件、対象期間${events.length}件）`,
  };
}
