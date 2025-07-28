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
  uniqueIndex,
  bigint,
} from 'drizzle-orm/pg-core';
import { InferSelectModel, InferInsertModel, relations } from 'drizzle-orm';

// USERS TABLE
export const users = pgTable("users", {
  id: serial("id").notNull().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  resetToken: varchar("reset_token", { length: 255 }),
  resetTokenExpiry: timestamp("reset_token_expiry", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
	accounts: many(accounts),
}));

// ACCOUNTS TABLE (Auth providers)
export const accounts = pgTable(
  "accounts",
  {
    id: serial("id").notNull().primaryKey(),
    userId: integer("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 255 }).notNull(),
    provider: varchar("provider", { length: 255 }).notNull(),
    providerAccountId: varchar("providerAccountId", { length: 255 }).notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: bigint("expires_at", { mode: "number" }),
    token_type: varchar("token_type", { length: 255 }),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    uniqueConstraint: uniqueIndex("provider_account_id").on(
      account.provider,
      account.providerAccountId
    ),
  })
);

export const accountsRelations = relations(accounts, ({ one }) => ({
	user: one(users, {
		fields: [accounts.userId],
		references: [users.id],
	}),
}));

// SESSIONS TABLE (Not users!)
export const sessions = pgTable("sessions", {
  id: serial("id").notNull().primaryKey(),
  sessionToken: varchar("sessionToken", { length: 255 }).notNull().unique(),
  userId: integer("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

// VERIFICATION TOKENS
export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: varchar("identifier", { length: 255 }).notNull(),
    token: varchar("token", { length: 255 }).notNull().unique(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);

// TASKS TABLE
export const tasks = pgTable("tasks", {
  id: serial("id").notNull().primaryKey(),
  user_email: varchar("user_email", { length: 255 }).notNull(),
  text: text("text").notNull(),
  done: boolean("done").default(false),
  dueDate: timestamp("due_date", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  source: varchar("source", { length: 50 }),
  tags: jsonb("tags"),
});

// USER SETTINGS
export const userSettings = pgTable("user_settings", {
  user_email: varchar("user_email", { length: 255 }).notNull().primaryKey(),
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
  layouts: jsonb("layouts"),
});

// NOTES TABLE
export const notes = pgTable("notes", {
  id: serial("id").notNull().primaryKey(),
  user_email: varchar("user_email", { length: 255 }).notNull(),
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
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow(),
});

// CONVERSATIONS TABLE
export const conversations = pgTable("conversations", {
  id: serial("id").notNull().primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  messages: jsonb("messages").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
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
export type SelectConversation = InferSelectModel<typeof conversations>;
export type InsertConversation = InferInsertModel<typeof conversations>;

// HABITS TABLE
export const habits = pgTable("habits", {
  id: serial("id").notNull().primaryKey(),
  userId: varchar("userId", { length: 255 }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  frequency: text("frequency").notNull(),
  customDays: jsonb("customDays"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow(),
});

// HABIT COMPLETIONS TABLE
export const habitCompletions = pgTable("habitCompletions", {
  id: serial("id").notNull().primaryKey(),
  habitId: integer("habitId").notNull().references(() => habits.id, { onDelete: "cascade" }),
  userId: varchar("userId", { length: 255 }).notNull(),
  date: text("date").notNull(),
  completed: boolean("completed").default(false),
  notes: text("notes"),
  timestamp: timestamp("timestamp", { mode: "date" }).defaultNow(),
});

// PUSH SUBSCRIPTIONS TABLE
export const pushSubscriptions = pgTable("pushSubscriptions", {
  id: text("id").notNull().primaryKey(),
  user_email: varchar("user_email", { length: 255 }).notNull(),
  subscription: jsonb("subscription").notNull(),
});

// CALENDAR EVENTS TABLE
export const calendarEvents = pgTable("calendarEvents", {
  id: text("id").notNull().primaryKey(),
  user_email: varchar("user_email", { length: 255 }).notNull(),
  summary: text("summary").notNull(),
  description: text("description"),
  location: text("location"),
  start: jsonb("start").notNull(), // { dateTime?: string; date?: string; timeZone?: string }
  end: jsonb("end"), // { dateTime?: string; date?: string; timeZone?: string }
  calendarId: varchar("calendar_id", { length: 255 }).default("flohub_local"),
  source: varchar("source", { length: 50 }).default("personal"), // "personal" | "work"
  tags: text("tags").array(),
  isRecurring: boolean("is_recurring").default(false),
  seriesMasterId: text("series_master_id"),
  instanceIndex: integer("instance_index"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

// ANALYTICS PERFORMANCE METRICS TABLE
export const analyticsPerformanceMetrics = pgTable("analytics_performance_metrics", {
  id: serial("id").notNull().primaryKey(),
  userId: varchar("userId", { length: 255 }),
  fcp: integer("fcp"),
  lcp: integer("lcp"),
  fid: integer("fid"),
  cls: integer("cls"),
  ttfb: integer("ttfb"),
  navStart: integer("navStart"),
  loadComplete: integer("loadComplete"),
  apiCalls: jsonb("apiCalls"),
  componentRenders: jsonb("componentRenders"),
  timestamp: timestamp("timestamp", { mode: "date" }).defaultNow(),
  userDuration: integer("userDuration"),
});

// ANALYTICS USERS DURATIONS TABLE
export const analyticsUsersDurations = pgTable("analytics_users_durations", {
  id: serial("id").notNull().primaryKey(),
  userId: varchar("userId", { length: 255 }),
  userDuration: integer("userDuration"),
  timestamp: timestamp("timestamp", { mode: "date" }).defaultNow(),
});

// ANALYTICS PAGE VISITS TABLE
export const analyticsPageVisits = pgTable("analytics_pageVisits_visits", {
  id: serial("id").notNull().primaryKey(),
  page: text("page").notNull(),
  timestamp: timestamp("timestamp", { mode: "date" }).defaultNow(),
});

// ANALYTICS WIDGET USAGE TABLE
export const analyticsWidgetUsage = pgTable("analytics_widgetUsage_widgets", {
  id: serial("id").notNull().primaryKey(),
  widget: text("widget").notNull(),
  timestamp: timestamp("timestamp", { mode: "date" }).defaultNow(),
});

// ANALYTICS TABLE
export const analytics = pgTable("analytics", {
  id: serial("id").notNull().primaryKey(),
  user_email: varchar("user_email", { length: 255 }),
  eventType: varchar("event_type", { length: 255 }).notNull(),
  eventData: jsonb("event_data"),
  timestamp: timestamp("timestamp", { mode: "date" }).defaultNow(),
});

// FEEDBACK TABLE
export const feedback = pgTable("feedback", {
  id: serial("id").notNull().primaryKey(),
  userId: varchar("userId", { length: 255 }).notNull(),
  feedbackType: text("feedbackType"),
  feedbackText: text("feedbackText").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow(),
  notes: text("notes"),
  githubIssueNumber: integer("github_issue_number"),
  githubIssueUrl: text("github_issue_url"),
  completedAt: timestamp("completedAt", { mode: "date" }),
  notificationSent: boolean("notification_sent").default(false),
});

// BACKLOG TABLE
export const backlog = pgTable("backlog", {
  id: serial("id").notNull().primaryKey(),
  originalId: integer("originalId"),
  text: text("text").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow(),
  userId: varchar("userId", { length: 255 }).notNull(),
});

// JOURNAL ACTIVITIES TABLE
export const journalActivities = pgTable("journal_activities", {
  id: serial("id").notNull().primaryKey(),
  user_email: varchar("user_email", { length: 255 }).notNull(),
  date: text("date").notNull(),
  activities: text("activities").array(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

// JOURNAL ENTRIES TABLE
export const journalEntries = pgTable("journal_entries", {
  id: serial("id").notNull().primaryKey(),
  user_email: varchar("user_email", { length: 255 }).notNull(),
  date: text("date").notNull(),
  content: text("content"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

// JOURNAL MOODS TABLE
export const journalMoods = pgTable("journal_moods", {
  id: serial("id").notNull().primaryKey(),
  user_email: varchar("user_email", { length: 255 }).notNull(),
  date: text("date").notNull(),
  emoji: text("emoji"),
  label: text("label"),
  tags: text("tags").array(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

// JOURNAL SLEEP TABLE
export const journalSleep = pgTable("journal_sleep", {
  id: serial("id").notNull().primaryKey(),
  user_email: varchar("user_email", { length: 255 }).notNull(),
  date: text("date").notNull(),
  quality: text("quality"),
  hours: integer("hours"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

// MEETINGS TABLE
export const meetings = pgTable("meetings", {
  id: serial("id").notNull().primaryKey(),
  userId: varchar("userId", { length: 255 }).notNull(),
  title: text("title"),
  content: text("content"),
  tags: jsonb("tags"),
  eventId: text("eventId"),
  eventTitle: text("eventTitle"),
  isAdhoc: boolean("isAdhoc"),
  actions: jsonb("actions"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow(),
});
