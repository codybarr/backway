import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const snapshots = sqliteTable(
  'snapshots',
  {
    id: text('id').primaryKey(),
    url: text('url').notNull(),
    normalizedUrl: text('normalized_url').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    status: text('status').notNull(),
  },
  (table) => ({
    normalizedUrlIdx: index('snapshots_normalized_url_idx').on(table.normalizedUrl),
    createdAtIdx: index('snapshots_created_at_idx').on(table.createdAt),
  }),
);

export const assets = sqliteTable(
  'assets',
  {
    id: text('id').primaryKey(),
    snapshotId: text('snapshot_id')
      .notNull()
      .references(() => snapshots.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    hash: text('hash').notNull(),
    contentType: text('content_type').notNull(),
    size: integer('size').notNull(),
  },
  (table) => ({
    snapshotIdIdx: index('assets_snapshot_id_idx').on(table.snapshotId),
    hashIdx: index('assets_hash_idx').on(table.hash),
  }),
);

export const captures = sqliteTable(
  'captures',
  {
    id: text('id').primaryKey(),
    snapshotId: text('snapshot_id')
      .notNull()
      .references(() => snapshots.id, { onDelete: 'cascade' }),
    method: text('method').notNull(),
    status: text('status').notNull(),
    error: text('error'),
  },
  (table) => ({
    snapshotIdIdx: index('captures_snapshot_id_idx').on(table.snapshotId),
    statusIdx: index('captures_status_idx').on(table.status),
  }),
);

export type SnapshotRow = typeof snapshots.$inferSelect;
export type AssetRow = typeof assets.$inferSelect;
export type CaptureRow = typeof captures.$inferSelect;
