#!/usr/bin/env node

import 'dotenv/config';
import { createDb } from './src/db/connection.js';

async function testDatabase() {
  console.log('🔍 Testing Railway database connection...');

  try {
    // Test connection
    const db = createDb();
    console.log('✅ Database connection created');

    // Test basic query
    const result = await db
      .selectFrom('information_schema.tables')
      .select('table_name')
      .where('table_schema', '=', 'public')
      .limit(5)
      .execute();

    console.log('✅ Database query successful');
    console.log(
      '📊 Available tables:',
      result.map((r) => r.table_name),
    );

    // Check if posts table exists
    const postsTable = result.find((r) => r.table_name === 'posts');
    if (postsTable) {
      console.log('✅ Posts table exists');
    } else {
      console.log('❌ Posts table missing - need to run migrations');
      console.log('💡 Run: npm run migrate');
    }

    await db.destroy();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    process.exit(1);
  }
}

testDatabase();
