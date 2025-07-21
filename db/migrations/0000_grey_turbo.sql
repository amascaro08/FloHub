CREATE TABLE "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"type" varchar(255) NOT NULL,
	"provider" varchar(255) NOT NULL,
	"providerAccountId" varchar(255) NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" bigint,
	"token_type" varchar(255),
	"scope" text,
	"id_token" text,
	"session_state" text
);
--> statement-breakpoint
CREATE TABLE "analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_email" varchar(255),
	"event_type" varchar(255) NOT NULL,
	"event_data" jsonb,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "analytics_pageVisits_visits" (
	"id" serial PRIMARY KEY NOT NULL,
	"page" text NOT NULL,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "analytics_performance_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" varchar(255),
	"fcp" integer,
	"lcp" integer,
	"fid" integer,
	"cls" integer,
	"ttfb" integer,
	"navStart" integer,
	"loadComplete" integer,
	"apiCalls" jsonb,
	"componentRenders" jsonb,
	"timestamp" timestamp DEFAULT now(),
	"userDuration" integer
);
--> statement-breakpoint
CREATE TABLE "analytics_users_durations" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" varchar(255),
	"userDuration" integer,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "analytics_widgetUsage_widgets" (
	"id" serial PRIMARY KEY NOT NULL,
	"widget" text NOT NULL,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "backlog" (
	"id" serial PRIMARY KEY NOT NULL,
	"originalId" integer,
	"text" text NOT NULL,
	"createdAt" timestamp DEFAULT now(),
	"userId" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendarEvents" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" varchar(255) NOT NULL,
	"summary" text NOT NULL,
	"start" jsonb NOT NULL,
	"end" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"messages" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" varchar(255) NOT NULL,
	"feedbackType" text,
	"feedbackText" text NOT NULL,
	"status" text NOT NULL,
	"createdAt" timestamp DEFAULT now(),
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "habitCompletions" (
	"id" serial PRIMARY KEY NOT NULL,
	"habitId" integer NOT NULL,
	"userId" varchar(255) NOT NULL,
	"date" text NOT NULL,
	"completed" boolean DEFAULT false,
	"notes" text,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "habits" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" varchar(255) NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"frequency" text NOT NULL,
	"customDays" jsonb,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "journal_activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_email" varchar(255) NOT NULL,
	"date" text NOT NULL,
	"activities" text[],
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "journal_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_email" varchar(255) NOT NULL,
	"date" text NOT NULL,
	"content" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "journal_moods" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_email" varchar(255) NOT NULL,
	"date" text NOT NULL,
	"emoji" text,
	"label" text,
	"tags" text[],
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "journal_sleep" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_email" varchar(255) NOT NULL,
	"date" text NOT NULL,
	"quality" text,
	"hours" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "meetings" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" varchar(255) NOT NULL,
	"title" text,
	"content" text,
	"tags" jsonb,
	"eventId" text,
	"eventTitle" text,
	"isAdhoc" boolean,
	"actions" jsonb,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_email" varchar(255) NOT NULL,
	"title" varchar(255),
	"content" text NOT NULL,
	"tags" text[],
	"created_at" timestamp DEFAULT now(),
	"source" varchar(50),
	"event_id" varchar(255),
	"event_title" varchar(255),
	"is_adhoc" boolean DEFAULT false,
	"actions" jsonb,
	"agenda" text,
	"ai_summary" text,
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pushSubscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_email" varchar(255) NOT NULL,
	"subscription" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"sessionToken" varchar(255) NOT NULL,
	"userId" integer NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "sessions_sessionToken_unique" UNIQUE("sessionToken")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_email" varchar(255) NOT NULL,
	"text" text NOT NULL,
	"done" boolean DEFAULT false,
	"due_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"source" varchar(50),
	"tags" jsonb
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_email" varchar(255) PRIMARY KEY NOT NULL,
	"flo_cat_style" varchar(50) DEFAULT 'default',
	"flo_cat_personality" text[],
	"preferred_name" varchar(255),
	"selected_cals" text[],
	"default_view" varchar(50),
	"custom_range" jsonb,
	"power_automate_url" varchar(255),
	"global_tags" text[],
	"active_widgets" text[],
	"calendar_sources" jsonb,
	"timezone" varchar(50),
	"tags" text[],
	"widgets" text[],
	"calendar_settings" jsonb,
	"notification_settings" jsonb,
	"flo_cat_settings" jsonb,
	"layouts" jsonb
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255),
	"email" varchar(255) NOT NULL,
	"emailVerified" timestamp with time zone,
	"image" varchar(255),
	"password" varchar(255),
	"reset_token" varchar(255),
	"reset_token_expiry" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token"),
	CONSTRAINT "verification_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habitCompletions" ADD CONSTRAINT "habitCompletions_habitId_habits_id_fk" FOREIGN KEY ("habitId") REFERENCES "public"."habits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "provider_account_id" ON "accounts" USING btree ("provider","providerAccountId");