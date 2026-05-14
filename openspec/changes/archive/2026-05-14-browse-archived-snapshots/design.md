## Context

Backway currently stores each snapshot in D1 and R2, then serves replay content directly from `GET /snapshot/:id/view`. Snapshot creation dedupes completed captures by normalized URL, so a later capture request for the same URL can return the existing snapshot instead of creating a new historical point. Because replay responses return captured HTML directly, there is no host-controlled UI around the replay page where archive navigation can live.

This change adds historical navigation for snapshots of the same normalized URL. It needs to touch capture creation, metadata querying, and replay rendering while preserving the existing static replay and screenshot fallback behavior.

## Goals / Non-Goals

**Goals:**
- Create a fresh snapshot record when the home page capture form submits a URL.
- Find other viewable snapshots with the same normalized URL as the current snapshot.
- Render an expandable top overlay above replay content with timestamp links to previous versions.
- Keep the timestamp list simple; no calendar or timeline picker.
- Preserve replay security headers for captured content and existing resource/screenshot routes.

**Non-Goals:**
- Importing external Wayback Machine archives.
- Adding user accounts, private collections, or deletion workflows.
- Adding a calendar UI, diff view, search page, or pagination beyond a small history list.
- Changing the R2 snapshot storage layout.

## Decisions

1. **Always insert a new snapshot for capture requests instead of deduping by completed normalized URL.**
   - Rationale: historical browsing only works if repeated captures create distinct archive points.
   - Alternative considered: keep dedupe and add a separate "force recapture" flag. That preserves old behavior but does not match the home-page requirement that clicking capture creates a new snapshot.

2. **Derive history from the existing `snapshots` table using `normalized_url` and `created_at`.**
   - Rationale: D1 already has the metadata needed for same-URL history, and the table has indexes on both fields.
   - Alternative considered: store a separate history table. That adds migration and consistency overhead without providing value for this simple list.

3. **Wrap replay content in a Backway-controlled page and move raw content to a dedicated route.**
   - Rationale: the current `/snapshot/:id/view` response is captured HTML, leaving nowhere reliable to place an overlay. A wrapper page can render the accordion banner and load replay content in an iframe.
   - Proposed route shape:
     - `GET /snapshot/:id/view`: Backway replay shell with history banner and iframe.
     - `GET /snapshot/:id/content`: raw captured HTML, or screenshot fallback page/content, with replay security headers.
   - Alternative considered: inject banner markup into captured HTML. That is brittle, can conflict with archived page CSS/DOM, and interacts poorly with replay CSP.

4. **List only viewable historical snapshots and exclude the current snapshot from the "previous snapshots" list.**
   - Rationale: links should take the user to usable versions, not queued/failed records. The current timestamp can be shown separately in the banner header if useful, while the expanded list focuses on prior versions.
   - Alternative considered: include all statuses. This may surface dead links or confusing not-ready entries.

5. **Keep the accordion behavior self-contained in the wrapper page.**
   - Rationale: replay content remains sandboxed in an iframe, and the host UI can use a tiny script or semantic `<details>` element without affecting archived content.
   - Alternative considered: client-fetch history JSON from the replay page. Server rendering is simpler and avoids a separate public API unless implementation needs one.

## Risks / Trade-offs

- **Wrapper changes full-page replay behavior** → Use an iframe that fills the viewport below the banner, and keep raw content available through `/snapshot/:id/content` for implementation/testing.
- **Iframe sandbox/CSP may break some archived pages further** → The current service already disables captured JavaScript for safety; preserve that security posture and permit only what static replay needs.
- **History lists may grow for frequently captured URLs** → Query in descending `created_at` order and apply a reasonable limit in implementation, while keeping future pagination out of scope.
- **Removing dedupe increases storage usage** → This is required for historical capture; existing asset size/count/time limits still cap per-snapshot cost.
- **Queued captures redirect to view before content is ready** → Keep existing polling behavior; the view/content route can continue to return `snapshot_not_ready` until capture is complete.
