/** @jsxImportSource hono/jsx */
import { Hono } from 'hono';
import { z } from 'zod';
import {
  createSnapshotRecord,
  getSnapshotDetails,
  getSnapshotForReplay,
  listPreviousViewableSnapshots,
  processSnapshot,
} from './capture';
import { isRateLimited } from './lib/rate-limit';
import { securityHeaders, setReplaySecurityHeaders } from './lib/security';
import { getAsset, getScreenshot, getSnapshotHtml, getSnapshotMetadata, getSnapshotResource } from './lib/storage';
import { normalizeUrl, shouldSkipUrl } from './lib/url';
import type { Env } from './types';
import { LandingPage, ReplayPage, ScreenshotPage } from './ui';

const app = new Hono<{ Bindings: Env }>();

const snapshotSchema = z.object({
  url: z.string().min(1).max(2048),
});

app.use('*', securityHeaders);

app.get('/', (c) => c.html(<LandingPage />));

app.post('/snapshot', async (c) => {
  if (isRateLimited(c)) {
    return c.json({ error: 'rate_limited' }, 429);
  }

  const body = snapshotSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) {
    return c.json({ error: 'invalid_request', details: body.error.flatten() }, 400);
  }

  let normalizedUrl: string;
  try {
    const normalized = normalizeUrl(body.data.url);
    if (shouldSkipUrl(normalized.url)) {
      return c.json({ error: 'auth_like_pages_are_skipped' }, 400);
    }
    normalizedUrl = normalized.normalized;
  } catch {
    return c.json({ error: 'invalid_url' }, 400);
  }

  const record = await createSnapshotRecord(c.env, body.data.url);
  c.executionCtx.waitUntil(processSnapshot(c.env, record.snapshotId, body.data.url));

  return c.json(
    {
      ok: true,
      snapshot: {
        id: record.snapshotId,
        normalizedUrl,
        metadataUrl: `/snapshot/${record.snapshotId}`,
        viewUrl: `/snapshot/${record.snapshotId}/view`,
      },
    },
    202,
  );
});

app.get('/snapshot/:id', async (c) => {
  const details = await getSnapshotDetails(c.env, c.req.param('id'));
  const metadata = await getSnapshotMetadata(c.env, c.req.param('id'));
  if (!details) return c.json({ error: 'not_found' }, 404);

  return c.json({
    snapshot: details.snapshot,
    metadata,
    assets: details.assets,
    captures: details.captures,
  });
});

app.get('/snapshot/:id/view', async (c) => {
  const snapshotId = c.req.param('id');
  const snapshot = await getSnapshotForReplay(c.env, snapshotId);
  if (!snapshot) return c.json({ error: 'not_found' }, 404);

  const html = await getSnapshotHtml(c.env, snapshotId);
  const screenshot = html ? null : await getScreenshot(c.env, snapshotId);
  if (!html && !screenshot) return c.json({ error: 'snapshot_not_ready' }, 404);

  const previousSnapshots = await listPreviousViewableSnapshots(c.env, snapshot);
  return c.html(<ReplayPage snapshot={snapshot} previousSnapshots={previousSnapshots} />);
});

app.get('/snapshot/:id/content', async (c) => {
  const snapshotId = c.req.param('id');
  const snapshot = await getSnapshotForReplay(c.env, snapshotId);
  if (!snapshot) return c.json({ error: 'not_found' }, 404);

  const html = await getSnapshotHtml(c.env, snapshotId);
  if (html) {
    setReplaySecurityHeaders(c);
    c.header('content-type', 'text/html; charset=utf-8');
    return c.body(await html.text());
  }

  const screenshot = await getScreenshot(c.env, snapshotId);
  if (screenshot) {
    setReplaySecurityHeaders(c);
    return c.html(<ScreenshotPage snapshotId={snapshotId} />);
  }

  return c.json({ error: 'snapshot_not_ready' }, 404);
});

app.get('/snapshot/:id/screenshot', async (c) => {
  const screenshot = await getScreenshot(c.env, c.req.param('id'));
  if (!screenshot) return c.json({ error: 'not_found' }, 404);
  setReplaySecurityHeaders(c);
  c.header('content-type', 'image/png');
  return c.body(await screenshot.arrayBuffer());
});

app.get('/snapshot/:id/resource/*', async (c) => {
  const prefix = `/snapshot/${c.req.param('id')}/resource`;
  const resourcePath = c.req.path.startsWith(prefix) ? c.req.path.slice(prefix.length) || '/' : '/';
  const object = await getSnapshotResource(c.env, c.req.param('id'), resourcePath);
  if (!object) return c.json({ error: 'not_found' }, 404);

  setReplaySecurityHeaders(c);
  c.header('content-type', object.httpMetadata?.contentType ?? 'application/octet-stream');
  c.header('cache-control', 'public, immutable, max-age=31536000');
  return c.body(await object.arrayBuffer());
});

app.get('/asset/:hash', async (c) => {
  const object = await getAsset(c.env, c.req.param('hash'));
  if (!object) return c.json({ error: 'not_found' }, 404);

  const contentType = object.httpMetadata?.contentType ?? 'application/octet-stream';
  setReplaySecurityHeaders(c);
  c.header('content-type', contentType);
  c.header('cache-control', 'public, immutable, max-age=31536000');
  return c.body(await object.arrayBuffer());
});

export default app;
