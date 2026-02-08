const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const OLD_HOST = 'api.tuckandtale.com';
const NEW_HOST = 'iolimejvugpcpnmruqww.supabase.co';

async function fixIllustrationUrls() {
  const { data: rows, error } = await supabase
    .from('content')
    .select('id, v3_illustration_status')
    .not('v3_illustration_status', 'is', null);

  if (error) {
    console.error('Error fetching content:', error.message);
    return;
  }

  console.log(`Found ${rows.length} rows with v3_illustration_status`);

  let updatedCount = 0;

  for (const row of rows) {
    const status = row.v3_illustration_status;
    let changed = false;

    if (status.cover?.imageUrl?.includes(OLD_HOST)) {
      status.cover.imageUrl = status.cover.imageUrl.replace(OLD_HOST, NEW_HOST);
      changed = true;
    }

    if (Array.isArray(status.scenes)) {
      for (const scene of status.scenes) {
        if (scene.imageUrl?.includes(OLD_HOST)) {
          scene.imageUrl = scene.imageUrl.replace(OLD_HOST, NEW_HOST);
          changed = true;
        }
      }
    }

    if (changed) {
      const { error: updateError } = await supabase
        .from('content')
        .update({ v3_illustration_status: status })
        .eq('id', row.id);

      if (updateError) {
        console.error(`Error updating row ${row.id}:`, updateError.message);
      } else {
        updatedCount++;
      }
    }
  }

  console.log(`Updated ${updatedCount} illustration rows`);
}

async function fixAvatarUrls() {
  const { data: rows, error } = await supabase
    .from('avatar_cache')
    .select('id, image_url')
    .like('image_url', `%${OLD_HOST}%`);

  if (error) {
    console.error('Error fetching avatar_cache:', error.message);
    return;
  }

  console.log(`Found ${rows.length} avatar_cache rows with old host`);

  let updatedCount = 0;

  for (const row of rows) {
    const newUrl = row.image_url.replace(OLD_HOST, NEW_HOST);
    const { error: updateError } = await supabase
      .from('avatar_cache')
      .update({ image_url: newUrl })
      .eq('id', row.id);

    if (updateError) {
      console.error(`Error updating avatar ${row.id}:`, updateError.message);
    } else {
      updatedCount++;
    }
  }

  console.log(`Updated ${updatedCount} avatar rows`);
}

async function main() {
  await fixIllustrationUrls();
  await fixAvatarUrls();
}

main();
