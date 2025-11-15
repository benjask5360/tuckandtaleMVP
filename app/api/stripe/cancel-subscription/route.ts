import { createClient } from '@/lib/supabase/server';
import { StripeService } from '@/lib/services/stripe-service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Cancel subscription
    const result = await StripeService.cancelSubscription(user.id);

    return NextResponse.json({
      success: result.success,
      message: 'Subscription will be canceled at the end of the billing period'
    });
  } catch (error: any) {
    console.error('Cancel subscription error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}