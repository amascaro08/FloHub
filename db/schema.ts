import {
  pgTable,
  serial,
  text,
  timestamp,
  primaryKey,
  integer,
  boolean,
  varchar,
  jsonb,
} from 'drizzle-orm/pg-core';
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';

// USERS TABLE
export const users = pgTable("users", {
  id: serial("id").notNull().primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  password: text("password"), // Added for credentials provider
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

// ACCOUNTS TABLE (Auth providers)
export const accounts = pgTable(
  "accounts",
  {
    userId: integer("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    user_state: text("user_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

// SESSIONS TABLE (Not users!)
export const sessions = pgTable("sessions", {
  userToken: text("userToken").notNull().primaryKey(),
  userId: integer("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

// VERIFICATION TOKENS
export const verificationTokens = pgTable(
  "verificationTokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);

// TASKS TABLE
export const tasks = pgTable("tasks", {
  id: serial("id").notNull().primaryKey(),
  userEmail: varchar("user_email", { length: 255 }).notNull(),
  text: text("text").notNull(),
  done: boolean("done").default(false),
  dueDate: timestamp("due_date", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  source: varchar("source", { length: 50 }),
});

// USER SETTINGS
export const userSettings = pgTable("user_settings", {
  userEmail: varchar("user_email", { length: 255 }).notNull().primaryKey(),
  floCatStyle: varchar("flo_cat_style", { length: 50 }).default('default'),
  floCatPersonality: text("flo_cat_personality").array(),
  preferredName: varchar("preferred_name", { length: 255 }),
  selectedCals: text("selected_cals").array(),
  defaultView: varchar("default_view", { length: 50 }),
  customRange: jsonb("custom_range"),
  powerAutomateUrl: varchar("power_automate_url", { length: 255 }),
  globalTags: text("global_tags").array(),
  activeWidgets: text("active_widgets").array(),
  calendarSources: jsonb("calendar_sources"),
  timezone: varchar("timezone", { length: 50 }),
  tags: text("tags").array(),
  widgets: text("widgets").array(),
  calendarSettings: jsonb("calendar_settings"),
  notificationSettings: jsonb("notification_settings"),
  floCatSettings: jsonb("flo_cat_settings"),
});

// NOTES TABLE
export const notes = pgTable("notes", {
  id: serial("id").notNull().primaryKey(),
  userEmail: varchar("user_email", { length: 255 }).notNull(),
  title: varchar("title", { length: 255 }),
  content: text("content").notNull(),
  tags: text("tags").array(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  source: varchar("source", { length: 50 }),
  eventId: varchar("event_id", { length: 255 }),
  eventTitle: varchar("event_title", { length: 255 }),
  isAdhoc: boolean("is_adhoc").default(false),
  actions: jsonb("actions"),
  agenda: text("agenda"),
  aiSummary: text("ai_summary"),
});

// DRIZZLE TYPE HELPERS
export type SelectUser = InferSelectModel<typeof users>;
export type InsertUser = InferInsertModel<typeof users>;
export type SelectTask = InferSelectModel<typeof tasks>;
export type InsertTask = InferInsertModel<typeof tasks>;
export type SelectNote = InferSelectModel<typeof notes>;
export type InsertNote = InferInsertModel<typeof notes>;
export type SelectUserSettings = InferSelectModel<typeof userSettings>;
export type InsertUserSettings = InferInsertModel<typeof userSettings>;
