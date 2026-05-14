## Why

Backway can capture and replay a snapshot, but users have no way to discover older captures for the same URL from the replay experience. Historical browsing is core to a Wayback-style service, so users should be able to see prior snapshot timestamps and jump directly to an archived version.

## What Changes

- When a user enters a URL on the home page and clicks "Capture snapshot", create a new snapshot record instead of reusing an existing completed snapshot for that URL.
- Add a history lookup for snapshots matching the normalized URL of a viewed snapshot.
- Add a top banner overlay to snapshot replay pages that can expand/collapse like an accordion.
- Display previous snapshot timestamps in a simple list, without a calendar UI.
- Make each timestamp a link to that snapshot's replay URL.
- Preserve existing snapshot metadata, asset serving, screenshot fallback, and replay security behavior.

## Capabilities

### New Capabilities
- `snapshot-history-navigation`: Users can discover previous archived snapshot timestamps for the same normalized URL and navigate to those versions from a snapshot replay page.

### Modified Capabilities

## Impact

- Affected code: snapshot creation/deduplication in `src/capture.ts`, routes in `src/index.tsx`, replay UI rendering in `src/ui.tsx`, and likely database queries using the existing `snapshots` table.
- APIs: may add an internal metadata/history route or server-rendered replay wrapper; existing `POST /snapshot`, `GET /snapshot/:id`, and `GET /snapshot/:id/view` behavior will be updated only as needed.
- Storage: no new R2 storage layout is required; history can be derived from D1 snapshot metadata.
- Dependencies: no new external dependency is expected.
