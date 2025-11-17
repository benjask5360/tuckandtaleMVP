'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { SubscriptionTier } from '@/lib/types/subscription-types';

export interface UsageStats {
  illustrated: {
    used: number;
    limit: number | null;
    lifetimeUsed: number;
    lifetimeLimit: number | null;
  };
  text: {
    used: number;
    limit: number | null;
  };
}

interface SubscriptionContextType {
  tier: SubscriptionTier | null;
  usage: UsageStats | null;
  loading: boolean;
  error: string | null;
  canUseFeature: (feature: keyof SubscriptionTier) => boolean;
  getRemainingQuota: (type: 'illustrated' | 'text') => number | null;
  isAtLimit: (type: 'illustrated' | 'text') => boolean;
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [tier, setTier] = useState<SubscriptionTier | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setTier(null);
        setUsage(null);
        return;
      }

      // Fetch tier data
      const { data: userProfile, error: tierError } = await supabase
        .from('user_profiles')
        .select(`
          subscription_tier_id,
          subscription_tiers (
            id,
            name,
            price_monthly,
            price_yearly,
            promo_active,
            illustrated_limit_total,
            illustrated_limit_month,
            text_limit_month,
            child_profiles,
            other_character_profiles,
            avatar_regenerations_month,
            allow_pets,
            allow_magical_creatures,
            allow_fun_stories,
            allow_growth_stories,
            allow_growth_areas,
            allow_genres,
            allow_writing_styles,
            allow_moral_lessons,
            allow_special_requests,
            allow_story_length,
            allow_advanced_customization,
            allow_library,
            allow_favorites
          )
        `)
        .eq('id', user.id)
        .single();

      if (tierError) throw tierError;

      // Handle subscription_tiers being an array from the join
      const tierData = Array.isArray(userProfile?.subscription_tiers)
        ? userProfile.subscription_tiers[0]
        : userProfile?.subscription_tiers;

      setTier(tierData as SubscriptionTier || null);

      // Fetch usage stats
      const response = await fetch('/api/subscription/usage');
      if (response.ok) {
        const usageData = await response.json();
        setUsage(usageData);
      }

    } catch (err: any) {
      console.error('Error fetching subscription data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionData();

    // Set up auth state listener
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchSubscriptionData();
      } else if (event === 'SIGNED_OUT') {
        setTier(null);
        setUsage(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const canUseFeature = (feature: keyof SubscriptionTier): boolean => {
    if (!tier) return false;
    const value = tier[feature];
    return typeof value === 'boolean' ? value : false;
  };

  const getRemainingQuota = (type: 'illustrated' | 'text'): number | null => {
    if (!tier || !usage) return null;

    if (type === 'illustrated') {
      const limit = tier.illustrated_limit_month;
      if (limit === null) return null; // Unlimited
      return Math.max(0, limit - usage.illustrated.used);
    } else {
      const limit = tier.text_limit_month;
      if (limit === null) return null; // Unlimited
      return Math.max(0, limit - usage.text.used);
    }
  };

  const isAtLimit = (type: 'illustrated' | 'text'): boolean => {
    if (!tier || !usage) return false;

    if (type === 'illustrated') {
      const limit = tier.illustrated_limit_month;
      if (limit === null) return false; // Unlimited
      return usage.illustrated.used >= limit;
    } else {
      const limit = tier.text_limit_month;
      if (limit === null) return false; // Unlimited
      return usage.text.used >= limit;
    }
  };

  const value: SubscriptionContextType = {
    tier,
    usage,
    loading,
    error,
    canUseFeature,
    getRemainingQuota,
    isAtLimit,
    refresh: fetchSubscriptionData,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}