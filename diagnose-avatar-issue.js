const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runDiagnostics() {
  console.log('====================================================');
  console.log('AVATAR SAVE ISSUE - COMPLETE DIAGNOSIS');
  console.log('====================================================\n');

  try {
    // 1. Get avatar_cache table structure
    console.log('1. CHECKING AVATAR_CACHE TABLE STRUCTURE...');
    console.log('--------------------------------------------');

    const tableQuery = `
      SELECT
        column_name,
        data_type,
        column_default,
        is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'avatar_cache'
      ORDER BY ordinal_position
    `;

    const { data: columns, error: columnsError } = await supabase.rpc('sql_query', {
      query: tableQuery
    });

    if (columnsError) {
      // Try direct query
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc`, {
        method: 'POST',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: tableQuery
        })
      });

      if (!response.ok) {
        console.log('Cannot run direct SQL. Creating SQL file for manual execution...');
        console.log('\nRun this query in Supabase SQL Editor:\n');
        console.log(tableQuery);
      }
    } else if (columns) {
      console.log('AVATAR_CACHE COLUMNS:');
      columns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
      });
    }

    // 2. Check RLS policies
    console.log('\n2. CHECKING RLS POLICIES...');
    console.log('--------------------------------------------');

    const rlsQuery = `
      SELECT
        polname as policy_name,
        CASE polcmd
          WHEN 'r' THEN 'SELECT'
          WHEN 'a' THEN 'INSERT'
          WHEN 'w' THEN 'UPDATE'
          WHEN 'd' THEN 'DELETE'
          WHEN '*' THEN 'ALL'
        END as command,
        pg_get_expr(polqual, polrelid) as using_expression,
        pg_get_expr(polwithcheck, polrelid) as with_check_expression
      FROM pg_policy
      WHERE polrelid = 'public.avatar_cache'::regclass
      ORDER BY polname
    `;

    const { data: policies, error: policiesError } = await supabase.rpc('sql_query', {
      query: rlsQuery
    });

    if (policies) {
      console.log('RLS POLICIES:');
      policies.forEach(policy => {
        console.log(`\n  Policy: ${policy.policy_name}`);
        console.log(`  Command: ${policy.command}`);
        console.log(`  USING: ${policy.using_expression || 'none'}`);
        console.log(`  WITH CHECK: ${policy.with_check_expression || 'none'}`);
      });
    }

    // 3. Check foreign key constraints
    console.log('\n3. CHECKING FOREIGN KEY CONSTRAINTS...');
    console.log('--------------------------------------------');

    const fkQuery = `
      SELECT
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name as foreign_table_name,
        ccu.column_name as foreign_column_name,
        rc.delete_rule
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      JOIN information_schema.referential_constraints rc
        ON rc.constraint_name = tc.constraint_name
      WHERE tc.table_schema = 'public'
        AND tc.table_name = 'avatar_cache'
        AND tc.constraint_type = 'FOREIGN KEY'
    `;

    const { data: fkeys, error: fkeysError } = await supabase.rpc('sql_query', {
      query: fkQuery
    });

    if (fkeys) {
      console.log('FOREIGN KEYS:');
      fkeys.forEach(fk => {
        console.log(`  - ${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name} (ON DELETE ${fk.delete_rule})`);
      });
    }

    // 4. Check if RLS is enabled
    console.log('\n4. CHECKING RLS STATUS...');
    console.log('--------------------------------------------');

    const rlsStatusQuery = `
      SELECT
        relname as table_name,
        relrowsecurity as rls_enabled,
        relforcerowsecurity as force_rls
      FROM pg_class
      WHERE oid = 'public.avatar_cache'::regclass
    `;

    const { data: rlsStatus, error: rlsStatusError } = await supabase.rpc('sql_query', {
      query: rlsStatusQuery
    });

    if (rlsStatus && rlsStatus[0]) {
      console.log(`RLS Enabled: ${rlsStatus[0].rls_enabled ? 'YES' : 'NO'}`);
      console.log(`Force RLS: ${rlsStatus[0].force_rls ? 'YES' : 'NO'}`);
    }

    // 5. Test avatar creation flow
    console.log('\n5. TESTING AVATAR SAVE FLOW...');
    console.log('--------------------------------------------');
    console.log('Checking application code flow...\n');

    // Read the relevant files
    const files = [
      'app/api/avatars/generate-preview/route.ts',
      'app/api/avatars/link-preview/route.ts',
      'components/forms/DynamicCharacterForm.tsx'
    ];

    for (const file of files) {
      const filePath = path.join(__dirname, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');

        // Check for specific patterns
        if (file.includes('generate-preview')) {
          const insertMatch = content.match(/\.insert\(([^)]+)\)/s);
          if (insertMatch) {
            console.log(`${file} - INSERT operation:`);
            console.log(insertMatch[1].substring(0, 200));
          }
        }

        if (file.includes('link-preview')) {
          const updateMatch = content.match(/\.update\(([^)]+)\)/s);
          if (updateMatch) {
            console.log(`\n${file} - UPDATE operation:`);
            console.log(updateMatch[1].substring(0, 200));
          }
        }
      }
    }

    // Generate comprehensive SQL for manual execution
    console.log('\n====================================================');
    console.log('GENERATING COMPLETE DIAGNOSTIC SQL...');
    console.log('====================================================\n');

    const diagnosticSQL = fs.readFileSync('get_current_schema.sql', 'utf-8');

    fs.writeFileSync('run_avatar_diagnostic.sql', diagnosticSQL);
    console.log('Created: run_avatar_diagnostic.sql');
    console.log('Run this file in Supabase SQL Editor for complete diagnostics.');

    // Summary
    console.log('\n====================================================');
    console.log('KEY QUESTIONS TO INVESTIGATE:');
    console.log('====================================================');
    console.log('1. Does avatar_cache have a column called "character_profile_id" or "profile_id"?');
    console.log('2. Does avatar_cache have a "created_by_user_id" column?');
    console.log('3. Are the RLS policies checking for NULL character_profile_id?');
    console.log('4. Is there a WITH CHECK clause that might block updates?');
    console.log('5. Are there any BEFORE triggers that might interfere?');
    console.log('\nRun the SQL diagnostic file in Supabase for complete analysis.');

  } catch (error) {
    console.error('Error during diagnostics:', error);

    console.log('\n====================================================');
    console.log('MANUAL DIAGNOSTIC STEPS:');
    console.log('====================================================');
    console.log('1. Go to Supabase SQL Editor');
    console.log('2. Run the contents of "get_current_schema.sql"');
    console.log('3. Share the complete output');
    console.log('4. This will show the ACTUAL database state');
  }
}

// Run diagnostics
runDiagnostics().catch(console.error);