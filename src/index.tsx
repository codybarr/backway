/** @jsxImportSource hono/jsx */
import { Hono } from 'hono';
import { z } from 'zod';
import { createSnapshotRecord, getSnapshotDetails, processSnapshot } from './capture';
import { isRateLimited } from './lib/rate-limit';
import { getAsset, getScreenshot, getSnapshotHtml, getSnapshotMetadata, getSnapshotResource } from './lib/storage';
import { normalizeUrl, shouldSkipUrl } from './lib/url';
import type { Env } from './types';
import { LandingPage, ScreenshotPage } from './ui';

const app = new Hono<{ Bindings: Env }>();

const snapshotSchema = z.object({
  url: z.string().min(1),
});

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
  if (!record.deduped) {
    c.executionCtx.waitUntil(processSnapshot(c.env, record.snapshotId, body.data.url));
  }

  return c.json(
    {
      ok: true,
      snapshot: {
        id: record.snapshotId,
        normalizedUrl,
        deduped: record.deduped,
        metadataUrl: `/snapshot/${record.snapshotId}`,
        viewUrl: `/snapshot/${record.snapshotId}/view`,
      },
    },
    record.deduped ? 200 : 202,
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
  const html = await getSnapshotHtml(c.env, snapshotId);
  if (html) {
    c.header('content-type', 'text/html; charset=utf-8');
    return c.body(await html.text());
  }

  const screenshot = await getScreenshot(c.env, snapshotId);
  if (screenshot) {
    return c.html(<ScreenshotPage snapshotId={snapshotId} />);
  }

  return c.json({ error: 'snapshot_not_ready' }, 404);
});

app.get('/snapshot/:id/screenshot', async (c) => {
  const screenshot = await getScreenshot(c.env, c.req.param('id'));
  if (!screenshot) return c.json({ error: 'not_found' }, 404);
  c.header('content-type', 'image/png');
  return c.body(await screenshot.arrayBuffer());
});

app.get('/snapshot/:id/resource/*', async (c) => {
  const prefix = `/snapshot/${c.req.param('id')}/resource`;
  const resourcePath = c.req.path.startsWith(prefix) ? c.req.path.slice(prefix.length) || '/' : '/';
  const object = await getSnapshotResource(c.env, c.req.param('id'), resourcePath);
  if (!object) return c.json({ error: 'not_found' }, 404);

  c.header('content-type', object.httpMetadata?.contentType ?? 'application/octet-stream');
  c.header('cache-control', 'public, immutable, max-age=31536000');
  return c.body(await object.arrayBuffer());
});

app.get('/asset/:hash', async (c) => {
  const object = await getAsset(c.env, c.req.param('hash'));
  if (!object) return c.json({ error: 'not_found' }, 404);

  const contentType = object.httpMetadata?.contentType ?? 'application/octet-stream';
  c.header('content-type', contentType);
  c.header('cache-control', 'public, immutable, max-age=31536000');
  return c.body(await object.arrayBuffer());
});

export default app;
