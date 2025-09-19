# Agent Plan — Tic-Tac-Toe Royale (TTT-99)

This document is the project’s detailed, actionable plan. It defines milestones, tasks, deliverables, guardrails to avoid regressions, CI/CD, deploy/rollback steps, testing strategy, and how we’ll use Amazon Q Developer to accelerate delivery.

Read this alongside the README.md (summary) and use it to drive issues/PRs.

--------------------------------------------------------------------------------

1) Goals, scope, constraints

- MVP scope
  - Single global tournament (“winners queue”).
  - Username entry (unique, alphanumeric, ≤16 chars) persisted in localStorage.
  - 1v1 matches, server-authoritative rules/state.
  - Chess clock per player: base 30s, draw → rematch and base −5s (min 1s), increment +1s when base ≤5s.
  - Disconnect >10s on your move = loss. Flag fall = loss.
  - Anti-cheat by design: intents only, server validates and broadcasts truth.
  - SQLite + Drizzle; Bun + Elysia (WebSocket) on a single EC2 t4g.micro.
  - Frontend: Svelte + Tailwind + daisyUI.
- Non-goals (MVP)
  - Multi-region, autoscaling, and multi-room tournaments.
  - User accounts/OAuth or payments.
- Challenge alignment (Stages)
  - Stage 1: README, public repo, Amazon Q usage, screenshot.
  - Stage 2: Architecture diagram, automated tests (unit/E2E).
  - Stage 3: At least 1 MCP server configured, Amazon Q Developer config, basic IaC/deploy scripts.
  - Stage 4: README updated with cost estimate.
  - Stage 5: Polish and optional extras.

--------------------------------------------------------------------------------

2) Milestones, deliverables, acceptance criteria

Milestone 0 — Bootstrap (Day 1)
- Deliverables
  - Repo scaffold: packages/core, apps/server, apps/web, docs/.
  - Tooling: Bun, TypeScript, Tailwind+PostCSS config, daisyUI, Biome/ESLint, Vitest, Playwright (installed).
  - Drizzle setup for SQLite; drizzle-kit migration baseline.
  - Zod set up for shared schemas.
  - GitHub Actions CI (typecheck, unit tests, build).
- Acceptance criteria
  - `bun install && bun run build` passes in CI.
  - `bun run test` runs at least one passing unit test in core.
  - Prettier/Biome checks pass.

Milestone 1 — Functional core engine
- Deliverables
  - Pure functional engine: board, win detection, clock reducer (chess clock), rematch logic, time decrement, increment rule.
  - Unit tests with full coverage of: wins, draws, flag fall, rematch time progression, increment behavior.
  - Golden “replay” fixtures for engine (recorded moves + timestamps).
- Acceptance criteria
  - 95%+ coverage on core engine files (statements/branches).
  - Replays pass deterministically in CI.

Milestone 2 — Server (WebSocket + matchmaking)
- Deliverables
  - Elysia server with WebSocket endpoint; REST join/status.
  - Session reservation flow (no auth; sessionId issuance).
  - Winners queue, matchmaking, rematch flow.
  - Server-authoritative clocks and validation, heartbeats, rate limits.
  - Drizzle models for players, matches, games (SQLite).
  - Basic admin logs/metrics (stdout structured logs).
- Acceptance criteria
  - Run locally; two browser tabs can play to completion.
  - Illegal moves rejected; state updates broadcast correctly.
  - Unit tests for protocol schema validation; integration test for a single match lifecycle.

Milestone 3 — Frontend UI/UX
- Deliverables
  - Username screen with validation.
  - Lobby/queue view with live updates.
  - Match view: board, legal moves, timers, results, rematch transitions.
  - Minimal spectating list: current matches count and queue size.
  - Mobile-friendly, basic accessibility.
- Acceptance criteria
  - E2E test: two browser contexts complete a match.
  - Screenshot added to README.

Milestone 4 — Deployment (Free Tier)
- Deliverables
  - EC2 t4g.micro setup scripts (cloud-init or manual steps documented).
  - Nginx or Caddy config for HTTPS and WSS reverse proxy.
  - systemd unit for server; log rotation.
  - S3 + CloudFront (or Amplify) steps documented and a deploy script for S3 sync + invalidation.
  - Basic healthcheck endpoint and smoke test script.
