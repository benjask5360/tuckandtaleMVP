'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import PricingCard from '@/components/subscription/PricingCard';
import type { SubscriptionTier } from '@/lib/types/subscription-types';
import { Sparkles, Shield, Zap, ArrowRight, Heart, Check } from 'lucide-react';

export default function PricingPage() {
  const router = useRouter();
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [currentTierId, setCurrentTierId] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
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
        .eq('is_active', true)
        .order('display_order', { ascending: true });

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading pricing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white py-12 md:py-20">
        <div className="absolute inset-0 bg-gradient-primary opacity-100"></div>
        <div className="container-narrow px-4 md:px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-display font-bold text-3xl md:text-5xl lg:text-6xl mb-4 md:mb-6 text-white">
              Choose Your Plan
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl text-white/90 leading-relaxed">
              Create magical bedtime stories for your little ones. Start free, upgrade anytime.
            </p>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-8 bg-white border-b border-gray-200">
        <div className="container-narrow">
          <div className="flex justify-center gap-8 flex-wrap">
            <div className="flex items-center gap-2 text-gray-700">
              <Shield className="w-5 h-5 text-green-600" />
              <span className="text-sm">Secure payments</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Zap className="w-5 h-5 text-yellow-600" />
              <span className="text-sm">Instant activation</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Sparkles className="w-5 h-5 text-primary-600" />
              <span className="text-sm">Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Holiday Promotional Banner */}
      {tiers.some(t => t.promo_active) && (
        <section className="py-6 bg-gray-50">
          <div className="container-narrow">
            <div className="bg-gradient-to-r from-red-50 via-orange-50 to-amber-50 border-2 border-orange-200 rounded-2xl px-6 py-4 md:px-8 md:py-5 text-center shadow-lg">
              <p className="text-lg md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-orange-600 to-amber-600">
                🎁 Limited-Time Holiday Offer — Save 50% on Starlight & Supernova
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Pricing Cards Section */}
      <section className="section-padding py-16">
        <div className="container-narrow">
          {/* Billing Period Toggle */}
          <div className="flex flex-col items-center mb-12">
            <div className="inline-flex items-center gap-2 bg-gray-100 rounded-xl p-1.5 shadow-sm">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-6 py-3 rounded-lg text-sm font-semibold transition-all ${
                  billingPeriod === 'monthly'
                    ? 'bg-white text-gray-900 shadow-md'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={`px-6 py-3 rounded-lg text-sm font-semibold transition-all ${
                  billingPeriod === 'yearly'
                    ? 'bg-white text-gray-900 shadow-md'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Annual
              </button>
            </div>
            {billingPeriod === 'yearly' && (
              <p className="mt-3 text-sm text-green-600 font-semibold">
                Save 2 months with annual billing 🎉
              </p>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
            {tiers.map((tier) => {
              const isCurrentPlan = tier.id === currentTierId;
              const isPopular = tier.id === 'tier_basic'; // Starlight is most popular

              return (
                <PricingCard
                  key={tier.id}
                  tier={tier}
                  billingPeriod={billingPeriod}
                  isCurrentPlan={isCurrentPlan}
                  isPopular={isPopular}
                  onSelectPlan={handleSelectPlan}
                />
              );
            })}
          </div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="section-padding py-16 bg-white">
        <div className="container-narrow">
          <div className="max-w-6xl mx-auto">
            <h2 className="font-display font-bold text-3xl md:text-4xl text-gray-900 mb-8 text-center">
              Compare Features
            </h2>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left p-4 font-semibold text-gray-900 rounded-tl-xl">Feature</th>
                    <th className="text-center p-4 font-semibold text-gray-900">Moonlight</th>
                    <th className="text-center p-4 font-semibold text-gray-900 bg-gradient-to-br from-sky-50 to-primary-50 border-x-2 border-primary-200">Starlight</th>
                    <th className="text-center p-4 font-semibold text-gray-900 rounded-tr-xl">Supernova</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr className="hover:bg-gray-50">
                    <td className="p-4 text-gray-700">Illustrated stories/month</td>
                    <td className="p-4 text-center text-gray-900">3 total</td>
                    <td className="p-4 text-center text-gray-900 bg-gradient-to-br from-sky-50/30 to-primary-50/30 border-x-2 border-primary-200">20</td>
                    <td className="p-4 text-center text-gray-900">40</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="p-4 text-gray-700">Text-only stories/month</td>
                    <td className="p-4 text-center text-gray-900">5</td>
                    <td className="p-4 text-center text-gray-900 bg-gradient-to-br from-sky-50/30 to-primary-50/30 border-x-2 border-primary-200">50</td>
                    <td className="p-4 text-center text-gray-900">100</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="p-4 text-gray-700">Child profiles</td>
                    <td className="p-4 text-center text-gray-900">1</td>
                    <td className="p-4 text-center text-gray-900 bg-gradient-to-br from-sky-50/30 to-primary-50/30 border-x-2 border-primary-200">3</td>
                    <td className="p-4 text-center text-gray-900">10</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="p-4 text-gray-700">Storybook characters</td>
                    <td className="p-4 text-center text-gray-900">1</td>
                    <td className="p-4 text-center text-gray-900 bg-gradient-to-br from-sky-50/30 to-primary-50/30 border-x-2 border-primary-200">5</td>
                    <td className="p-4 text-center text-gray-900">20</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="p-4 text-gray-700">Pets & magical creatures</td>
                    <td className="p-4 text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center bg-gradient-to-br from-sky-50/30 to-primary-50/30 border-x-2 border-primary-200"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center text-gray-900">Unlimited</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="p-4 text-gray-700">Growth stories</td>
                    <td className="p-4 text-center text-gray-400">—</td>
                    <td className="p-4 text-center bg-gradient-to-br from-sky-50/30 to-primary-50/30 border-x-2 border-primary-200"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="p-4 text-gray-700">Genres & writing styles</td>
                    <td className="p-4 text-center text-gray-400">—</td>
                    <td className="p-4 text-center bg-gradient-to-br from-sky-50/30 to-primary-50/30 border-x-2 border-primary-200"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="p-4 text-gray-700">Story library & favorites</td>
                    <td className="p-4 text-center text-gray-400">—</td>
                    <td className="p-4 text-center bg-gradient-to-br from-sky-50/30 to-primary-50/30 border-x-2 border-primary-200"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="p-4 text-gray-700">Advanced customization</td>
                    <td className="p-4 text-center text-gray-400">—</td>
                    <td className="p-4 text-center bg-gradient-to-br from-sky-50/30 to-primary-50/30 border-x-2 border-primary-200"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="p-4 text-gray-700">Early access to new features</td>
                    <td className="p-4 text-center text-gray-400">—</td>
                    <td className="p-4 text-center bg-gradient-to-br from-sky-50/30 to-primary-50/30 border-x-2 border-primary-200 text-gray-400">—</td>
                    <td className="p-4 text-center"><Check className="w-5 h-5 text-green-600 mx-auto" /></td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="p-4 text-gray-700 rounded-bl-xl">Support level</td>
                    <td className="p-4 text-center text-gray-900">Standard</td>
                    <td className="p-4 text-center text-gray-900 bg-gradient-to-br from-sky-50/30 to-primary-50/30 border-x-2 border-primary-200">Priority</td>
                    <td className="p-4 text-center text-gray-900 rounded-br-xl">Premium</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Mobile Accordion */}
            <div className="md:hidden space-y-4">
              {tiers.filter(t => t.id !== 'tier_premium').map((tier) => (
                <div key={tier.id} className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
                  <div className={`p-4 ${tier.id === 'tier_basic' ? 'bg-gradient-to-br from-sky-50 to-primary-50' : 'bg-gray-50'}`}>
                    <h3 className="font-semibold text-lg text-gray-900">{tier.name}</h3>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">Illustrated stories</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {tier.id === 'tier_free' ? '3 total' : `${tier.illustrated_limit_month}/month`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">Text stories</span>
                      <span className="text-sm font-semibold text-gray-900">{tier.text_limit_month}/month</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">Child profiles</span>
                      <span className="text-sm font-semibold text-gray-900">{tier.child_profiles}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">Characters</span>
                      <span className="text-sm font-semibold text-gray-900">{tier.other_character_profiles}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">Growth stories</span>
                      {tier.allow_growth_stories ? <Check className="w-5 h-5 text-green-600" /> : <span className="text-gray-400">—</span>}
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">Genres & styles</span>
                      {tier.allow_genres ? <Check className="w-5 h-5 text-green-600" /> : <span className="text-gray-400">—</span>}
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">Story library</span>
                      {tier.allow_library ? <Check className="w-5 h-5 text-green-600" /> : <span className="text-gray-400">—</span>}
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">Early access</span>
                      {tier.early_access ? <Check className="w-5 h-5 text-green-600" /> : <span className="text-gray-400">—</span>}
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-gray-600">Support</span>
                      <span className="text-sm font-semibold text-gray-900">{tier.support_level}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="section-padding py-16 bg-white">
        <div className="container-narrow">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-display font-bold text-3xl md:text-4xl text-gray-900 mb-8 text-center">
              Frequently Asked Questions
            </h2>
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-2xl p-6 md:p-8">
                <h3 className="font-semibold text-xl text-gray-900 mb-2">
                  Can I change plans later?
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately for upgrades, and at the end of your billing period for downgrades.
                </p>
              </div>

              <div className="bg-gray-50 rounded-2xl p-6 md:p-8">
                <h3 className="font-semibold text-xl text-gray-900 mb-2">
                  What happens if I go over my story limit?
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  If you reach your illustrated story limit, you can still create unlimited text-only stories. You can also upgrade your plan to get more illustrated stories.
                </p>
              </div>

              <div className="bg-gray-50 rounded-2xl p-6 md:p-8">
                <h3 className="font-semibold text-xl text-gray-900 mb-2">
                  Is there a free trial?
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Our Moonlight (Free) plan is always free! You can create up to 3 illustrated stories total and 5 text stories every month to try out the platform.
                </p>
              </div>

              <div className="bg-gray-50 rounded-2xl p-6 md:p-8">
                <h3 className="font-semibold text-xl text-gray-900 mb-2">
                  How much do I save with annual billing?
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Annual plans save you the equivalent of 2 months free! With our current holiday promotion, Starlight annual is $99.99/year (just $8.33/month) instead of $119.88 billed monthly. Supernova annual is $149.99/year ($12.50/month) instead of $179.88 monthly. Plus, you get all the same features with the convenience of one simple yearly payment.
                </p>
              </div>

              <div className="bg-gray-50 rounded-2xl p-6 md:p-8">
                <h3 className="font-semibold text-xl text-gray-900 mb-2">
                  What payment methods do you accept?
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  We accept all major credit and debit cards through our secure payment processor, Stripe. Your payment information is never stored on our servers.
                </p>
              </div>

              <div className="bg-gray-50 rounded-2xl p-6 md:p-8">
                <h3 className="font-semibold text-xl text-gray-900 mb-2">
                  Can I cancel my subscription?
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Yes, you can cancel your subscription at any time from your account settings. You'll continue to have access until the end of your billing period.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding py-16">
        <div className="container-narrow">
          <Link href="/auth/login" className="block">
            <div className="bg-gradient-primary rounded-3xl p-8 md:p-12 text-center text-white cursor-pointer hover:opacity-95 transition-opacity">
              <h2 className="font-display font-bold text-3xl md:text-4xl mb-4 text-white">
                Ready to Create Magic?
              </h2>
              <p className="text-xl text-white mb-8 max-w-2xl mx-auto">
                Join thousands of families creating personalized stories that inspire and delight.
              </p>
              <div className="inline-flex items-center gap-2 bg-white text-primary-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-colors">
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-white border-t border-gray-200 mt-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col items-center gap-6 text-sm">
            <p className="flex flex-wrap items-center justify-center gap-2 text-lg text-gray-700 text-center">
              Made with <Heart className="w-5 h-5 fill-red-500 text-red-500 animate-pulse-soft" /> for little dreamers everywhere
            </p>
            <div className="flex flex-col md:flex-row justify-between items-center w-full gap-6">
              <p className="text-center md:text-left text-gray-500">© 2024 Tuck and Tale™. All rights reserved.</p>
              <nav className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-row gap-x-8 gap-y-4 text-center md:text-left text-gray-600">
                <a href="/about" className="hover:text-primary-600 transition-colors">About</a>
                <a href="/pricing" className="hover:text-primary-600 transition-colors">Pricing</a>
                <a href="/contact" className="hover:text-primary-600 transition-colors">Contact Us</a>
                <a href="/faq" className="hover:text-primary-600 transition-colors">FAQ</a>
                <a href="/founder-parents" className="hover:text-primary-600 transition-colors">Founder Parents</a>
                <a href="/privacy" className="hover:text-primary-600 transition-colors">Privacy Policy</a>
                <a href="/terms" className="hover:text-primary-600 transition-colors">Terms of Service</a>
              </nav>
            </div>
          </div>
        </div>
      </footer>

      {/* Processing Overlay */}
      {processingCheckout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-sm text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
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
