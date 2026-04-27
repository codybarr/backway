# Backway

Minimal Wayback-style snapshot service built for Cloudflare Workers.

## Stack

- Cloudflare Workers
- R2 for snapshot and asset storage
- D1 for snapshot metadata
- Drizzle ORM for schema + queries
- Hono for routing and a small frontend

## Features

- `POST /snapshot` queues a capture
- `GET /snapshot/:id` returns metadata, assets, and capture logs
- `GET /snapshot/:id/view` replays stored HTML or screenshot fallback
- `GET /asset/:hash` serves content-addressed assets from R2
- Fetch-first pipeline with screenshot fallback for thin / JS-heavy pages
- Immutable, content-addressed asset storage

## Routes

- `/` frontend UI
- `POST /snapshot`
- `GET /snapshot/:id`
- `GET /snapshot/:id/view`
- `GET /snapshot/:id/screenshot`
- `GET /asset/:hash`

## Storage layout

- `/snapshots/{id}/index.html`
- `/snapshots/{id}/metadata.json`
- `/snapshots/{id}/screenshot.png`
- `/assets/{hash}`

## Local setup

No app-level `.env` file is required for the normal local workflow. Runtime bindings and config are defined in `wrangler.toml`.

1. Install dependencies:
   - `npm install`
2. Log in to Cloudflare if you have not already:
   - `npx wrangler login`
3. Apply local D1 migrations:
   - `npm run db:migrate:local`
4. Start the dev server:
   - `npm run dev`

## Configuration

`wrangler.toml` defines the required runtime bindings:

- `DB` - D1 database binding
- `SNAPSHOTS` - R2 bucket binding
- `BROWSER` - optional Cloudflare Browser Rendering binding

It also defines the app config values under `[vars]`:

- `MAX_ASSET_SIZE_BYTES`
- `MAX_TOTAL_ASSET_BYTES`
- `MAX_ASSET_COUNT`
- `RESPECT_ROBOTS`
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX_REQUESTS`

No `wrangler secret` values are currently required.

The Drizzle config can read `CLOUDFLARE_D1_DATABASE_ID`, `CLOUDFLARE_ACCOUNT_ID`, and `CLOUDFLARE_API_TOKEN`, but these are only needed if you run Drizzle Kit directly against remote D1. The included migration scripts use Wrangler instead.

## Deploy

Deployments use Wrangler to publish the Worker to Cloudflare.

1. Install dependencies:
   - `npm install`
2. Log in to Cloudflare if you have not already:
   - `npx wrangler login`
3. Make sure the Cloudflare resources in `wrangler.toml` exist:
   - D1 database: `backway`
   - R2 bucket: `backway-snapshots`
   - Optional preview R2 bucket: `backway-snapshots-preview`
   - Optional Browser Rendering binding: `BROWSER`
4. If the D1 database does not exist yet, create it:
   - `npx wrangler d1 create backway`
   - Copy the returned `database_id` into the `[[d1_databases]]` section of `wrangler.toml`.
5. If the R2 bucket does not exist yet, create it:
   - `npx wrangler r2 bucket create backway-snapshots`
6. Optionally create the preview R2 bucket:
   - `npx wrangler r2 bucket create backway-snapshots-preview`
7. Apply remote D1 migrations:
   - `npm run db:migrate:remote`
8. Deploy the Worker:
   - `npm run deploy`

Quick deploy sequence once the Cloudflare resources already exist:

```bash
npm install
npx wrangler login
npm run db:migrate:remote
npm run deploy
```

After deployment, Wrangler prints the deployed Worker URL, for example `https://backway.<your-subdomain>.workers.dev`.

## Notes

- Browser Rendering fallback is optional but wired through `env.BROWSER`
- Assets are limited by type, count, per-file size, and total size
- Auth-like pages are skipped by URL heuristic
- JS replay is not guaranteed; this is intentionally a simple static replay v1
