# SWE Job Watch

Google Careers（東京）と Amazon / AWS Jobs（日本）のSWE求人を毎週確認し、直接リンク付きのレポートをPull Requestにするprivate運用向けツールです。

## 何をするか

- Google: PlaywrightのChromiumでCareersを開き、JavaScript描画後のDOMから求人を取得
- Amazon / AWS: PlaywrightのブラウザーコンテキストからAmazon Jobs公式検索APIを取得
- SWE系タイトルだけを残し、Google L4前後の簡易レベル目安を表示
- 前回の `data/jobs.json` と比較して新着・掲載終了を表示
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

[`weekly-jobs.yml`](./.github/workflows/weekly-jobs.yml) は以下で起動します。

- 定期: 毎週金曜07:00 JST（GitHubのcron指定は木曜22:00 UTC）
- 手動: Actions → Weekly SWE jobs → Run workflow

ワークフローには以下のリポジトリ権限が必要です。

- `contents: write`
- `pull-requests: write`
- Settings → Actions → General → Workflow permissions でPull Request作成を許可

週次PRのブランチ名は `bot/weekly-jobs-YYYY-MM-DD` です。同じ日に再実行すると同じPRを更新します。

## 出力

- [`LATEST.md`](./LATEST.md): 最新レポート
- [`data/jobs.json`](./data/jobs.json): 前回比較用の最新スナップショット
- `reports/YYYY-MM-DD.md`: 日付別レポート

求人サイト側のDOMやAPIが変わった場合はワークフローを失敗させ、空の一覧でスナップショットを上書きしない設計です。レベル表記は求人タイトルからの目安であり、正式な採用レベルや報酬を保証するものではありません。
