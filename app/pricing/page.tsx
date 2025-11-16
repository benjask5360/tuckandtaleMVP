'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import PricingCard from '@/components/subscription/PricingCard';
import type { SubscriptionTier } from '@/lib/types/subscription-types';
import { Sparkles, Shield, Zap } from 'lucide-react';

export default function PricingPage() {
  const router = useRouter();
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [currentTierId, setCurrentTierId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingCheckout, setProcessingCheckout] = useState(false);

  useEffect(() => {
    loadTiersAndUser();
  }, []);

  const loadTiersAndUser = async () => {
    try {
      const supabase = createClient();

      // Get current user's tier
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('subscription_tier_id')
          .eq('user_id', user.id)
          .single();

        setCurrentTierId(profile?.subscription_tier_id || 'tier_free');
      }

      // Get all active tiers
      const { data: tiersData, error } = await supabase
        .from('subscription_tiers')
        .select('*')
        .eq('active', true)
        .order('price_monthly', { ascending: true });

      if (error) throw error;

      setTiers(tiersData || []);
    } catch (error) {
      console.error('Error loading pricing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (
    tierId: string,
    billingPeriod: 'monthly' | 'yearly'
  ) => {
    try {
      setProcessingCheckout(true);

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // Redirect to sign up
        router.push('/auth/signup?redirect=/pricing');
        return;
      }

      // If it's the free tier, just update directly
      if (tierId === 'tier_free') {
        const { error } = await supabase
          .from('user_profiles')
          .update({ subscription_tier_id: 'tier_free' })
          .eq('user_id', user.id);

        if (error) throw error;

        router.push('/dashboard');
        return;
      }

      // For paid tiers, create Stripe checkout session
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tierId,
          billingPeriod,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();

      if (url) {
        window.location.href = url;
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      alert(error.message || 'Failed to start checkout. Please try again.');
    } finally {
      setProcessingCheckout(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading pricing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Create magical bedtime stories for your little ones. Start free, upgrade anytime.
          </p>
        </div>

        {/* Trust Badges */}
        <div className="flex justify-center gap-8 mb-12 flex-wrap">
          <div className="flex items-center gap-2 text-gray-700">
            <Shield className="w-5 h-5 text-green-600" />
            <span className="text-sm">Secure payments</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <Zap className="w-5 h-5 text-yellow-600" />
            <span className="text-sm">Instant activation</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <span className="text-sm">Cancel anytime</span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-12">
          {tiers.map((tier) => {
            const isCurrentPlan = tier.id === currentTierId;
            const isPopular = tier.id === 'tier_basic'; // Starlight is most popular

            return (
              <PricingCard
                key={tier.id}
                tier={tier}
                isCurrentPlan={isCurrentPlan}
                isPopular={isPopular}
                onSelectPlan={handleSelectPlan}
              />
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">
                Can I change plans later?
              </h3>
              <p className="text-gray-600">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately for upgrades, and at the end of your billing period for downgrades.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">
                What happens if I go over my story limit?
              </h3>
              <p className="text-gray-600">
                If you reach your illustrated story limit, you can still create unlimited text-only stories. You can also upgrade your plan to get more illustrated stories.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">
                Is there a free trial?
              </h3>
              <p className="text-gray-600">
                Our Moonlight (Free) plan is always free! You can create up to 3 illustrated stories per month and 10 text stories to try out the platform.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">
                How do annual plans work?
              </h3>
              <p className="text-gray-600">
                Annual plans are billed once per year and offer significant savings compared to monthly billing. You get all the same features with a lower monthly equivalent cost.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-gray-600">
                We accept all major credit and debit cards through our secure payment processor, Stripe. Your payment information is never stored on our servers.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">
                Can I cancel my subscription?
              </h3>
              <p className="text-gray-600">
                Yes, you can cancel your subscription at any time from your account settings. You'll continue to have access until the end of your billing period.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <p className="text-gray-600">
            Have questions?{' '}
            <a
              href="mailto:support@tuckandtale.com"
              className="text-purple-600 hover:text-purple-700 font-semibold"
            >
              Contact our support team
            </a>
          </p>
        </div>
      </div>

      {/* Processing Overlay */}
      {processingCheckout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-sm text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Redirecting to checkout...
            </h3>
            <p className="text-gray-600">Please wait a moment</p>
          </div>
        </div>
      )}
    </div>
  );
}
