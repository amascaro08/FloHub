#!/bin/bash

# PWA Deployment Script
# This script updates the PWA version and builds the app for deployment

set -e

echo "🚀 Starting PWA deployment..."

# Update PWA version
echo "📝 Updating PWA version..."
node scripts/update-pwa-version.js

# Build the app
echo "🔨 Building the app..."
npm run build

echo "✅ PWA deployment ready!"
echo "📦 The app is now built with the latest PWA version"
echo "🌐 Deploy the contents of the .next directory to your hosting platform"