import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    databaseId: process.env.CLOUDFLARE_D1_DATABASE_ID ?? 'local',
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? 'local',
    token: process.env.CLOUDFLARE_API_TOKEN ?? 'local',
  },
});
