# Graph Report - swe-job-watch  (2026-08-02)

## Corpus Check
- 49 files · ~37,329 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 282 nodes · 340 edges · 37 communities (24 shown, 13 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a63df22d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- gdg-events.js
- What You Must Do When Invoked
- What You Must Do When Invoked
- What You Must Do When Invoked
- job-checker.js
- package.json
- 今週のSWE求人・接点イベント（2026-08-02）
- graphify reference: extra exports and benchmark
- graphify reference: extra exports and benchmark
- graphify reference: extra exports and benchmark
- 今週のSWE求人・接点イベント（2026-08-02）
- graphify reference: query, path, explain
- graphify reference: query, path, explain
- graphify reference: query, path, explain
- 今週のSWE求人（2026-07-18）
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- AGENTS.md
- CLAUDE.md
- .claude/CLAUDE.md
- .claude/skills/graphify/references/extraction-spec.md
- .codex/skills/graphify/references/extraction-spec.md
- .copilot/skills/graphify/references/extraction-spec.md
- copilot-instructions.md

## God Nodes (most connected - your core abstractions)
1. `main()` - 13 edges
2. `normalizeSpace()` - 12 edges
3. `What You Must Do When Invoked` - 12 edges
4. `What You Must Do When Invoked` - 12 edges
5. `What You Must Do When Invoked` - 12 edges
6. `renderReport()` - 10 edges
7. `/graphify` - 10 edges
8. `/graphify` - 10 edges
9. `/graphify` - 10 edges
10. `sortEvents()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `fetchAmazonJobs()`  [EXTRACTED]
  src/check-jobs.js → src/sources/amazon.js
- `main()` --calls--> `fetchGdgEvents()`  [EXTRACTED]
  src/check-jobs.js → src/sources/gdg-events.js
- `main()` --calls--> `fetchGoogleJobs()`  [EXTRACTED]
  src/check-jobs.js → src/sources/google.js
- `eventFromBevyData()` --calls--> `classifyEventContact()`  [EXTRACTED]
  src/sources/gdg-events.js → src/job-checker.js
- `fetchGdgEvents()` --calls--> `sortEvents()`  [EXTRACTED]
  src/sources/gdg-events.js → src/job-checker.js

## Import Cycles
- None detected.

## Communities (37 total, 13 thin omitted)

### Community 0 - "gdg-events.js"
Cohesion: 0.20
Nodes (19): canonicalUrl(), createRoleMatcher(), estimateLevel(), normalizeSpace(), amazonJobId(), fetchAmazonJobs(), fetchAmazonQuery(), eventFormat() (+11 more)

### Community 1 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 2 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 3 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 4 - "job-checker.js"
Cohesion: 0.20
Nodes (22): loadConfig(), main(), parseArgs(), rootDir, sourceDir, classifyEventContact(), diffEvents(), diffJobs() (+14 more)

### Community 5 - "package.json"
Cohesion: 0.12
Nodes (15): dependencies, playwright, description, engines, node, name, private, scripts (+7 more)

### Community 6 - "今週のSWE求人・接点イベント（2026-08-02）"
Cohesion: 0.14
Nodes (12): Amazon / AWS（日本）, Google（東京）, Googler・Google技術コミュニティと会えるイベント, サマリー, 今週のSWE求人・接点イベント（2026-08-02）, 前回から掲載終了, 取得メモ, GitHub Actions (+4 more)

### Community 7 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 8 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 9 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 10 - "今週のSWE求人・接点イベント（2026-08-02）"
Cohesion: 0.25
Nodes (7): Amazon / AWS（日本）, Google（東京）, Googler・Google技術コミュニティと会えるイベント, サマリー, 今週のSWE求人・接点イベント（2026-08-02）, 前回から掲載終了, 取得メモ

### Community 11 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 12 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 13 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 14 - "今週のSWE求人（2026-07-18）"
Cohesion: 0.33
Nodes (5): Amazon / AWS（日本）, Google（東京）, サマリー, 今週のSWE求人（2026-07-18）, 取得メモ

### Community 15 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 16 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 17 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 18 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 19 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 20 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 21 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 22 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 23 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

## Knowledge Gaps
- **162 isolated node(s):** `name`, `version`, `private`, `description`, `type` (+157 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `name`, `version`, `private` to the rest of the system?**
  _162 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `What You Must Do When Invoked` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `What You Must Do When Invoked` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `What You Must Do When Invoked` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Should `今週のSWE求人・接点イベント（2026-08-02）` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._