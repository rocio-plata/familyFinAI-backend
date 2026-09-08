import { pgTable, uuid, varchar, timestamp, pgEnum, integer, primaryKey } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role_type", ["OWNER", "MEMBER"]);
export const invitationStatusEnum = pgEnum("invitation_status", ["PENDING", "ACCEPTED", "EXPIRED", "REVOKED"]);

export const families = pgTable("families", {
  id: uuid("id").primaryKey(),
  name: varchar("name", { length: 60 }).notNull(),
  defaultCurrency: varchar("default_currency", { length: 3 }).notNull().default("CLP"),
  createdBy: uuid("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const members = pgTable(
  "members",
  {
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    role: roleEnum("role").notNull(),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
    displayOrder: integer("display_order"), // null = usar orden natural por joinedAt
  },
  (table) => ({
    pk: primaryKey({ columns: [table.familyId, table.userId] }),
  }),
);

export const invitations = pgTable("invitations", {
  id: uuid("id").primaryKey(),
  familyId: uuid("family_id")
    .notNull()
    .references(() => families.id, { onDelete: "cascade" }),
  invitedEmail: varchar("invited_email", { length: 255 }).notNull(),
  role: roleEnum("role").notNull(),
  status: invitationStatusEnum("status").notNull().default("PENDING"),
  expiresAt: timestamp("expires_at").notNull(),
  invitedUserId: uuid("invited_user_id"),
});
