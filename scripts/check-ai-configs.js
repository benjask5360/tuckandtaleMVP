const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const password = process.env.SUPABASE_DB_PASSWORD;
const projectRef = 'iolimejvugpcpnmruqww';

async function checkAiConfigs() {
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
    console.log('✅ Connected to database');

    // Query all distinct purpose values
    const result = await client.query('SELECT DISTINCT purpose FROM ai_configs ORDER BY purpose');
    
    console.log('\n📊 All purpose values in ai_configs table:');
    console.log('='.repeat(50));
    result.rows.forEach(row => {
      console.log('  - ' + row.purpose);
    });
    console.log('='.repeat(50));
    
    // Expected values from migration
    const expectedValues = [
      'avatar_generation',
      'story_fun',
      'story_growth',
      'story_illustration',
      'story_illustration_beta',
      'story_vignette_panorama',
      'story_vignette_narratives',
      'story_vignette_scenes'
    ];
    
    console.log('\n✅ Expected values in new constraint:');
    expectedValues.forEach(v => console.log('  - ' + v));
    
    console.log('\n⚠️ Values in database NOT in constraint:');
    const actualValues = result.rows.map(r => r.purpose);
    const missing = actualValues.filter(v => !expectedValues.includes(v));
    if (missing.length === 0) {
      console.log('  None (this is good!)');
    } else {
      missing.forEach(v => console.log('  - ' + v));
    }
    
    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkAiConfigs();
