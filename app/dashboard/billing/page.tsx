'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSubscription } from '@/contexts/SubscriptionContext';
import TierBadge from '@/components/subscription/TierBadge';
import UsageMeter from '@/components/subscription/UsageMeter';
import {
  CreditCard,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  ExternalLink,
  ArrowRight
} from 'lucide-react';

export default function BillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tier, usage, loading: subscriptionLoading } = useSubscription();

  const [billingInfo, setBillingInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processingPortal, setProcessingPortal] = useState(false);
  const [canceledCheckout, setCanceledCheckout] = useState(false);

  useEffect(() => {
    // Check if user canceled checkout
    if (searchParams.get('canceled') === 'true') {
      setCanceledCheckout(true);
      // Clear the parameter after showing the message
      setTimeout(() => setCanceledCheckout(false), 5000);
    }

    loadBillingInfo();
  }, [searchParams]);

  const loadBillingInfo = async () => {
    try {
      const response = await fetch('/api/stripe/billing-portal');
      if (response.ok) {
        const data = await response.json();
        setBillingInfo(data);
      }
    } catch (error) {
      console.error('Error loading billing info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      setProcessingPortal(true);

      const response = await fetch('/api/stripe/billing-portal', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to create billing portal session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error: any) {
      console.error('Billing portal error:', error);
      alert(error.message || 'Failed to open billing portal. Please try again.');
    } finally {
      setProcessingPortal(false);
    }
  };

  const handleUpgrade = () => {
    router.push('/pricing');
  };

  if (loading || subscriptionLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading billing information...</p>
        </div>
      </div>
    );
  }

  const isFree = tier?.id === 'tier_free';
  const hasActiveSubscription = billingInfo?.hasSubscription;
  const subscriptionStatus = billingInfo?.subscriptionStatus;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Billing & Subscription</h1>
          <p className="text-gray-600 mt-2">
            Manage your subscription, payment methods, and billing history
          </p>
        </div>

        {/* Canceled Checkout Alert */}
        {canceledCheckout && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900">Checkout Canceled</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Your checkout was canceled. No charges were made. You can try again anytime.
              </p>
            </div>
          </div>
        )}

        {/* Current Plan Card */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Current Plan</h2>
              <div className="flex items-center gap-3">
                <TierBadge />
                {subscriptionStatus && (
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    subscriptionStatus === 'active'
                      ? 'bg-green-100 text-green-700'
                      : subscriptionStatus === 'past_due'
                      ? 'bg-yellow-100 text-yellow-700'
                      : subscriptionStatus === 'canceled'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {subscriptionStatus.charAt(0).toUpperCase() + subscriptionStatus.slice(1)}
                  </span>
                )}
              </div>
            </div>

            {!isFree && hasActiveSubscription ? (
              <button
                onClick={handleManageBilling}
                disabled={processingPortal}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {processingPortal ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Manage Billing</span>
                    <ExternalLink className="w-4 h-4" />
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleUpgrade}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all flex items-center gap-2"
              >
                <span>Upgrade Plan</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Plan Details */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Plan Features</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">
                    {tier?.illustrated_limit_month === null
                      ? 'Unlimited illustrated stories'
                      : `${tier?.illustrated_limit_month} illustrated stories/month`}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">
                    {tier?.text_limit_month === null
                      ? 'Unlimited text stories'
                      : `${tier?.text_limit_month} text stories/month`}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">
                    {tier?.child_profiles} child {tier?.child_profiles === 1 ? 'profile' : 'profiles'}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  {tier?.allow_genres ? (
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
                  )}
                  <span className={tier?.allow_genres ? 'text-gray-700' : 'text-gray-400'}>
                    Genre selection
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  {tier?.allow_story_length ? (
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
                  )}
                  <span className={tier?.allow_story_length ? 'text-gray-700' : 'text-gray-400'}>
                    Custom story length
                  </span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Usage This Month</h3>
              <div className="space-y-4">
                <UsageMeter
                  used={usage?.illustrated.used || 0}
                  limit={usage?.illustrated.limit || 0}
                  type="illustrated"
                />
                <UsageMeter
                  used={usage?.text.used || 0}
                  limit={usage?.text.limit || 0}
                  type="text"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Billing Details (if has subscription) */}
        {hasActiveSubscription && !isFree && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Billing Details</h2>

            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Billing Cycle</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Your subscription renews automatically. Manage your payment method and view invoices in the billing portal.
                  </p>
                </div>
              </div>

              <button
                onClick={handleManageBilling}
                disabled={processingPortal}
                className="w-full px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {processingPortal ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Loading Portal...</span>
                  </>
                ) : (
                  <>
                    <span>View Payment Methods & Invoices</span>
                    <ExternalLink className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Upgrade CTA (if free tier) */}
        {isFree && (
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Unlock More Stories
            </h2>
            <p className="text-gray-600 mb-6 max-w-lg mx-auto">
              Upgrade to create more illustrated stories, add multiple child profiles, and unlock advanced features like genre selection and custom story lengths.
            </p>
            <button
              onClick={handleUpgrade}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all font-semibold inline-flex items-center gap-2"
            >
              <span>View Plans</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Help Section */}
        <div className="mt-8 bg-gray-100 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-2">Need Help?</h3>
          <p className="text-sm text-gray-600 mb-4">
            Have questions about your subscription or billing?
          </p>
          <a
            href="mailto:support@tuckandtale.com"
            className="text-purple-600 hover:text-purple-700 font-semibold text-sm inline-flex items-center gap-1"
          >
            Contact Support
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
