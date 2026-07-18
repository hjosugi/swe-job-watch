import {
  canonicalUrl,
  estimateLevel,
  isTargetRole,
  normalizeSpace,
} from "../job-checker.js";

const AMAZON_API = "https://www.amazon.jobs/en/search.json";

function amazonJobId(job) {
  const pathMatch = String(job.job_path || "").match(/\/jobs\/(\d+)/);
  return String(
    pathMatch?.[1] ||
      job.id_icims ||
      job.id ||
      job.job_path ||
      "",
  );
}

export async function fetchAmazonJobs(request, config) {
  const jobs = new Map();
  let apiRows = 0;
  let requests = 0;

  for (const query of config.amazon.queries) {
    for (let offset = 0; ; offset += config.amazon.pageSize) {
      const url = new URL(AMAZON_API);
      url.searchParams.set("base_query", query);
      url.searchParams.append(
        "normalized_country_code[]",
        config.amazon.countryCode,
      );
      url.searchParams.set("result_limit", String(config.amazon.pageSize));
      url.searchParams.set("offset", String(offset));

      const response = await request.get(url.toString(), {
        timeout: 60_000,
      });
      requests += 1;
      if (!response.ok()) {
        throw new Error(
          `Amazon Jobs APIがHTTP ${response.status()}を返しました。`,
        );
      }

      const data = await response.json();
      if (!Array.isArray(data.jobs)) {
        throw new Error("Amazon Jobs APIのレスポンス形式が変わりました。");
      }

      apiRows += data.jobs.length;
      for (const source of data.jobs) {
        const title = normalizeSpace(source.title || "");
        const id = amazonJobId(source);
        const countryCode = source.country_code || "";
        if (
          !id ||
          !title ||
          !["JPN", "JP"].includes(countryCode) ||
          !isTargetRole(title, config.roleFilters)
        ) {
          continue;
        }

        const rawUrl = source.job_path
          ? new URL(source.job_path, "https://www.amazon.jobs").toString()
          : `https://www.amazon.jobs/en/jobs/${id}`;
        jobs.set(`amazon:${id}`, {
          key: `amazon:${id}`,
          company: "amazon",
          companyName: normalizeSpace(
            source.company_name || "Amazon / AWS",
          ),
          title,
          url: canonicalUrl(rawUrl),
          location: normalizeSpace(
            [source.city, "Japan"].filter(Boolean).join(", "),
          ),
          postedDate: normalizeSpace(source.posted_date || ""),
          levelEstimate: estimateLevel("amazon", title),
        });
      }

      if (data.jobs.length < config.amazon.pageSize) {
        break;
      }
    }
  }

  return {
    jobs: [...jobs.values()],
    diagnostic:
      `Amazon: Playwrightのブラウザーコンテキストから公式検索APIを${requests}回確認` +
      `（取得${apiRows}件、SWE ${jobs.size}件）`,
  };
}
