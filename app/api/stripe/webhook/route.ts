import { StripeService } from '@/lib/services/stripe-service';
import { NextRequest, NextResponse } from 'next/server';

// Stripe requires raw body for webhook signature verification
export async function POST(request: NextRequest) {
  try {
    // Get raw body
    const rawBody = await request.text();

    // Get Stripe signature header
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    // Handle the webhook event
    const result = await StripeService.handleWebhookEvent(rawBody, signature);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Webhook error:', error);

    // Return 400 for webhook signature errors
    if (error.message?.includes('Webhook Error')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // Return 500 for other errors
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

// Webhook endpoints must accept GET requests for Stripe to verify the endpoint
export async function GET() {
  return NextResponse.json({
    message: 'Stripe webhook endpoint is active',
    note: 'Use POST method to send webhook events'
  });
}