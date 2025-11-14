#!/usr/bin/env node

/**
 * Simplified Migration Script
 *
 * This script helps you push migrations to your remote Supabase database.
 * It uses the official Supabase CLI under the hood.
 *
 * Usage:
 *   npm run migrate              - Push all pending migrations
 *   npm run migrate:new <name>   - Create a new migration file
 */

const { execSync } = require('child_process');
const path = require('path');

const command = process.argv[2];
const arg = process.argv[3];

function exec(cmd, options = {}) {
  try {
    console.log(`\n🚀 Running: ${cmd}\n`);
    const result = execSync(cmd, {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..'),
      ...options
    });
    return result;
  } catch (error) {
    console.error(`\n❌ Command failed: ${cmd}`);
    process.exit(1);
  }
}

function pushMigrations() {
  console.log('\n📦 Pushing migrations to remote database...\n');
  console.log('━'.repeat(50));

  // Push migrations to remote
  exec('npx supabase db push');

  console.log('\n━'.repeat(50));
  console.log('✅ Migrations pushed successfully!\n');
}

function createMigration(name) {
  if (!name) {
    console.error('❌ Migration name required');
    console.error('\nUsage: npm run migrate:new <migration-name>');
    console.error('Example: npm run migrate:new add_user_avatar\n');
    process.exit(1);
  }

  console.log(`\n📝 Creating new migration: ${name}\n`);
  console.log('━'.repeat(50));

  // Create new migration
  exec(`npx supabase migration new ${name}`);

  console.log('\n━'.repeat(50));
  console.log('✅ Migration file created!');
  console.log('\n💡 Next steps:');
  console.log('   1. Edit your migration file in supabase/migrations/');
  console.log('   2. Run: npm run migrate');
  console.log('');
}

function showHelp() {
  console.log('\n📚 Migration Helper');
  console.log('━'.repeat(50));
  console.log('\nCommands:');
  console.log('  npm run migrate              Push all pending migrations');
  console.log('  npm run migrate:new <name>   Create a new migration file');
  console.log('\nExamples:');
  console.log('  npm run migrate:new add_user_preferences');
  console.log('  npm run migrate');
  console.log('');
}

// Main execution
switch (command) {
  case 'push':
  case undefined:
    pushMigrations();
    break;
  case 'new':
  case 'create':
    createMigration(arg);
    break;
  case 'help':
  case '--help':
  case '-h':
    showHelp();
    break;
  default:
    console.error(`❌ Unknown command: ${command}`);
    showHelp();
    process.exit(1);
}
