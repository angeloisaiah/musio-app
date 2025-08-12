#!/bin/bash

echo "🚀 Starting Railway migration..."

# Wait for database to be ready
echo "⏳ Waiting for database connection..."
sleep 15

# Check if database is accessible
echo "🔍 Testing database connection..."
npm run migrate

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully!"
    
    # Optional: Seed with sample data
    echo "🌱 Seeding database with sample data..."
    npm run seed
    
    if [ $? -eq 0 ]; then
        echo "✅ Database seeded successfully!"
    else
        echo "⚠️  Seeding failed, but migration succeeded"
    fi
else
    echo "❌ Migration failed!"
    exit 1
fi
