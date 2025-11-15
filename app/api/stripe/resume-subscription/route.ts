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

    // Resume subscription
    const result = await StripeService.resumeSubscription(user.id);

    return NextResponse.json({
      success: result.success,
      message: 'Subscription has been resumed'
    });
  } catch (error: any) {
    console.error('Resume subscription error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to resume subscription' },
      { status: 500 }
    );
  }
}