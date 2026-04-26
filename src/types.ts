export interface Env {
  DB: D1Database;
  SNAPSHOTS: R2Bucket;
  BROWSER?: Fetcher;
  MAX_ASSET_SIZE_BYTES?: string;
  MAX_TOTAL_ASSET_BYTES?: string;
  MAX_ASSET_COUNT?: string;
  RESPECT_ROBOTS?: string;
  RATE_LIMIT_WINDOW_MS?: string;
  RATE_LIMIT_MAX_REQUESTS?: string;
}

export type SnapshotStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'fallback_required'
  | 'screenshot_only'
  | 'failed';

export interface SnapshotMetadata {
  id: string;
  url: string;
  normalizedUrl: string;
  createdAt: string;
  status: SnapshotStatus;
  htmlStored: boolean;
  screenshotStored: boolean;
  assetCount: number;
  totalAssetBytes: number;
  fallbackReason?: string;
}

export interface StoredAsset {
  url: string;
  hash: string;
  contentType: string;
  size: number;
}
