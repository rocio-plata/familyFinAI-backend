import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/platform/db/schema.ts",
  out: "./src/platform/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  strict: true,
  verbose: true,
});
