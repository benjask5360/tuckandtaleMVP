#!/usr/bin/env node

/**
 * Universal Migration Runner for Remote Supabase
 *
 * This script replaces the old exec_sql approach with proper Supabase CLI commands
 * and SDK methods for data migrations.
 *
 * Usage:
 * - For SQL schema migrations: Use `npm run db:push` instead
 * - For data migrations: Use this script with Supabase SDK methods
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Validate environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY are set in .env.local');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Example data migration functions
 */

async function insertData(table, data) {
  console.log(`📝 Inserting data into ${table}...`);
  const { data: result, error } = await supabase
    .from(table)
    .insert(data);

  if (error) {
    console.error(`❌ Error inserting into ${table}:`, error);
    throw error;
  }

  console.log(`✅ Successfully inserted ${Array.isArray(data) ? data.length : 1} record(s) into ${table}`);
  return result;
}

async function updateData(table, updates, filter) {
  console.log(`📝 Updating ${table}...`);
  let query = supabase.from(table).update(updates);

  // Apply filters if provided
  if (filter) {
    Object.entries(filter).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
  }

  const { data, error } = await query;

  if (error) {
    console.error(`❌ Error updating ${table}:`, error);
    throw error;
  }

  console.log(`✅ Successfully updated ${table}`);
  return data;
}

async function deleteData(table, filter) {
  console.log(`🗑️ Deleting from ${table}...`);
  let query = supabase.from(table).delete();

  // Apply filters
  if (filter) {
    Object.entries(filter).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
  } else {
    console.error('❌ Delete operation requires a filter for safety');
    throw new Error('Delete filter required');
  }

  const { data, error } = await query;

  if (error) {
    console.error(`❌ Error deleting from ${table}:`, error);
    throw error;
  }

  console.log(`✅ Successfully deleted from ${table}`);
  return data;
}

async function selectData(table, options = {}) {
  console.log(`🔍 Querying ${table}...`);
  let query = supabase.from(table).select(options.select || '*');

  // Apply filters
  if (options.filter) {
    Object.entries(options.filter).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
  }

  // Apply ordering
  if (options.orderBy) {
    query = query.order(options.orderBy, { ascending: options.ascending ?? true });
  }

  // Apply limit
  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error(`❌ Error querying ${table}:`, error);
    throw error;
  }

  console.log(`✅ Found ${data.length} record(s) in ${table}`);
  return data;
}

/**
 * Main migration runner
 */
async function runMigration() {
  const migrationName = process.argv[2];

  if (!migrationName) {
    console.log(`
Universal Migration Runner
==========================

For SQL schema migrations:
  npm run db:push              # Push pending migrations to remote
  npm run db:diff              # Check for schema differences
  npm run db:pull              # Pull remote schema

For data migrations, create a function in this file and run:
  node scripts/run-migration.js <migration-name>

Available data migrations:
  - example-insert            # Example: Insert test data
  - example-update            # Example: Update records
  - example-query             # Example: Query data
    `);
    return;
  }

  console.log(`\n🚀 Running migration: ${migrationName}\n`);

  try {
    switch (migrationName) {
      case 'example-insert':
        // Example: Insert test data
        await insertData('subscription_tiers', {
          name: 'Test Tier',
          price_per_month: 9.99,
          tokens_per_month: 1000,
          character_limit: 5,
          storage_limit: '1GB',
          priority_support: false
        });
        break;

      case 'example-update':
        // Example: Update all free tiers
        await updateData(
          'subscription_tiers',
          { tokens_per_month: 500 },
          { name: 'Free' }
        );
        break;

      case 'example-query':
        // Example: Query and display data
        const tiers = await selectData('subscription_tiers', {
          select: '*',
          limit: 5
        });
        console.table(tiers);
        break;

      case 'test-connection':
        // Test database connection by listing tables
        console.log('Testing database connection...');
        const { data: tables, error } = await supabase
          .from('user_profiles')
          .select('id')
          .limit(1);

        if (error) {
          console.error('Connection failed:', error);
        } else {
          console.log('✅ Database connection successful!');
          console.log('Found user_profiles table');
        }
        break;

      case 'test-migration':
        // Test migration: Create a test record
        console.log('Running test migration...');

        const timestamp = new Date().toISOString();

        // Test 1: Query existing data
        console.log('\n1️⃣ Testing SELECT query...');
        const { data: testData, error: testError } = await supabase
          .from('user_profiles')
          .select('id, email')
          .limit(1);

        if (testError) {
          console.error('❌ Test query failed:', testError);
        } else {
          console.log('✅ SELECT successful!');
          console.log(`Found ${testData.length} user profile(s)`);
          if (testData.length > 0) {
            console.log('Sample data:', testData[0]);
          }
        }

        // Test 2: Check api_cost_logs structure
        console.log('\n2️⃣ Checking api_cost_logs table structure...');
        const { data: costLogSample, error: costLogError } = await supabase
          .from('api_cost_logs')
          .select('*')
          .limit(1);

        if (costLogError) {
          console.log('⚠️ Could not query api_cost_logs:', costLogError.message);
        } else {
          console.log('✅ api_cost_logs table accessible');
          if (costLogSample && costLogSample.length > 0) {
            console.log('Table columns:', Object.keys(costLogSample[0]));
          } else {
            console.log('Table is empty - attempting safe insert test...');

            // Try minimal insert
            const { data: inserted, error: insertError } = await supabase
              .from('api_cost_logs')
              .insert({
                user_id: '4832a3ae-0e20-425a-b411-b4c8711b70ec',
                provider: 'test',
                model_name: 'cli-test',
                actual_cost_usd: 0.00,
                metadata: { test: true, timestamp, source: 'cli-migration-test' }
              })
              .select();

            if (insertError) {
              console.log('⚠️ Insert test failed:', insertError.message);
            } else {
              console.log('✅ INSERT successful!');
              console.log('Inserted record ID:', inserted[0].id);

              // Clean up
              const { error: deleteError } = await supabase
                .from('api_cost_logs')
                .delete()
                .eq('id', inserted[0].id);

              if (!deleteError) {
                console.log('✅ DELETE successful! (cleanup complete)');
              } else {
                console.log('⚠️ Could not delete test record:', deleteError.message);
              }
            }
          }
        }

        // Test 3: List all accessible tables
        console.log('\n3️⃣ Testing table access...');
        const tableList = ['user_profiles', 'character_profiles', 'stories', 'api_cost_logs'];
        const accessible = [];

        for (const tableName of tableList) {
          const { error } = await supabase.from(tableName).select('id').limit(1);
          if (!error) {
            accessible.push(tableName);
          }
        }

        console.log('✅ Accessible tables:', accessible.join(', '));
        console.log('\n🎉 Migration test completed!');
        break;

      default:
        console.error(`❌ Unknown migration: ${migrationName}`);
        console.log('Add your migration to the switch statement in this file');
        process.exit(1);
    }

    console.log('\n✨ Migration completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runMigration();
}

// Export functions for use in other scripts
module.exports = {
  supabase,
  insertData,
  updateData,
  deleteData,
  selectData
};