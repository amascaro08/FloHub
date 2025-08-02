#!/bin/bash

# Power Automate Database Migration Script
# This script applies the database migration to enhance calendar_events table

set -e

echo "🚀 Starting Power Automate database migration..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if database connection is available
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  Warning: DATABASE_URL environment variable not set"
    echo "   Make sure your database connection is configured"
fi

# Run the migration
echo "📦 Applying database migration..."

# If using Drizzle, you would typically run:
# npm run db:migrate
# or
# npx drizzle-kit push

# For now, we'll just show the migration file
echo "📄 Migration file: db/migrations/enhance_calendar_events_for_power_automate.sql"
echo "   Please apply this migration to your database manually or using your preferred method."

echo ""
echo "✅ Migration script completed!"
echo ""
echo "📋 Next steps:"
echo "   1. Apply the migration to your database"
echo "   2. Deploy the updated schema and API endpoints"
echo "   3. Test the Power Automate sync functionality"
echo "   4. Configure cron jobs if using Vercel"
echo ""
echo "📚 For detailed instructions, see: POWER_AUTOMATE_DATABASE_INTEGRATION.md"