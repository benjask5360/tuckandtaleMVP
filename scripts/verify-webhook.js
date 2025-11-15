// Verify webhook processing results
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyWebhookProcessing(userEmail) {
  console.log('🔍 Verifying Webhook Processing\n');
  console.log('━'.repeat(50));

  try {
    // Find user by email
    let query = supabase
      .from('user_profiles')
      .select(`
        id,
        email,
        subscription_tier_id,
        stripe_customer_id,
        stripe_subscription_id,
        subscription_status,
        subscription_starts_at,
        subscription_ends_at,
        subscription_tiers (
          id,
          name
        )
      `);

    if (userEmail) {
      query = query.eq('email', userEmail);
    } else {
      // Get all users with Stripe subscriptions
      query = query.not('stripe_subscription_id', 'is', null);
    }

    const { data: users, error } = await query;

    if (error) {
      console.error('❌ Error fetching users:', error);
      return;
    }

    if (!users || users.length === 0) {
      console.log('No users with Stripe subscriptions found');
      if (userEmail) {
        console.log(`\nUser ${userEmail} not found or has no subscription`);
      }
      return;
    }

    console.log(`Found ${users.length} user(s) with subscription data:\n`);

    for (const user of users) {
      console.log('User:', user.email);
      console.log('─'.repeat(40));
      console.log('Tier:', user.subscription_tiers?.name || user.subscription_tier_id);
      console.log('Status:', user.subscription_status);
      console.log('Stripe Customer:', user.stripe_customer_id || 'None');
      console.log('Stripe Subscription:', user.stripe_subscription_id || 'None');

      if (user.subscription_starts_at) {
        console.log('Started:', new Date(user.subscription_starts_at).toLocaleDateString());
      }
      if (user.subscription_ends_at) {
        console.log('Ends:', new Date(user.subscription_ends_at).toLocaleDateString());
      }

      console.log('\n');
    }

    // Check for recent webhook processing
    console.log('━'.repeat(50));
    console.log('\n📊 Subscription Status Summary:');

    const { data: summary } = await supabase
      .from('user_profiles')
      .select('subscription_status')
      .not('stripe_subscription_id', 'is', null);

    if (summary) {
      const statusCounts = summary.reduce((acc, user) => {
        acc[user.subscription_status] = (acc[user.subscription_status] || 0) + 1;
        return acc;
      }, {});

      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`${status}: ${count} user(s)`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Get email from command line argument
const userEmail = process.argv[2];

if (userEmail && !userEmail.includes('@')) {
  console.log('Usage: node scripts/verify-webhook.js [email]');
  console.log('Example: node scripts/verify-webhook.js user@example.com');
  process.exit(1);
}

verifyWebhookProcessing(userEmail);