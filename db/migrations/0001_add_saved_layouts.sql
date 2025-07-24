-- Migration: Add saved_layouts column to user_settings table
-- This migration adds the saved_layouts column to store user's custom widget layouts

ALTER TABLE "user_settings" ADD COLUMN "saved_layouts" jsonb;