# SWE Job Watch

[![CI](https://github.com/hjosugi/swe-job-watch/actions/workflows/ci.yml/badge.svg)](https://github.com/hjosugi/swe-job-watch/actions/workflows/ci.yml)
[![Weekly SWE jobs](https://github.com/hjosugi/swe-job-watch/actions/workflows/weekly-jobs.yml/badge.svg)](https://github.com/hjosugi/swe-job-watch/actions/workflows/weekly-jobs.yml)

Google Careers（東京）と Amazon / AWS Jobs（日本）のSWE求人、およびGoogler・Google技術コミュニティとの接点が期待できる公開イベントを毎週確認し、直接リンク付きのレポートをPull Requestにするツールです。

## 何をするか

- Google: PlaywrightのChromiumでCareersを開き、JavaScript描画後のDOMから求人を取得
- Googleでは通常のSoftware Engineerに加え、SRE / Forward Deployed Engineer / Developer Relations Engineer / Strategic Cloud Engineerもコード寄りの応募候補として確認
- Amazon / AWS: PlaywrightのブラウザーコンテキストからAmazon Jobs公式検索APIを取得
- 対象タイトルだけを残し、Google L4前後の簡易レベル目安を表示
- 前回の `data/jobs.json` と比較して新着・掲載終了を表示
- GDG Tokyo・GDG on Campus IPUT Tokyoの公式ページから今後120日以内のイベントを確認
- Google Cloud公式イベント一覧で日本フィルタを明示し、現地・ハイブリッド開催を確認
- Googler明記、Google会場、交流時間、双方向形式などを根拠に「接点期待度」を表示
- `LATEST.md` と日付別の `reports/YYYY-MM-DD.md` を生成
- 毎週金曜07:00 JSTにGitHub Actionsを実行し、週次PRを作成

## ローカル実行

Node.js 22以上が必要です。

```bash
npm ci
npx playwright install chromium
npm run jobs:check
```

保存せず確認だけする場合:

```bash
npm run jobs:dry-run
```

ブラウザーを表示して確認する場合:

```bash
node src/check-jobs.js --dry-run --headed
```

検索条件やタイトルのinclude / excludeは
[`job-search.config.json`](./job-search.config.json) で変更できます。

## GitHub Actions

[`ci.yml`](./.github/workflows/ci.yml) はmainへのpushとPull Requestでlintとテストを実行します。

[`weekly-jobs.yml`](./.github/workflows/weekly-jobs.yml) は以下で起動します。

- 定期: 毎週金曜07:00 JST（GitHubのcron指定は木曜22:00 UTC）
- 手動: Actions → Weekly SWE jobs → Run workflow

ワークフローには以下のリポジトリ権限が必要です。

- `contents: write`
- `pull-requests: write`
- Settings → Actions → General → Workflow permissions でPull Request作成を許可

週次PRは固定ブランチ `bot/weekly-jobs` を再利用します。PRを未マージのまま次週を迎えた場合も同じPRを更新するため、日付ごとのbotブランチや週次PRが増え続けません。

[`branch-hygiene.yml`](./.github/workflows/branch-hygiene.yml) は `main` 更新時に、open PRがない旧 `bot/weekly-jobs-*` ブランチと、PRがmerge済みの `agent/*` ブランチを削除します。

## 出力

- [`LATEST.md`](./LATEST.md): 最新レポート
- [`data/jobs.json`](./data/jobs.json): 前回比較用の最新スナップショット
- [`data/events.json`](./data/events.json): 開催予定イベントの最新スナップショット
- [`data/report-baseline.json`](./data/report-baseline.json): 同日再実行でも差分を保持する日次基準
- `reports/YYYY-MM-DD.md`: 日付別レポート

求人・イベントサイト側のDOMやAPIが変わった場合はワークフローを失敗させ、壊れたスナップショットを公開しない設計です。レベル表記は求人タイトルからの目安であり、正式な採用レベルや報酬を保証するものではありません。SRE / Forward Deployed Engineer / Developer Relations Engineer / Strategic Cloud Engineerは通常のSWEと職務内容や面接ループが異なる場合があるため、応募前に各求人の要件を確認してください。

イベントの「接点期待度」は公開ページにある登壇者属性、会場、交流時間、開催形式から判定します。GDGは独立したコミュニティであり、Google社そのものではありません。イベント参加や社員紹介を保証せず、参加者名簿などの個人情報も収集しません。情報源は[GDG Tokyo公式ページ](https://gdg.community.dev/gdg-tokyo/)、[GDG on Campus IPUT Tokyo公式ページ](https://gdg.community.dev/gdg-on-campus-international-professional-university-of-technology-tokyo-japan/)、[Google Cloud公式イベント一覧](https://cloud.google.com/events?hl=ja)、[Google Developer Groupsの説明](https://developers.google.com/community/gdg/)です。
