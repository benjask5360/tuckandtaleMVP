import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
});

// Sentinel UUID for deleted users (instead of NULL for better analytics)
const DELETED_USER_ID = '00000000-0000-0000-0000-000000000001';

export async function DELETE() {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = user.id;
    const userEmail = user.email || 'unknown@email.com';
    const adminClient = createAdminClient();

    // =================================================================
    // STEP 1: Get user profile and cancel Stripe subscription
    // =================================================================
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('stripe_customer_id, stripe_subscription_id, subscription_status')
      .eq('id', userId)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Cancel Stripe subscription if active
    if (profile.stripe_subscription_id && profile.subscription_status === 'active') {
      try {
        await stripe.subscriptions.cancel(profile.stripe_subscription_id);
        console.log(`Canceled Stripe subscription: ${profile.stripe_subscription_id}`);
      } catch (stripeError) {
        console.error('Error canceling Stripe subscription:', stripeError);
        // Continue with deletion even if Stripe cancellation fails
      }
    }

    // =================================================================
    // STEP 2: Collect pre-deletion statistics for audit log
    // =================================================================
    const { count: numCharacters } = await adminClient
      .from('character_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('deleted_at', null);

    const { count: numStories } = await adminClient
      .from('content')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { data: characterIds } = await adminClient
      .from('character_profiles')
      .select('id')
      .eq('user_id', userId)
      .is('deleted_at', null);

    const characterIdList = characterIds?.map(c => c.id) || [];

    const { count: numAvatars } = characterIdList.length > 0
      ? await adminClient
          .from('avatar_cache')
          .select('*', { count: 'exact', head: true })
          .in('character_profile_id', characterIdList)
      : { count: 0 };

    // =================================================================
    // STEP 3: Anonymize data BEFORE deletion (preserve business logs)
    // =================================================================

    // Anonymize api_cost_logs (preserve for accounting)
    await adminClient
      .from('api_cost_logs')
      .update({ user_id: DELETED_USER_ID })
      .eq('user_id', userId);

    // Anonymize content (preserve for analytics)
    await adminClient
      .from('content')
      .update({
        user_id: DELETED_USER_ID,
        anonymized_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    // Anonymize contact_submissions (preserve for support)
    await adminClient
      .from('contact_submissions')
      .update({ user_id: DELETED_USER_ID })
      .eq('user_id', userId);

    // =================================================================
    // STEP 4: Delete user-generated avatars (COPPA/GDPR compliance)
    // =================================================================

    // Delete ALL avatars linked to user's characters (no identifiable child images preserved)
    if (characterIdList.length > 0) {
      const { error: deleteAvatarsError } = await adminClient
        .from('avatar_cache')
        .delete()
        .in('character_profile_id', characterIdList);

      if (deleteAvatarsError) {
        console.error('Error deleting avatars:', deleteAvatarsError);
        // Continue anyway - cascades will handle remaining cleanup
      }
    }

    // =================================================================
    // STEP 5: Delete storage objects (uploaded files)
    // =================================================================

    const { data: storageObjects } = await adminClient
      .storage
      .from('avatars') // bucket name
      .list(userId);

    if (storageObjects && storageObjects.length > 0) {
      const filePaths = storageObjects.map(obj => `${userId}/${obj.name}`);
      await adminClient.storage.from('avatars').remove(filePaths);
    }

    // =================================================================
    // STEP 6: Create audit record BEFORE deleting auth user
    // =================================================================

    await adminClient
      .from('account_deletions')
      .insert({
        user_id: userId,
        user_email: userEmail,
        deletion_type: 'user_requested',
        deleted_by: null, // Self-service deletion
        stripe_customer_id: profile.stripe_customer_id,
        had_active_subscription: profile.subscription_status === 'active',
        metadata: {
          num_characters: numCharacters || 0,
          num_stories: numStories || 0,
          num_avatars: numAvatars || 0,
        }
      });

    // =================================================================
    // STEP 7: Delete auth user (triggers CASCADE deletes)
    // =================================================================

    // This will automatically CASCADE delete:
    // - user_profiles
    // - character_profiles
    // - generation_usage
    // - all auth.* session data
    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      console.error('Error deleting auth user:', deleteAuthError);
      return NextResponse.json(
        { error: 'Failed to delete user account' },
        { status: 500 }
      );
    }

    console.log(`Successfully deleted account for user: ${userEmail} (${userId})`);

    return NextResponse.json({
      success: true,
      message: 'Account successfully deleted'
    });
  } catch (error) {
    console.error('Error in DELETE /api/user/delete-account:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