- Acceptance criteria
  - App deployed; smoke test OK.
  - README updated with deploy summary and architecture diagram (Mermaid + draw.io file in docs/).

Milestone 5 — Tests and guardrails
- Deliverables
  - Playwright E2E: join → match → end → requeue.
  - Contract tests: zod schemas for WS messages; round-trip validation.
  - Engine replays enforced in CI to prevent regressions.
  - Pre-commit hooks (lint, typecheck, unit tests-fast).
- Acceptance criteria
  - Branch protection: CI required checks (typecheck, unit, e2e-light) before merge.
  - Fail-fast on schema or engine contract changes.

Milestone 6 — Q Developer, MCP, IaC
- Deliverables
  - Amazon Q Developer config and “Prompts used” sections updated.
  - Read-only status endpoint + OpenAPI spec and MCP OpenAPI server config.
  - Lightweight IaC or scripted infra steps (e.g., Ansible or bash + AWS CLI) to qualify for Stage 3.
- Acceptance criteria
  - MCP can query lobby status.
  - Repo contains Q config and prompts list.

Milestone 7 — Cost estimate and polish
- Deliverables
  - README cost section updated with measured metrics.
  - Small UX polish: loading states, toasts, empty states.
- Acceptance criteria
  - Clear cost breakdown assumptions and measurements.

--------------------------------------------------------------------------------

3) Detailed task list (create issues from these)

A. Repository & tooling
- Init monorepo layout (pnpm or bun workspaces).
- Set up Biome/ESLint + Prettier config; CI workflow for lint/typecheck/test.
- Add commit template and PR template (Definition of Done checklist).
- Add CODEOWNERS and branch protection rules.

B. Core engine (functional)
- Define types for Board, GameState, ClockState, Result, Move.
- Implement reducers: initGame, applyMove, checkWinOrDraw, nextBaseTime, computeIncrement.
- Add deterministic time handling and helper to simulate clock ticks in tests.
- Unit tests: wins, draws, increment on low base, flag fall before placing, alternating start on rematch.
- Record “golden” replays fixtures.

C. Protocol and validation
- Define zod schemas for WS messages and server events.
- Contract tests: schema compatibility and change detection (snapshot/semver).

D. Server runtime
- Elysia app: /join (REST), /ws (WS).
- Sessions store; winners queue; matchmaking loop; rematch logic.
- Anti-cheat: rate limit, stale-turn drop, origin check (via proxy + server).
- Heartbeats and disconnect handling.
- Structured logging with request IDs.

E. Persistence (SQLite + Drizzle)
- Drizzle schema: players, connections, matches, games, events.
- Migration baseline + example migration.
- Repository functions behind a small interface (so Postgres can be added later).
- Periodic cleanup job (old sessions).

F. Frontend
- Svelte app scaffold with Tailwind + daisyUI theme.
- Username screen with validation and localStorage.
- Lobby view with live stats and queue/enqueue button.
- Match view with responsive board and visible timers, move animation, result banners.
- WebSocket client with auto-reconnect and backoff.
- Error toasts and connection status indicator.

G. Tests
- Vitest unit tests (core, server helpers).
- Playwright: two-context happy path; illegal move attempt; disconnect timeout.
- Smoke test script (CLI) that drives the server via WS for CI and deploy verification.

H. Deploy & Ops
- EC2 setup doc: AMI selection, security groups, SSH hardening.
- Nginx/Caddy config for HTTPS + WSS; obtain TLS via Let’s Encrypt.
- systemd service unit; logrotate; journal retention.
- Release script: build artifacts → upload → run migrations → restart service → verify health.
- S3/CloudFront deploy script (aws s3 sync + cloudfront invalidation).

I. Docs & diagrams
- Architecture diagram (Mermaid in README, source in docs/diagram.drawio).
- README updates with screenshot, prompts, deploy instructions.
- This agent.md kept in sync with reality (checked in CI with a checklist).

J. MCP & Q Developer
- OpenAPI for read-only status (lobby size, matches list), served at /status.
- MCP OpenAPI server config file.
- Q Developer config and a curated prompts list.

--------------------------------------------------------------------------------

4) Stability guardrails — ensuring no changes break current state

