# Tic-Tac-Toe Royale (TTT-99)

Fast, skill-based, online Tic-Tac-Toe with chess clocks and a winners-queue “royale.” Players match 1v1, losers are eliminated, and winners hop back into the lobby to face the next challenger until a single champion remains.

This project is built for an AWS developer challenge and actively uses Amazon Q Developer throughout its lifecycle.

## Why this and what problem it addresses

- Make real-time multiplayer approachable: show that you can build a low-latency, fair, online game with a tiny footprint and a clean functional core.
- Demonstrate a practical path to ship quickly, then scale: start with SQLite + a single server, keep the door open for Postgres and multi-node later.
- Highlight AI-assisted development: use Amazon Q Developer for scaffolding, test generation, code review, and infra guidance—turning an idea into a working demo fast.

## How it’s built (high-level)

- Frontend: Svelte + TailwindCSS + daisyUI + TypeScript
- Backend: Bun + Elysia (WebSockets) with a functional, deterministic game engine
- Persistence: SQLite (via Drizzle), with a clean adapter to swap to Postgres later
- Deployment (Free Tier-friendly):
  - Backend on a single EC2 t4g.micro (Amazon Linux 2023 ARM), reverse-proxied via Nginx/Caddy with TLS
  - Frontend on S3 static hosting + CloudFront (or Amplify Hosting)
- Design principles:
  - Functional core: pure reducers for rules, clocks, and outcomes; side effects are thin adapters
  - Server authoritative state: clients send intents; server validates, updates, and broadcasts
  - Minimal data model: players, connections, matches, games, events (audit)
  - Simple, single global tournament to keep MVP focused

A Mermaid/diagram file will be included under docs/ (added after initial commit). See agent.md for the full architecture details and tasks.

## Game rules (summary)

- Start: As soon as at least two players are present, the server matches them 1v1.
- Identity: Players enter a unique alphanumeric username (1–16 chars). Stored in localStorage. No auth.
- Time control (chess clock, per player):
  - Base time starts at 30s per player.
  - If a game is a draw, players immediately rematch; base time reduces by 5s each rematch, down to a 1s minimum.
  - When base time is 5s or less, an increment of +1s is added to the mover after each legal move.
  - Flag fall (clock hits 0) = loss.
- Turn order: Random in the first game, alternates each rematch.
- Draws: No cap. Rematch until someone wins (time pressure ensures mistakes).
- Elimination and lobby:
  - Loser is eliminated from the tournament.
  - Winner goes back to the winners lobby to face the next winner.
  - If there’s an odd player out, they wait for the next winner.
- Disconnects/timeouts: If you disconnect for more than 10 seconds during your move, you lose.
- Victory: The tournament ends when only one player remains.

## Fairness and anti-cheat (summary)

- WSS only with TLS; server validates all moves and owns clocks and results.
- Clients cannot set board, time, or outcomes; they only send “intent to move.”
- Replay/drop protection and rate limiting per connection.
- Heartbeats to detect disconnects; server applies timeout rules.
- Minimal personally identifiable data—usernames only.

## Data and privacy

- Data collected: username (alphanumeric, up to 16 chars) and connection/session metadata.
- Storage: SQLite by default; audit logs for match events may be recorded for debugging.
- No passwords or emails. Usernames are checked for global uniqueness for the active tournament.

## Local run (summary)

- Prerequisites: Bun, Git, a recent Node-compatible environment, and SQLite.
- Steps:
  - Clone the repository.
  - Install dependencies.
  - Start the backend server (Elysia + WebSockets).
  - Start the frontend dev server.
  - Open the app in the browser, enter a username, and play.
- See agent.md for exact commands, environment variables, and troubleshooting.

## Deploy (summary)

- Backend:
  - Provision a t4g.micro EC2 (Amazon Linux 2023 ARM).
  - Install Bun and the app; run the server as a systemd service.
  - Put Nginx/Caddy in front for HTTPS and to reverse-proxy WSS to the app.
- Frontend:
  - Build a static bundle and upload to S3.
  - Serve via CloudFront (or Amplify Hosting for simplicity).
- DNS (optional): Point a domain or subdomain to CloudFront and your EC2.
- Logs/Monitoring: CloudWatch agent or Nginx access logs; basic app metrics.
- Detailed, step-by-step instructions are in agent.md.

## MCP and extensibility

- We will expose a read-only HTTP status endpoint for matches/lobby.
- An MCP OpenAPI server configuration will allow tools to query live status (read-only) for the challenge requirement.
- Optional next step: “P2P experimental mode” demo (WebRTC) for learning and comparison.

## Cost estimate (AWS Free Tier)

- EC2 t4g.micro: Free Tier covers 750 hours/month for the first 12 months. Within free tier, backend compute is effectively $0.
- S3 + CloudFront: Free Tier covers modest storage and transfer; a small static site typically remains at $0.
- Elastic IP and data transfer out: negligible for a demo; keep within Free Tier by limiting external bandwidth.
- Out of Free Tier: a t4g.micro on-demand is typically a few USD/month; overall footprint remains low.

This section will be updated with a more precise estimate once the first deploy is measured.

## Roadmap (high-level)

- Stage 1 (Demo-ready):
  - Core engine, matchmaking, clocks, draws/rematch, winners lobby
  - Minimal UI: queue, match view with clocks, results
  - README with screenshot(s) and “Prompts used”
- Stage 2:
  - Architecture diagram
  - Unit + E2E tests
  - Basic spectating (list of active matches)
- Stage 3:
  - MCP OpenAPI server configuration
  - Q Developer config in repo
  - Basic IaC or deployment scripts
- Stage 4:
  - Update README with cost estimate and optimization notes
  - Optional Postgres-ready migration plan
- Stage 5 (nice-to-have):
  - Scalable matchmaking, multiple rooms, leaderboards
  - Cosmetics: sound effects, themes, mobile polish

## Screenshots

- Add at least one screenshot of the game running locally (queue + in-match UI).
- Place images in a docs/ directory and reference them in this README.

## License

- MIT
