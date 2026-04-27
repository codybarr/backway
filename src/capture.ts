import { and, desc, eq } from 'drizzle-orm';
import { getDb } from './db/client';
import { assets, captures, snapshots } from './db/schema';
import {
  extractAssetReferences,
  extractAssetUrls,
  extractCssAssetReferences,
  rewriteCssWithAssets,
  rewriteHtmlWithAssets,
  shouldFallbackToScreenshot,
} from './lib/html';
import { sha256 } from './lib/hash';
import { getConfig } from './lib/config';
import { getContentType, isAllowedAssetContentType } from './lib/http';
import { createId } from './lib/id';
import { isRobotsAllowed } from './lib/robots';
import { putAsset, putScreenshot, putSnapshotHtml, putSnapshotMetadata, putSnapshotResource } from './lib/storage';
import { normalizeUrl, shouldSkipUrl } from './lib/url';
import type { Env, SnapshotMetadata, SnapshotStatus, StoredAsset } from './types';

async function updateSnapshotStatus(env: Env, snapshotId: string, status: SnapshotStatus) {
  const db = getDb(env);
  await db.update(snapshots).set({ status }).where(eq(snapshots.id, snapshotId));
}

async function createCapture(env: Env, snapshotId: string, method: string, status: string, error?: string) {
  const db = getDb(env);
  await db.insert(captures).values({ id: createId('cap'), snapshotId, method, status, error });
}

async function buildMetadata(
  env: Env,
  snapshotId: string,
  base: Omit<SnapshotMetadata, 'assetCount' | 'totalAssetBytes'>,
  storedAssets: StoredAsset[],
) {
  const metadata: SnapshotMetadata = {
    ...base,
    assetCount: storedAssets.length,
    totalAssetBytes: storedAssets.reduce((sum, asset) => sum + asset.size, 0),
  };
  await putSnapshotMetadata(env, snapshotId, metadata);
  return metadata;
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    headers: {
      accept: 'text/html,application/xhtml+xml',
      'user-agent': 'BackwayBot/0.1 (+https://backway.local)',
    },
    redirect: 'follow',
  });

  const contentType = getContentType(response);
  if (!response.ok) throw new Error(`origin returned ${response.status}`);
  if (!contentType?.includes('html')) throw new Error(`unsupported content-type ${contentType ?? 'unknown'}`);

  const html = await response.text();
  return { html, finalUrl: response.url };
}

async function fetchAsset(url: string, maxAssetSizeBytes: number, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort('asset fetch timed out'), timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        accept: '*/*',
        'user-agent': 'Mozilla/5.0 (compatible; BackwayBot/0.1; +https://backway.local)',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) throw new Error(`asset returned ${response.status}`);

  const contentType = getContentType(response);
  if (!isAllowedAssetContentType(contentType)) {
    throw new Error(`disallowed asset type ${contentType ?? 'unknown'}`);
  }

  const contentLength = Number(response.headers.get('content-length') ?? 0);
  if (contentLength && contentLength > maxAssetSizeBytes) {
    throw new Error(`asset too large (${contentLength})`);
  }

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > maxAssetSizeBytes) {
    throw new Error(`asset exceeded max size (${buffer.byteLength})`);
  }

  return { buffer, contentType: contentType ?? 'application/octet-stream', finalUrl: response.url };
}

