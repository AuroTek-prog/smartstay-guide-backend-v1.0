import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  experimental: {
    externalTables: true,
  },
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    initShadowDb: `
      CREATE SCHEMA IF NOT EXISTS core;
      CREATE SCHEMA IF NOT EXISTS geo;
      CREATE SCHEMA IF NOT EXISTS units;
      CREATE SCHEMA IF NOT EXISTS devices;
      CREATE SCHEMA IF NOT EXISTS partners;
      CREATE SCHEMA IF NOT EXISTS billing;
      CREATE EXTENSION IF NOT EXISTS postgis;
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
      CREATE EXTENSION IF NOT EXISTS btree_gist;
    `,
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
