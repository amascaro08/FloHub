#!/bin/bash

# Enhanced Feedback System Setup Script
# This script sets up the enhanced feedback system for FloHub

echo "🚀 Setting up Enhanced Feedback System for FloHub"
echo "=================================================="

# Check if required environment variables are set
echo "📋 Checking environment variables..."

required_vars=(
    "GITHUB_TOKEN"
    "GITHUB_REPO_OWNER" 
    "GITHUB_REPO_NAME"
    "EMAIL_USER"
    "EMAIL_PASS"
    "DATABASE_URL"
)

missing_vars=()

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    echo "❌ Missing required environment variables:"
    printf '   - %s\n' "${missing_vars[@]}"
    echo ""
    echo "Please set these variables and run the script again."
    echo "See ENHANCED_FEEDBACK_SYSTEM.md for details."
    exit 1
fi

echo "✅ All required environment variables are set"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install react-markdown
if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Run database migration
echo ""
echo "🗄️  Running database migration..."
if command -v psql &> /dev/null; then
    # Extract database name from DATABASE_URL if possible
    if [[ $DATABASE_URL =~ postgres://[^/]+/([^?]+) ]]; then
        DB_NAME="${BASH_REMATCH[1]}"
        echo "   Database: $DB_NAME"
    fi
    
    # Run the migration
    psql "$DATABASE_URL" -f add_feedback_github_fields.sql
    if [ $? -eq 0 ]; then
        echo "✅ Database migration completed"
    else
        echo "❌ Database migration failed"
        echo "   Please run the migration manually:"
        echo "   psql \$DATABASE_URL -f add_feedback_github_fields.sql"
    fi
else
    echo "⚠️  psql not found - please run migration manually:"
    echo "   psql \$DATABASE_URL -f add_feedback_github_fields.sql"
fi

# Test GitHub configuration
echo ""
echo "🔧 Testing GitHub configuration..."
if command -v curl &> /dev/null; then
    response=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
                   "https://api.github.com/repos/$GITHUB_REPO_OWNER/$GITHUB_REPO_NAME")
    
    if echo "$response" | grep -q '"full_name"'; then
        echo "✅ GitHub configuration is valid"
    else
        echo "❌ GitHub configuration test failed"
        echo "   Please check your GITHUB_TOKEN, GITHUB_REPO_OWNER, and GITHUB_REPO_NAME"
    fi
else
    echo "⚠️  curl not found - please test GitHub configuration manually"
fi

# Display webhook setup instructions
echo ""
echo "🔗 GitHub Webhook Setup (Optional)"
echo "=================================="
echo "To enable automatic notifications when feedback is completed:"
echo ""
echo "1. Go to: https://github.com/$GITHUB_REPO_OWNER/$GITHUB_REPO_NAME/settings/hooks"
echo "2. Click 'Add webhook'"
echo "3. Set Payload URL to: https://your-domain.com/api/github-webhook"
echo "4. Set Content type to: application/json"
echo "5. Set Secret to a random string and add it as GITHUB_WEBHOOK_SECRET env var"
echo "6. Select 'Let me select individual events' and check 'Issues'"
echo "7. Click 'Add webhook'"

# Display completion message
echo ""
echo "✨ Enhanced Feedback System Setup Complete!"
echo "==========================================="
echo ""
echo "What's been set up:"
echo "✅ Dependencies installed (react-markdown)"
echo "✅ Database schema updated (if psql available)"
echo "✅ GitHub integration tested"
echo ""
echo "Next steps:"
echo "1. Deploy your application with the new changes"
echo "2. Set up GitHub webhook (see instructions above)"
echo "3. Test the feedback system by submitting test feedback"
echo ""
echo "📚 For more information, see: ENHANCED_FEEDBACK_SYSTEM.md"
echo ""
echo "🎉 Your users can now enjoy a transparent, engaging feedback experience!"