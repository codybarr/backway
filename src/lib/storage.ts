import type { Env, SnapshotMetadata } from '../types';

export async function putSnapshotHtml(env: Env, snapshotId: string, html: string) {
  await env.SNAPSHOTS.put(`snapshots/${snapshotId}/index.html`, html, {
    httpMetadata: { contentType: 'text/html; charset=utf-8' },
  });
}

export async function putSnapshotMetadata(env: Env, snapshotId: string, metadata: SnapshotMetadata) {
  await env.SNAPSHOTS.put(`snapshots/${snapshotId}/metadata.json`, JSON.stringify(metadata, null, 2), {
    httpMetadata: { contentType: 'application/json; charset=utf-8' },
  });
}

export async function getSnapshotMetadata(env: Env, snapshotId: string) {
  const object = await env.SNAPSHOTS.get(`snapshots/${snapshotId}/metadata.json`);
  if (!object) return null;
  return (await object.json()) as SnapshotMetadata;
}

export async function putScreenshot(env: Env, snapshotId: string, bytes: Uint8Array) {
  await env.SNAPSHOTS.put(`snapshots/${snapshotId}/screenshot.png`, bytes, {
    httpMetadata: { contentType: 'image/png' },
  });
}

export async function getSnapshotHtml(env: Env, snapshotId: string) {
  return env.SNAPSHOTS.get(`snapshots/${snapshotId}/index.html`);
}

export async function getScreenshot(env: Env, snapshotId: string) {
  return env.SNAPSHOTS.get(`snapshots/${snapshotId}/screenshot.png`);
}

export async function putAsset(env: Env, hash: string, body: ArrayBuffer, contentType: string) {
  const key = `assets/${hash}`;
  const existing = await env.SNAPSHOTS.head(key);
  if (!existing) {
    await env.SNAPSHOTS.put(key, body, {
      httpMetadata: { contentType },
    });
  }
}

export async function putSnapshotResource(
  env: Env,
  snapshotId: string,
  resourcePath: string,
  body: ArrayBuffer,
  contentType: string,
) {
  await env.SNAPSHOTS.put(`snapshots/${snapshotId}/resources${resourcePath}`, body, {
    httpMetadata: { contentType },
  });
}

export async function getSnapshotResource(env: Env, snapshotId: string, resourcePath: string) {
  return env.SNAPSHOTS.get(`snapshots/${snapshotId}/resources${resourcePath}`);
}

export async function getAsset(env: Env, hash: string) {
  return env.SNAPSHOTS.get(`assets/${hash}`);
}
