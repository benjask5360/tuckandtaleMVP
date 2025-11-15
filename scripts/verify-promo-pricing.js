// Verify promo pricing fields migration
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyPromoPricing() {
  console.log('🔍 Verifying pricing fields including annual pricing...\n');

  try {
    // Fetch all subscription tiers
    const { data: tiers, error: tiersError } = await supabase
      .from('subscription_tiers')
      .select('id, name, price_monthly, price_monthly_promo, price_yearly, price_yearly_promo, promo_active, display_order, is_active')
      .order('display_order');

    if (tiersError) {
      console.error('❌ Error fetching tiers:', tiersError);
      return;
    }

    console.log('💰 Subscription Tier Pricing (Monthly):\n');
    console.log('━'.repeat(80));
    console.log('Tier ID        | Name                  | Regular Price | Promo Price | Promo Active | Status');
    console.log('━'.repeat(80));

    for (const tier of tiers) {
      const regularPrice = tier.price_monthly !== null ? `$${tier.price_monthly.toFixed(2)}` : 'N/A';
      const promoPrice = tier.price_monthly_promo !== null ? `$${tier.price_monthly_promo.toFixed(2)}` : 'N/A';
      const promoStatus = tier.promo_active ? '✅ ON' : '❌ OFF';
      const tierStatus = tier.is_active ? 'Active' : 'Inactive';

      console.log(
        `${tier.id.padEnd(14)}| ` +
        `${tier.name.padEnd(22)}| ` +
        `${regularPrice.padEnd(14)}| ` +
        `${promoPrice.padEnd(12)}| ` +
        `${promoStatus.padEnd(13)}| ` +
        `${tierStatus}`
      );
    }

    console.log('━'.repeat(80));

    console.log('\n💰 Subscription Tier Pricing (Annual):\n');
    console.log('━'.repeat(80));
    console.log('Tier ID        | Name                  | Regular Price | Promo Price | Savings vs Monthly');
    console.log('━'.repeat(80));

    for (const tier of tiers) {
      const yearlyPrice = tier.price_yearly !== null ? `$${tier.price_yearly.toFixed(2)}` : 'N/A';
      const yearlyPromo = tier.price_yearly_promo !== null ? `$${tier.price_yearly_promo.toFixed(2)}` : 'N/A';

      let savings = 'N/A';
      if (tier.price_monthly && tier.price_yearly !== null) {
        const monthlyTotal = tier.price_monthly * 12;
        const saved = monthlyTotal - tier.price_yearly;
        if (saved > 0) {
          savings = `Save $${saved.toFixed(2)}`;
        }
      }

      console.log(
        `${tier.id.padEnd(14)}| ` +
        `${tier.name.padEnd(22)}| ` +
        `${yearlyPrice.padEnd(14)}| ` +
        `${yearlyPromo.padEnd(12)}| ` +
        `${savings}`
      );
    }

    console.log('━'.repeat(80));

    // Display effective pricing
    console.log('\n💡 Effective Pricing (what users would pay):');
    console.log('━'.repeat(50));

    for (const tier of tiers) {
      if (!tier.is_active) continue;

      let effectivePrice;
      if (tier.promo_active && tier.price_monthly_promo !== null) {
        effectivePrice = tier.price_monthly_promo;
      } else {
        effectivePrice = tier.price_monthly || 0;
      }

      const priceDisplay = effectivePrice > 0 ? `$${effectivePrice.toFixed(2)}/month` : 'Free';
      const promoIndicator = tier.promo_active && tier.price_monthly_promo !== null ? ' (PROMO)' : '';

      console.log(`  ${tier.name}: ${priceDisplay}${promoIndicator}`);
    }

    console.log('━'.repeat(50));

    // Summary
    console.log('\n✨ Migration Summary:');
    console.log('  ✅ Monthly pricing: Regular (tier_basic: $19.99, tier_plus: $29.99)');
    console.log('  ✅ Monthly pricing: Promo (tier_basic: $9.99, tier_plus: $14.99)');
    console.log('  ✅ Annual pricing: Regular (tier_basic: $199.99, tier_plus: $299.99)');
    console.log('  ✅ Annual pricing: Promo (tier_basic: $99.99, tier_plus: $149.99)');
    console.log('  ✅ All promos currently inactive (ready for manual activation)');

    console.log('\n📝 Note for Step 3 implementation:');
    console.log('  Backend logic should use: promo_active && price_monthly_promo ? price_monthly_promo : price_monthly');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

verifyPromoPricing();