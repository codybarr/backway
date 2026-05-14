## 1. Snapshot Creation Behavior

- [x] 1.1 Update `createSnapshotRecord` in `src/capture.ts` to always insert a fresh snapshot record for a normalized URL instead of returning an existing completed snapshot.
- [x] 1.2 Update the `POST /snapshot` response in `src/index.tsx` so new captures consistently return the newly created snapshot id, metadata URL, and view URL.
- [x] 1.3 Remove or adjust any `deduped` response handling in the home-page client script so polling starts for every newly submitted capture.

## 2. Snapshot History Querying

- [x] 2.1 Add a typed helper in `src/capture.ts` to fetch a snapshot by id with its normalized URL and creation timestamp.
- [x] 2.2 Add a typed helper in `src/capture.ts` to list previous viewable snapshots with the same normalized URL, ordered by newest first and excluding the current snapshot.
- [x] 2.3 Limit history results to a reasonable count to avoid oversized replay banners for heavily captured URLs.

## 3. Replay Routing

- [x] 3.1 Change `GET /snapshot/:id/view` in `src/index.tsx` to render a Backway-controlled replay shell with history data and an iframe for archived content.
- [x] 3.2 Add `GET /snapshot/:id/content` in `src/index.tsx` to serve the stored HTML with replay security headers.
- [x] 3.3 Make the content route render the screenshot fallback when stored HTML is unavailable but a screenshot exists.
- [x] 3.4 Preserve the existing not-ready and not-found behavior for snapshots whose replay content is unavailable.

## 4. Replay UI

- [x] 4.1 Add a `ReplayPage` component in `src/ui.tsx` that renders the top accordion-style history banner and iframe.
- [x] 4.2 Display the current snapshot timestamp or URL context in the banner header.
- [x] 4.3 Render previous snapshot timestamps as links to `/snapshot/<id>/view`.
- [x] 4.4 Render a clear empty state when no previous timestamps are available.
- [x] 4.5 Ensure the replay iframe fills the available viewport and the banner remains usable on narrow screens.

## 5. Verification

- [x] 5.1 Add or update tests if the project has an established test harness for routes or capture helpers.
- [x] 5.2 Run TypeScript checking/build commands to verify route, UI, and helper changes compile.
- [x] 5.3 Manually verify repeated captures for the same URL create distinct snapshot ids.
- [x] 5.4 Manually verify the replay banner expands, collapses, lists previous timestamps, and links to older versions.
