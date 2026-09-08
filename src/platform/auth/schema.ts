// src/platform/auth/schema.ts

import { pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const refreshTokens = pgTable("refresh_tokens", {
  value: varchar("value", { length: 64 }).primaryKey(),
  userId: uuid("user_id").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
});
