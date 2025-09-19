# Architecture — Tic-Tac-Toe Royale (TTT-99)

This document maps each component to its AWS home and shows how traffic flows through the system. It reflects the MVP deployment optimized for AWS Free Tier while remaining provider-agnostic at the app layer.

Note: Mermaid labels avoid parentheses to prevent rendering issues.

## Deployment view (AWS mapping)

```mermaid
flowchart TB
  user[Player Browser\nSvelte App]:::client

  subgraph dns[Route 53 - optional]
    r53[R53: app.example.com\napi.example.com]
  end

  subgraph cdn[CloudFront]
    cf[CloudFront Distribution]
    acm[ACM Certificate\nfor app.example.com]
  end

  subgraph s3[S3 - Static Site]
    s3b[S3 Bucket\nStatic Assets]
  end

  subgraph vpc[VPC - EC2]
    subgraph ec2grp[t4g.micro\nAmazon Linux 2023 ARM]
      nginx[Nginx or Caddy\nTLS and Reverse Proxy]
      app[Bun and Elysia App\nWebSocket and REST]
      sqlite[(SQLite Database\non EBS Volume)]
    end
  end

  subgraph logs[Logging and Monitoring]
    cw[CloudWatch Agent - optional\nSystem logs and metrics]
  end

  classDef client fill:#eef,stroke:#557;
  classDef aws fill:#f7f7f7,stroke:#999;

  %% DNS
  user -- "HTTPS GET app" --> r53
  r53 -- "CNAME" --> cf
  r53 -- "A or AAAA" --> nginx

  %% Static site path
  cf -- "Cache and Serve Static" --> s3b
  s3b:::aws
  cf:::aws
  acm:::aws
  r53:::aws

  %% App and API path
  user -- "WSS /ws and HTTPS /join\napi.example.com" --> nginx
  nginx -- "Proxy WSS and HTTP" --> app
  app -- "Queries and Migrations" --> sqlite

  %% Certificates
  acm -. "TLS for CloudFront app" .- cf
  nginx -. "Let's Encrypt TLS for api" .- user

  %% Logs
  ec2grp --> cw

  %% Legend grouping
  class s3b,cf,acm,r53,cw aws
```

Key
- app.example.com → CloudFront → S3 static frontend
- api.example.com → EC2 (Nginx or Caddy TLS termination → Bun and Elysia app)
- SQLite resides on the EC2 instance EBS volume. Drizzle runs migrations on deploy.

Free Tier notes
- EC2 t4g.micro: 750 hours per month in Free Tier for first 12 months. Use ARM build of Bun.
- CloudFront and S3: generous Free Tier for small static sites.
- Route 53 is optional; you can use the EC2 public hostname to avoid DNS cost.
- TLS: ACM for CloudFront, and Let’s Encrypt on EC2 via Nginx or Caddy.

## Runtime data flow (sequence)

```mermaid
sequenceDiagram
  autonumber
  participant B as Browser - Svelte
  participant CF as CloudFront
  participant S3 as S3 Static
  participant NG as Nginx or Caddy on EC2
  participant SV as Elysia App - Bun
  participant DB as SQLite

  Note over B: User opens app.example.com
  B->>CF: HTTPS GET root
  CF->>S3: Fetch static assets
  S3-->>CF: 200 HTML CSS JS
  CF-->>B: 200 cached

  Note over B: User enters username
  B->>NG: HTTPS POST /join at api.example.com
  NG->>SV: Proxy request
  SV->>DB: Reserve and validate username via Drizzle
  DB-->>SV: OK or conflict
  SV-->>NG: 200 with sessionId
  NG-->>B: 200

  Note over B: Real time gameplay
  B->>NG: WSS /ws with sessionId
  NG->>SV: WS upgrade proxy
  SV-->>B: lobby_update and match_found

  loop Match lifecycle
    B->>SV: move with cell and turnCounter
    SV->>SV: Validate and tick clocks server authoritative
    SV->>DB: Persist snapshot or event async
    SV-->>B: state_update or result
  end

  alt Disconnect or Timeout
    B--XSV: Connection lost
    SV->>SV: Apply timeout rules if on move
    SV-->>B: result when reconnected
  end
```

## Components and placement

- Frontend (Svelte, Tailwind, daisyUI)
  - Built locally; deployed to S3; served via CloudFront with ACM managed TLS.
  - Talks to api.example.com for REST /join and WSS /ws.

- Reverse proxy (Nginx or Caddy) on EC2
  - Terminates TLS with Let’s Encrypt auto renew.
  - Proxies HTTPS and WSS to the Bun and Elysia app on localhost.
  - Enforces origin and payload limits and adds HSTS.

- Application server (Bun and Elysia)
  - WebSocket endpoint for real time gameplay; REST for username and session join plus read only status.
  - Server authoritative engine with pure functional core manages clocks, state, and outcomes.
  - In memory matchmaking; persists snapshots to SQLite via Drizzle.

- Database (SQLite)
  - Lives on EC2 EBS volume. Low write rate; simple and fast.
  - Drizzle migrations run on deploy; pre migration backup taken.

- Optional monitoring
  - CloudWatch Agent to ship system and app logs.
  - Nginx access and error logs rotated on instance.

## Networking and security

- Security Group for EC2
  - Inbound: 80 tcp for ACME, 443 tcp for HTTPS and WSS, 22 tcp for SSH or prefer SSM.
  - Outbound: allow updates and ACME.

- Certificates
  - CloudFront: ACM certificate for app.example.com.
  - EC2: Let’s Encrypt certificate for api.example.com via Nginx or Caddy.

- Domains optional
  - Route 53 hosted zone or any DNS provider
    - app.example.com points to CloudFront distribution
    - api.example.com points to EC2 public IP or Elastic IP

## Why this layout

- Clear separation of static and dynamic paths.
- WSS performance and simplicity by talking directly to EC2 for the API.
- Minimal moving parts for MVP, aligned to Free Tier.
- Easy to evolve:
  - Swap SQLite to Postgres later via Amazon RDS.
  - Add an ALB and Auto Scaling Group if you need more capacity.
  - Put the API behind CloudFront later if you want a single domain.

## Future proofing

- Keep app state server authoritative to prevent cheating.
- Abstract persistence via repositories so DB changes do not touch gameplay logic.
- Record engine replays to aid debugging and prevent regressions.