async function tryCaptureScreenshot(env: Env, targetUrl: string) {
  if (!env.BROWSER) return null;

  const response = await env.BROWSER.fetch(`https://browser/screenshot?url=${encodeURIComponent(targetUrl)}&fullPage=true&type=png`);
  if (!response.ok) throw new Error(`screenshot service returned ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

function prioritizeAssetUrls(urls: string[]) {
  const score = (url: string) => {
    const pathname = new URL(url).pathname.toLowerCase();
    if (/\.css$/.test(pathname)) return 0;
    if (/\.(js|mjs)$/.test(pathname)) return 1;
    if (/\.(woff2?|ttf|otf)$/.test(pathname)) return 2;
    if (/\.(svg|ico)$/.test(pathname)) return 3;
    if (/\.(png|jpe?g|webp|avif|gif)$/.test(pathname)) return 4;
    return 5;
  };
  return [...urls].sort((a, b) => score(a) - score(b));
}

function extractJavaScriptAssetUrls(js: string, baseUrl: string) {
  const urls = new Set<string>();
  const patterns = [
    /(?:import|export)[^;]*?\bfrom\s*["']([^"']+)["']/g,
    /import\s*["']([^"']+)["']/g,
    /import\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(js))) {
      const candidate = match[1];
      if (!candidate || candidate.startsWith('data:') || candidate.startsWith('blob:')) continue;
      const resolved = new URL(candidate, baseUrl).toString();
      if (/^https?:\/\//i.test(resolved)) urls.add(resolved);
    }
  }
  return [...urls];
}

export async function processSnapshot(env: Env, snapshotId: string, inputUrl: string) {
  const db = getDb(env);
  const config = getConfig(env);
  const { url } = normalizeUrl(inputUrl);
  const storedAssets: StoredAsset[] = [];
  const processingDeadline = Date.now() + config.processingDeadlineMs;
  let stoppedEarlyReason: string | undefined;

  const hasProcessingBudget = (minimumMs = 1000) => Date.now() + minimumMs < processingDeadline;
  const markStoppedEarly = async (reason: string) => {
    if (stoppedEarlyReason) return;
    stoppedEarlyReason = reason;
    await createCapture(env, snapshotId, 'budget', 'partial', reason);
  };

  await updateSnapshotStatus(env, snapshotId, 'processing');

  try {
    if (shouldSkipUrl(url)) throw new Error('auth-like pages are skipped');
    if (config.respectRobots && !(await isRobotsAllowed(url))) throw new Error('blocked by robots.txt');

    const { html, finalUrl } = await fetchHtml(url.toString());
    await createCapture(env, snapshotId, 'fetch_html', 'success');

    const fallbackReason = shouldFallbackToScreenshot(html);
    const replacements = new Map<string, string>();
    const assetReferences = extractAssetReferences(html, finalUrl);
    const assetUrls = prioritizeAssetUrls(extractAssetUrls(html, finalUrl)).slice(0, config.maxAssetCount);
    const queuedAssetUrls = new Set(assetUrls);
    const fetchedAssetUrls = new Set<string>();
    let totalBytes = 0;

    async function storeAsset(assetUrl: string) {
      if (fetchedAssetUrls.has(assetUrl)) return;
      fetchedAssetUrls.add(assetUrl);

      if (!hasProcessingBudget(1500)) {
        await markStoppedEarly('processing time budget reached before all assets were fetched');
        return;
      }

      try {
        const remainingBudgetMs = Math.max(1000, processingDeadline - Date.now() - 1000);
        const assetTimeoutMs = Math.min(config.assetFetchTimeoutMs, remainingBudgetMs);
        const { buffer, contentType, finalUrl: assetFinalUrl } = await fetchAsset(assetUrl, config.maxAssetSizeBytes, assetTimeoutMs);
        if (totalBytes + buffer.byteLength > config.maxTotalAssetBytes) {
          await createCapture(env, snapshotId, 'fetch_asset', 'partial', `${assetUrl}: total asset byte cap reached`);
          return;
        }

        let body = buffer;
        if (contentType === 'text/css') {
          const css = new TextDecoder().decode(buffer);
          const cssReferences = extractCssAssetReferences(css, assetFinalUrl);
          for (const cssReference of cssReferences) {
            if (queuedAssetUrls.size >= config.maxAssetCount || !hasProcessingBudget(1500)) break;
            if (!queuedAssetUrls.has(cssReference.resolved)) {
              queuedAssetUrls.add(cssReference.resolved);
              await storeAsset(cssReference.resolved);
            }
          }
          body = new TextEncoder().encode(rewriteCssWithAssets(css, cssReferences, replacements)).buffer;
        } else if (/(?:application|text)\/javascript|application\/x-javascript/.test(contentType)) {
          const js = new TextDecoder().decode(buffer);
          for (const jsReference of extractJavaScriptAssetUrls(js, assetFinalUrl)) {
            if (queuedAssetUrls.size >= config.maxAssetCount || !hasProcessingBudget(1500)) break;
            if (!queuedAssetUrls.has(jsReference)) {
              queuedAssetUrls.add(jsReference);
              await storeAsset(jsReference);
            }
          }
        }

        const hash = await sha256(body);
        await putAsset(env, hash, body, contentType);
        await putSnapshotResource(env, snapshotId, new URL(assetFinalUrl).pathname, body, contentType);
        totalBytes += body.byteLength;

        const replayUrl = `/snapshot/${snapshotId}/resource${new URL(assetFinalUrl).pathname}`;
        replacements.set(assetUrl, replayUrl);
        replacements.set(assetFinalUrl, replayUrl);

        const assetRecord: StoredAsset = { url: assetUrl, hash, contentType, size: body.byteLength };
        storedAssets.push(assetRecord);

        await db.insert(assets).values({
          id: createId('ast'),
          snapshotId,
          url: assetUrl,
          hash,
          contentType,
          size: body.byteLength,
        });
      } catch (error) {
        await createCapture(env, snapshotId, 'fetch_asset', 'partial', `${assetUrl}: ${String(error)}`);
      }
    }

    for (const assetUrl of assetUrls) {
      if (!hasProcessingBudget(1500)) {
        await markStoppedEarly('processing time budget reached before all assets were fetched');
        break;
      }
      await storeAsset(assetUrl);
    }

    const rewrittenHtml = rewriteHtmlWithAssets(html, assetReferences, replacements, finalUrl);
    const canStoreHtml = rewrittenHtml.trim().length > 0;

    if (canStoreHtml) {
      await putSnapshotHtml(env, snapshotId, rewrittenHtml);
    }

    if (fallbackReason) {
      await updateSnapshotStatus(env, snapshotId, 'fallback_required');
      await createCapture(env, snapshotId, 'fallback_decision', 'partial', fallbackReason);

      try {
        const screenshot = await tryCaptureScreenshot(env, finalUrl);
        if (screenshot) {
          await putScreenshot(env, snapshotId, screenshot);
          await updateSnapshotStatus(env, snapshotId, canStoreHtml ? 'completed' : 'screenshot_only');
          await createCapture(env, snapshotId, 'screenshot', 'success');
          await buildMetadata(
            env,
            snapshotId,
            {
              id: snapshotId,
              url: inputUrl,
              normalizedUrl: normalizeUrl(inputUrl).normalized,
              createdAt: new Date().toISOString(),
              status: canStoreHtml ? 'completed' : 'screenshot_only',
              htmlStored: canStoreHtml,
              screenshotStored: true,
              fallbackReason: [fallbackReason, stoppedEarlyReason].filter(Boolean).join('; ') || undefined,
            },
            storedAssets,
          );
          return;
        }
      } catch (error) {
        await createCapture(env, snapshotId, 'screenshot', 'failed', String(error));
      }
    }

    await updateSnapshotStatus(env, snapshotId, canStoreHtml ? 'completed' : 'failed');
    await buildMetadata(
      env,
      snapshotId,
      {
        id: snapshotId,
        url: inputUrl,
        normalizedUrl: normalizeUrl(inputUrl).normalized,
        createdAt: new Date().toISOString(),
        status: canStoreHtml ? 'completed' : 'failed',
        htmlStored: canStoreHtml,
        screenshotStored: false,
        fallbackReason: [fallbackReason, stoppedEarlyReason].filter(Boolean).join('; ') || undefined,
      },
      storedAssets,
    );
  } catch (error) {
    await updateSnapshotStatus(env, snapshotId, 'failed');
    await createCapture(env, snapshotId, 'pipeline', 'failed', String(error));
    await buildMetadata(
      env,
      snapshotId,
      {
        id: snapshotId,
        url: inputUrl,
        normalizedUrl: normalizeUrl(inputUrl).normalized,
        createdAt: new Date().toISOString(),
        status: 'failed',
        htmlStored: false,
        screenshotStored: false,
        fallbackReason: String(error),
      },
      storedAssets,
    );
  }
}

export async function getSnapshotDetails(env: Env, snapshotId: string) {
  const db = getDb(env);
  const [snapshot] = await db.select().from(snapshots).where(eq(snapshots.id, snapshotId)).limit(1);
  if (!snapshot) return null;

  const snapshotAssets = await db.select().from(assets).where(eq(assets.snapshotId, snapshotId));
  const snapshotCaptures = await db
    .select()
    .from(captures)
    .where(eq(captures.snapshotId, snapshotId))
    .orderBy(desc(captures.id));

  return { snapshot, assets: snapshotAssets, captures: snapshotCaptures };
}

export async function createSnapshotRecord(env: Env, inputUrl: string) {
  const db = getDb(env);
  const { normalized } = normalizeUrl(inputUrl);
  const [existing] = await db
    .select()
    .from(snapshots)
    .where(and(eq(snapshots.normalizedUrl, normalized), eq(snapshots.status, 'completed')))
    .orderBy(desc(snapshots.createdAt))
    .limit(1);

  if (existing) return { snapshotId: existing.id, normalizedUrl: normalized, deduped: true };

  const snapshotId = createId('snap');
  await db.insert(snapshots).values({
    id: snapshotId,
    url: inputUrl,
    normalizedUrl: normalized,
    status: 'queued',
  });
  await db.insert(captures).values({ id: createId('cap'), snapshotId, method: 'enqueue', status: 'queued', error: null });

  return { snapshotId, normalizedUrl: normalized, deduped: false };
}
