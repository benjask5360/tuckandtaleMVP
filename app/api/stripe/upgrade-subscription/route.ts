import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { StripeService } from '@/lib/services/stripe-service';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tierId, billingPeriod } = body;

    if (!tierId || !['tier_basic', 'tier_plus'].includes(tierId)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    if (!billingPeriod || !['monthly', 'yearly'].includes(billingPeriod)) {
      return NextResponse.json({ error: 'Invalid billing period' }, { status: 400 });
    }

    const result = await StripeService.upgradeSubscription({
      userId: user.id,
      newTierId: tierId,
      billingPeriod,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Upgrade subscription error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upgrade subscription' },
      { status: 500 }
    );
  }
}
