const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const password = process.env.SUPABASE_DB_PASSWORD;
const projectRef = 'iolimejvugpcpnmruqww';

async function debugStory() {
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

    // Get the most recent Beta story
    const result = await client.query(`
      SELECT
        id,
        title,
        engine_version,
        cover_illustration_url,
        cover_illustration_prompt,
        story_scenes,
        created_at
      FROM content
      WHERE engine_version = 'beta'
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      console.log('❌ No Beta stories found in database');
      console.log('\nChecking for ANY stories with engine_version set:');
      const allResult = await client.query(`
        SELECT engine_version, COUNT(*) as count
        FROM content
        WHERE content_type = 'story'
        GROUP BY engine_version
      `);
      console.log(allResult.rows);
    } else {
      const story = result.rows[0];
      console.log('📖 Most Recent Beta Story:');
      console.log('='.repeat(80));
      console.log('ID:', story.id);
      console.log('Title:', story.title);
      console.log('Engine Version:', story.engine_version);
      console.log('Created:', story.created_at);
      console.log('');
      console.log('Cover URL:', story.cover_illustration_url || '❌ MISSING');
      console.log('Cover Prompt:', story.cover_illustration_prompt ? '✅ Present' : '❌ MISSING');
      console.log('');

      if (story.story_scenes) {
        console.log('Story Scenes:', story.story_scenes.length, 'scenes');
        story.story_scenes.forEach((scene, i) => {
          console.log('\nScene', i + 1, ':');
          console.log('  - Paragraph:', scene.paragraph ? scene.paragraph.substring(0, 50) + '...' : '❌ MISSING');
          console.log('  - Characters:', scene.charactersInScene ? scene.charactersInScene.join(', ') : '❌ MISSING');
          console.log('  - Illustration URL:', scene.illustrationUrl || '❌ MISSING');
          console.log('  - Illustration Prompt:', scene.illustrationPrompt ? '✅ Present' : '❌ MISSING');
        });
      } else {
        console.log('❌ Story Scenes: MISSING');
      }
      console.log('='.repeat(80));
    }

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

debugStory();
