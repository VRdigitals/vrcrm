# VR Digitals Client Portal

A dashboard where each client logs in and sees only their own Meta Ads lead
performance data (spend, leads, clicks, impressions, cost per lead) —
replacing the daily manual WhatsApp screenshot process.

Pilot tenant: **Excellanz Education** (Meta ad account `2011227639500053`).

## Stack

- Next.js (App Router, TypeScript, Tailwind)
- SQLite via `better-sqlite3` (`data/app.db`, committed to the repo)
- Session auth via `iron-session`, passwords hashed with `bcryptjs`

## Routes

- `/login` — shared login for all clients + the internal team
- `/[client-slug]/dashboard` — a client's own view (summary cards, campaign
  breakdown table, daily cost-per-lead trend). Enforced server-side: a
  session can only ever read the client it belongs to, regardless of the
  slug in the URL.
- `/admin` — internal VR Digitals team view across all clients (not
  reachable by client sessions)

## Local setup

```bash
npm install
cp .env.local.example .env.local   # then fill in SESSION_SECRET
```

`SESSION_SECRET` must be a random string of 32+ characters, e.g.:

```bash
openssl rand -hex 32
```

Seed the pilot tenant and an internal team login:

```bash
EXCELLANZ_PASSWORD="choose-a-password" TEAM_PASSWORD="choose-a-password" npm run seed
```

Run the dev server:

```bash
npm run dev
```

## Data model

- `clients` — `client_slug`, `display_name`, `meta_ad_account_id`
- `users` — `username`, `password_hash` (bcrypt), `role` (`client` | `team`),
  `client_id` (null for team users)
- `daily_data` — one row per `(client, date, campaign)`: spend, leads,
  clicks, impressions, reach, cost_per_lead

See [lib/db.ts](lib/db.ts) for the schema and all data-access functions.
Every read is scoped by `client_id` derived from the session — never from a
client-supplied slug or id.

## Daily data flow

1. A scheduled task pulls the previous day's Meta Ads insights per client
   (via the connected Meta Ads MCP tools)
2. Writes a JSON payload shaped like the example in
   [scripts/upsert-daily-data.ts](scripts/upsert-daily-data.ts) and runs:
   ```bash
   npm run upsert-daily-data -- path/to/data.json
   ```
3. Commits `data/app.db` and pushes to GitHub
4. The site reflects the new data on next load — no manual step, no rebuild

## Adding a new client (tenant)

This is configuration, not code:

1. Add a row via `upsertClient` (slug, display name, ad account id)
2. Add a login via `upsertUser` (bcrypt-hashed password, `role: "client"`,
   linked `client_id`)
3. Add the client to the daily scheduled-pull config

See `scripts/seed.ts` for the pattern.
