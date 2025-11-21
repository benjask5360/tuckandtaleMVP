/**
 * Migration Script: Move content_characters data to generation_metadata
 *
 * This script migrates character data from the content_characters table
 * into the generation_metadata JSON field in the content table.
 *
 * The role field is intentionally dropped as it contains nonsensical mappings.
 */

const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const password = process.env.SUPABASE_DB_PASSWORD;
const projectRef = 'iolimejvugpcpnmruqww';

async function migrateContentCharacters() {
  const client = new Client({
    host: `db.${projectRef}.supabase.co`,
    port: 6543,
    user: 'postgres',
    password: password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // First, let's see what we're working with
    console.log('='.repeat(80));
    console.log('ANALYZING CONTENT_CHARACTERS TABLE');
    console.log('='.repeat(80));

    const analysisResult = await client.query(`
      SELECT
        COUNT(DISTINCT content_id) as unique_stories,
        COUNT(*) as total_character_links,
        COUNT(DISTINCT character_profile_id) as unique_characters
      FROM content_characters
      WHERE character_profile_id IS NOT NULL
    `);

    console.log('\nCurrent Data:');
    console.log(`  Stories with characters: ${analysisResult.rows[0].unique_stories}`);
    console.log(`  Total character links: ${analysisResult.rows[0].total_character_links}`);
    console.log(`  Unique characters used: ${analysisResult.rows[0].unique_characters}\n`);

    // Get all content with their characters
    const contentResult = await client.query(`
      SELECT
        c.id as content_id,
        c.title,
        c.generation_metadata,
        COALESCE(
          json_agg(
            json_build_object(
              'character_profile_id', cc.character_profile_id,
              'character_name_in_content', cc.character_name_in_content,
              'role', cc.role,
              'profile_name', cp.name,
              'profile_type', cp.character_type
            ) ORDER BY
              CASE
                WHEN cc.role = 'hero' THEN 1
                WHEN cc.role = 'sidekick' THEN 2
                WHEN cc.role = 'pet' THEN 3
                WHEN cc.role = 'friend' THEN 4
                WHEN cc.role = 'family' THEN 5
                ELSE 6
              END
          ) FILTER (WHERE cc.id IS NOT NULL),
          '[]'::json
        ) as characters
      FROM content c
      LEFT JOIN content_characters cc ON c.id = cc.content_id
      LEFT JOIN character_profiles cp ON cc.character_profile_id = cp.id
      GROUP BY c.id, c.title, c.generation_metadata
      HAVING COUNT(cc.id) > 0
      ORDER BY c.created_at DESC
    `);

    console.log('='.repeat(80));
    console.log('MIGRATING DATA TO GENERATION_METADATA');
    console.log('='.repeat(80));
    console.log(`\nProcessing ${contentResult.rows.length} content items...\n`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const content of contentResult.rows) {
      console.log(`\n📚 Processing: ${content.title || 'Untitled'}`);
      console.log(`   Content ID: ${content.content_id}`);
      console.log(`   Characters: ${content.characters.length}`);

      // Parse existing metadata or create new object
      let metadata = content.generation_metadata || {};

      // Check if characters already exist in metadata (avoid duplicates)
      if (metadata.characters && metadata.characters.length > 0) {
        console.log(`   ⏭️  Skipped - characters already in metadata`);
        skipCount++;
        continue;
      }

      // Add characters to metadata (without the problematic role field)
      metadata.characters = content.characters.map(char => ({
        character_profile_id: char.character_profile_id,
        character_name: char.character_name_in_content || char.profile_name,
        profile_type: char.profile_type
      }));

      // Update the content with new metadata
      try {
        await client.query(
          `UPDATE content
           SET generation_metadata = $1
           WHERE id = $2`,
          [JSON.stringify(metadata), content.content_id]
        );

        console.log(`   ✅ Migrated ${metadata.characters.length} characters`);
        successCount++;
      } catch (error) {
        console.error(`   ❌ Error updating: ${error.message}`);
        errorCount++;
      }
    }

    // Verify migration
    console.log('\n' + '='.repeat(80));
    console.log('MIGRATION VERIFICATION');
    console.log('='.repeat(80));

    const verifyResult = await client.query(`
      SELECT
        COUNT(*) as total_with_characters
      FROM content
      WHERE generation_metadata->>'characters' IS NOT NULL
        AND jsonb_array_length(generation_metadata->'characters') > 0
    `);

    console.log(`\nContent with characters in metadata: ${verifyResult.rows[0].total_with_characters}`);

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('MIGRATION COMPLETE');
    console.log('='.repeat(80));
    console.log(`✅ Successfully migrated: ${successCount}`);
    console.log(`⏭️  Skipped (already migrated): ${skipCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📊 Total processed: ${contentResult.rows.length}`);

    // Show sample of migrated data
    if (successCount > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('SAMPLE MIGRATED DATA');
      console.log('='.repeat(80));

      const sampleResult = await client.query(`
        SELECT
          title,
          generation_metadata->'characters' as characters
        FROM content
        WHERE generation_metadata->>'characters' IS NOT NULL
        LIMIT 3
      `);

      sampleResult.rows.forEach((row, idx) => {
        console.log(`\n${idx + 1}. ${row.title}:`);
        console.log('   Characters:', JSON.stringify(row.characters, null, 2));
      });
    }

    await client.end();
    console.log('\n✅ Database connection closed');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run migration
migrateContentCharacters();