- Contract-first protocol
  - All client-server messages typed and validated with zod.
  - Schema snapshots committed; schema change requires a PR label “protocol-breaking” and version bump.
- Engine determinism
  - Core engine is pure; no direct Date.now() calls in logic. Time is passed in.
  - Replay tests: recorded sequences of moves + timestamps must pass in CI.
- Test gates in CI
  - Required checks: typecheck, unit-core, unit-server, e2e-smoke (headless, short), build.
  - On main: nightly e2e-full suite.
- Migrations safety
  - Drizzle migrations are forward-only; each migration must be idempotent and compatible with running code.
  - Predeploy step runs migrations with “--verify” and takes a pre-migration DB backup (sqlite copy).
- Feature flags (lightweight)
  - Use env vars or config to toggle any experimental behavior (e.g., spectating).
  - Default OFF in production; cannot merge without tests for both paths if applicable.
- Deploy safety
  - Atomic deploy directory structure: /opt/ttt/releases/<git-sha> with current → symlink.
  - Health check before switching symlink; rollback if health fails.
- Branch protection
  - Require PR, code review, and all checks; no direct pushes to main.
- Monitoring & alerts
  - Basic logs with match outcomes and WS errors.
  - Optional: simple uptime ping to health endpoint.

--------------------------------------------------------------------------------

5) CI/CD overview (GitHub Actions)

- Workflows
  - ci.yml: lint/typecheck, unit tests, build, e2e-smoke (Playwright headless).
  - nightly.yml: full e2e tests and coverage report upload.
  - release.yml: on tag, build artifacts, attach to release; optionally trigger deploy via SSH.
- Caching
  - Cache Bun/Node modules and Playwright browsers.
- Artifacts
  - Build outputs for web and server; drizzle migrations; Nginx/systemd sample configs.

--------------------------------------------------------------------------------

6) Deployment plan (EC2 + S3/CloudFront)

Backend (EC2)
- EC2 t4g.micro (Amazon Linux 2023 ARM), security group: 22/tcp, 80/443 via Nginx.
- Install Bun, Git, Caddy/Nginx, SQLite.
- Create non-root user, /opt/ttt directory, and systemd service for the server.
- Proxy: TLS termination and reverse proxy WebSocket at /ws to localhost port.
- Health endpoint /healthz.
- Logs: app logs to stdout → journalctl; Nginx access logs rotated.

Atomic deploy steps
1) Upload tarball to /opt/ttt/releases/<sha>.
2) Install deps; build; run drizzle migrations; run smoke test.
3) Update current symlink; systemctl restart ttt.service.
4) Verify /healthz; rollback if failed.

Frontend (S3/CloudFront)
- Build web; sync to S3 static site bucket.
- CloudFront distribution with OAC; default TTL low (demo).
- Invalidate on deploy.
- Optional: Amplify Hosting for simplicity.

Rollback
- server: switch symlink to previous release; systemctl restart.
- db: restore last pre-migration copy (SQLite backup) if migration caused break.

--------------------------------------------------------------------------------

7) Data model (SQLite via Drizzle) — minimal

- players: username (pk), created_at
- connections: id (pk), username (fk), last_seen_at
- matches: id (pk), player_x, player_o, status, winner, created_at, finished_at, base_time_ms, increment_ms
- games: id (pk), match_id (fk), next_turn, board_9_cells, turn_counter, result, started_at
- events (optional): id, match_id, type, payload_json, ts

Migration rules
- Never drop columns in-place; add new columns nullable with defaults; backfill with scripts.
- Keep a DB backup before each migration in deploy script.

--------------------------------------------------------------------------------

8) Security and anti-cheat (MVP)

- HTTPS/WSS only; HSTS via proxy.
- Origin check in proxy; server also enforces origin header if present.
- Message rate limits and replay protection with turnCounter.
- Server authoritative clocks; client timers are only visual.
- No PII beyond username; no secrets sent over WS after session bind.

--------------------------------------------------------------------------------

9) Testing strategy (what to automate)

- Unit (core)
  - checkWinOrDraw scenarios
  - applyMove: legal, illegal, occupied, stale turn, flag fall behavior
  - time progression + increment on low base
  - rematch base time decrement and first-player alternation
