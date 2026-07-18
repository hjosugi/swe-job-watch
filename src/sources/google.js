import {
  canonicalUrl,
  createRoleMatcher,
  estimateLevel,
  normalizeSpace,
} from "../job-checker.js";

const GOOGLE_ORIGIN =
  "https://www.google.com/about/careers/applications/";
const JOB_PATH_PATTERN = /\/jobs\/results\/(\d+)-([^/?#]+)/;

function titleFromAnchor(anchor) {
  const ariaLabel = normalizeSpace(anchor.ariaLabel || "");
  if (ariaLabel) {
    return ariaLabel.replace(/^Learn more about\s+/i, "");
  }
  return normalizeSpace(anchor.text || "");
}

async function extractPageJobs(page, config, searchUrl, matchesRole) {
  await page.goto(searchUrl, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  const selector = 'a[href*="jobs/results/"]';
  await page.locator(selector).first().waitFor({
    state: "attached",
    timeout: 20_000,
  });

  const anchors = await page.locator(selector).evaluateAll((elements) =>
    elements.map((element) => ({
      ariaLabel: element.getAttribute("aria-label") || "",
      href: element.href,
      text: element.textContent || "",
    })),
  );

  const candidates = [];
  const pageJobKeys = new Set();
  for (const anchor of anchors) {
    const url = canonicalUrl(anchor.href);
    const match = new URL(url).pathname.match(JOB_PATH_PATTERN);
    const title = titleFromAnchor(anchor);
    if (!match) {
      continue;
    }
    pageJobKeys.add(`google:${match[1]}`);
    if (!title || !matchesRole(title)) {
      continue;
    }

    candidates.push({
      key: `google:${match[1]}`,
      company: "google",
      companyName: "Google",
      title,
      url,
      location: config.google.location,
      postedDate: "",
      levelEstimate: estimateLevel("google", title),
    });
  }

  return {
    anchorCount: anchors.length,
    jobs: candidates,
    pageSignature: [...pageJobKeys].sort().join(","),
  };
}

async function fetchGoogleQuery(
  context,
  config,
  query,
  matchesRole,
) {
  const page = await context.newPage();
  const jobs = [];
  let renderedAnchorCount = 0;
  let pagesVisited = 0;

  try {
    let previousPageSignature = "";

    for (
      let pageNumber = 1;
      pageNumber <= config.google.maxPagesPerQuery;
      pageNumber += 1
    ) {
      const url = new URL("jobs/results/", GOOGLE_ORIGIN);
      url.searchParams.set("location", config.google.location);
      url.searchParams.set("q", query);
      if (pageNumber > 1) {
        url.searchParams.set("page", String(pageNumber));
      }

      const result = await extractPageJobs(
        page,
        config,
        url.toString(),
        matchesRole,
      );
      renderedAnchorCount += result.anchorCount;
      pagesVisited += 1;
      jobs.push(...result.jobs);

      if (
        result.anchorCount === 0 ||
        result.pageSignature === previousPageSignature
      ) {
        break;
      }
      previousPageSignature = result.pageSignature;
    }
  } finally {
    await page.close();
  }

  return { jobs, pagesVisited, renderedAnchorCount };
}

export async function fetchGoogleJobs(context, config) {
  const matchesRole = createRoleMatcher(config.roleFilters);
  const queryResults = await Promise.all(
    config.google.queries.map((query) =>
      fetchGoogleQuery(context, config, query, matchesRole),
    ),
  );
  const jobs = new Map();
  let renderedAnchorCount = 0;
  let pagesVisited = 0;

  for (const result of queryResults) {
    renderedAnchorCount += result.renderedAnchorCount;
    pagesVisited += result.pagesVisited;
    for (const job of result.jobs) {
      jobs.set(job.key, job);
    }
  }

  if (renderedAnchorCount === 0) {
    throw new Error(
      "Google Careersの描画後DOMに求人リンクがありません。ページ構造またはアクセス状態を確認してください。",
    );
  }

  return {
    jobs: [...jobs.values()],
    diagnostic:
      `Google: ChromiumでJavaScript描画後のDOMを${pagesVisited}ページ確認` +
      `（求人リンク${renderedAnchorCount}件、SWE ${jobs.size}件）`,
  };
}
