#!/bin/bash

echo "🚀 Starting Railway migration..."

# Wait for database to be ready
echo "⏳ Waiting for database connection..."
sleep 10

# Run migrations
echo "📊 Running database migrations..."
npm run migrate

# Seed with sample data (optional)
echo "🌱 Seeding database with sample data..."
npm run seed

echo "✅ Migration completed successfully!"
