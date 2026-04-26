import type { Env } from '../types';

export function getConfig(env: Env) {
  return {
    maxAssetSizeBytes: Number(env.MAX_ASSET_SIZE_BYTES ?? 5 * 1024 * 1024),
    maxTotalAssetBytes: Number(env.MAX_TOTAL_ASSET_BYTES ?? 15 * 1024 * 1024),
    maxAssetCount: Number(env.MAX_ASSET_COUNT ?? 30),
    respectRobots: String(env.RESPECT_ROBOTS ?? 'false') === 'true',
    rateLimitWindowMs: Number(env.RATE_LIMIT_WINDOW_MS ?? 60_000),
    rateLimitMaxRequests: Number(env.RATE_LIMIT_MAX_REQUESTS ?? 10),
  };
}
