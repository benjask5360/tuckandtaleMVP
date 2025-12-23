const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkUser() {
  // Find user
  const { data: users, error: userErr } = await supabase.auth.admin.listUsers();
  if (userErr) { console.log('User error:', userErr); return; }

  const user = users.users.find(u => u.email === 'hello@tuckandtale.com');
  if (!user) { console.log('User not found'); return; }

  console.log('User ID:', user.id);
  console.log('Email:', user.email);

  // Check user_profiles table (this is where subscription info is stored)
  const { data: profile, error: profileErr } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  console.log('\nUser Profile:', profile || 'None');
  if (profileErr) console.log('Profile error:', profileErr.message);

  // Check story count this month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data: stories, error: storyErr } = await supabase
    .from('content')
    .select('id, created_at, story_type')
    .eq('user_id', user.id)
    .gte('created_at', startOfMonth);

  console.log('\nStories this month:', stories?.length || 0);
  if (stories && stories.length > 0) {
    stories.forEach(s => {
      console.log(`  - ${s.id} (${s.story_type}) created ${s.created_at}`);
    });
  }

  // Check subscription tier if set
  if (profile && profile.subscription_tier_id) {
    const { data: tier } = await supabase
      .from('subscription_tiers')
      .select('*')
      .eq('id', profile.subscription_tier_id)
      .single();

    console.log('\nTier details:', tier);
  }
}

checkUser();