- Unit/Integration (server helpers)
  - matchmaking pairing, winners queue FIFO
  - disconnect handling and elimination outcomes
- Contract tests
  - zod schemas for all messages; keep snapshots
- E2E (Playwright)
  - Two contexts join → match → result → winner re-queues
  - Illegal move ignored and UI reflects server state
  - Disconnect test: one player closes tab on their turn → loss
- Smoke test (CLI)
  - Headless bot vs bot, single match; exit code 0 if success.

--------------------------------------------------------------------------------

10) Amazon Q Developer plan (prompts and usage)

We will use Amazon Q Developer to:
- Scaffold Svelte routes/components and Tailwind layouts.
- Draft Elysia endpoints and WS handlers.
- Generate Zod schemas and DRY types between client/server.
- Author Vitest and Playwright tests for specified scenarios.
- Create Drizzle schema/migrations and seed scripts.
- Draft Nginx/Caddy config and systemd unit file.
- Produce an initial architecture diagram (Mermaid + draw.io file).
- Provide code review suggestions and refactor proposals.

Example prompts (to capture and include in README)
- “Generate a Svelte component for a Tic-Tac-Toe board with 9 cells, controlled by props: cells, myMark, disabled; emit ‘pick(cellIndex)’ on click.”
- “Create Zod schemas for these WS messages: join_queue, move, resign; and these server events: lobby_update, match_found, state_update, result.”
- “Write Vitest for the chess-clock reducer covering: increment when base <= 5s; flag fall during opponent’s move should not flip winner.”
- “Draft Nginx config to reverse proxy WSS at /ws to localhost:8080 with HTTP/2 and HSTS.”
- “Propose Drizzle SQLite schema for matches/games with board as 9-cell array and a migration to add result field.”
- “Create a GitHub Actions workflow that runs bun test, builds apps, and runs a Playwright smoke test.”

We will paste final prompts used into README and keep a cumulative list here.

--------------------------------------------------------------------------------

11) MCP plan (Stage 3)

- Add GET /status with JSON: { playersInQueue, activeMatchesCount, recentWinners[] }.
- Provide OpenAPI spec (docs/openapi.yaml).
- Configure MCP OpenAPI server pointed to that endpoint (docs/mcp/openapi.yaml + instructions).
- Document how to run the MCP server and sample queries.

--------------------------------------------------------------------------------

12) Project management and Definition of Done (DoD)

Definition of Done for a PR
- All CI checks green (typecheck, unit, build; plus e2e-smoke if touching gameplay/net).
- If changing schemas or engine: update schema snapshots/replays and tests.
- Updated README/agent.md if behavior or deploy steps changed.
- No TODOs left in code; meaningful logs; error handling present.

Labels
- area:core, area:server, area:web, area:infra, area:tests, area:docs
- kind:feature, kind:bug, kind:refactor, kind:chore
- protocol-breaking, migration, deploy-needed

--------------------------------------------------------------------------------

13) High-level schedule (tight timeline to Sept 20)

- Day 1: Milestone 0 + start Milestone 1 (engine + tests)
- Day 2: Milestone 2 (server) + basic frontend wiring
- Day 3: Milestone 3 (UI polish) + screenshot; Milestone 4 (deploy scripts)
- Day 4: Milestone 5 (tests/guardrails), Milestone 6 (Q, MCP)
- Day 5: Milestone 7 (costs), buffer and polish

--------------------------------------------------------------------------------

14) Risks and mitigations

- Timing precision on EC2 under load
  - Mitigation: server is authoritative; keep per-tick work minimal; rate limit messages.
- WS drops due to TLS/proxy misconfig
  - Mitigation: tested Nginx/Caddy config; smoke tests; reconnect logic.
- SQLite write contention
  - Mitigation: keep hot paths in-memory; persist snapshots asynchronously; batch writes.
- Username collisions
  - Mitigation: server-side uniqueness check; clear stale sessions.

--------------------------------------------------------------------------------

15) Assets to produce

- docs/diagram.drawio + Mermaid diagram in README.
- docs/screenshots/*.png.
- docs/openapi.yaml (status endpoint).
- docs/mcp/config.json (or equivalent) with instructions.

Keep this file updated as we iterate. Use it as the source of truth for tasks and DoD.
