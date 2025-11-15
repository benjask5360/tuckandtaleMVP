'use client';

import { useState } from 'react';

export default function TestStripePage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const testCheckout = async (tierId: string, period: 'monthly' | 'yearly') => {
    setLoading(true);
    setMessage('Creating checkout session...');

    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tierId,
          billingPeriod: period,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Redirecting to Stripe Checkout...');
        // Redirect to Stripe Checkout
        if (data.url) {
          window.location.href = data.url;
        } else {
          setMessage('Error: No checkout URL received');
        }
      } else {
        setMessage(`Error: ${data.error || 'Failed to create checkout session'}`);
      }
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testBillingPortal = async () => {
    setLoading(true);
    setMessage('Creating billing portal session...');

    try {
      const response = await fetch('/api/stripe/billing-portal', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Redirecting to Billing Portal...');
        if (data.url) {
          window.location.href = data.url;
        } else {
          setMessage('Error: No portal URL received');
        }
      } else {
        setMessage(`Error: ${data.error || 'Failed to create billing portal'}`);
      }
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Stripe Integration Test Page</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Prerequisites</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li>You must be logged in</li>
            <li>Stripe must be in test mode</li>
            <li>Use test card: 4242 4242 4242 4242</li>
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Checkout Sessions</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded p-4">
              <h3 className="font-semibold mb-3">Starlight (tier_basic)</h3>
              <div className="space-y-2">
                <button
                  onClick={() => testCheckout('tier_basic', 'monthly')}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  Monthly - $19.95
                  <span className="text-sm block">Promo: $9.95</span>
                </button>
                <button
                  onClick={() => testCheckout('tier_basic', 'yearly')}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  Yearly - $149.95
                  <span className="text-sm block">Promo: $99.95</span>
                </button>
              </div>
            </div>

            <div className="border rounded p-4">
              <h3 className="font-semibold mb-3">Supernova (tier_plus)</h3>
              <div className="space-y-2">
                <button
                  onClick={() => testCheckout('tier_plus', 'monthly')}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
                >
                  Monthly - $29.95
                  <span className="text-sm block">Promo: $14.95</span>
                </button>
                <button
                  onClick={() => testCheckout('tier_plus', 'yearly')}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
                >
                  Yearly - $249.95
                  <span className="text-sm block">Promo: $149.95</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Billing Portal</h2>
          <button
            onClick={testBillingPortal}
            disabled={loading}
            className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            Open Billing Portal
          </button>
          <p className="text-sm text-gray-600 mt-2">
            Only works if you have an existing Stripe customer ID
          </p>
        </div>

        {message && (
          <div className={`mt-6 p-4 rounded ${
            message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
          }`}>
            {message}
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-6">
          <h3 className="font-semibold mb-2">🧪 Testing Webhooks</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Open terminal: <code className="bg-gray-100 px-2 py-1 rounded">stripe listen --forward-to localhost:3000/api/stripe/webhook</code></li>
            <li>Copy the webhook secret (whsec_...) to .env.local</li>
            <li>Click a checkout button above and complete payment</li>
            <li>Check terminal for webhook events</li>
            <li>Verify with: <code className="bg-gray-100 px-2 py-1 rounded">node scripts/verify-webhook.js</code></li>
          </ol>
        </div>
      </div>
    </div>
  );
}