import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Sentinel UUID for deleted users (instead of NULL for better analytics)
const DELETED_USER_ID = '00000000-0000-0000-0000-000000000001';

// Error types for different deletion phases
type DeletionPhase =
  | 'validation'
  | 'stripe_cleanup'
  | 'anonymize_business_data'
  | 'delete_content'
  | 'delete_storage'
  | 'create_audit'
  | 'delete_auth_user';

interface DeletionError {
  phase: DeletionPhase;
  error: string;
  fatal: boolean;
}

export async function DELETE() {
  const errors: DeletionError[] = [];

  try {
    const supabase = await createClient();

    // =================================================================
    // PHASE 1: VALIDATION
    // =================================================================
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

    // Get user profile
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

    // Collect pre-deletion statistics for audit log
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
    // PHASE 2: STRIPE CLEANUP (Keep customer, remove payment methods)
    // =================================================================
    let stripeCleanupSuccessful = false;

    if (profile.stripe_customer_id) {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
          apiVersion: '2025-10-29.clover',
        });

        // Cancel active or trialing subscription
        if (profile.stripe_subscription_id && (profile.subscription_status === 'active' || profile.subscription_status === 'trialing')) {
          try {
            await stripe.subscriptions.cancel(profile.stripe_subscription_id);
            console.log(`Canceled Stripe subscription: ${profile.stripe_subscription_id}`);
          } catch (subError) {
            errors.push({
              phase: 'stripe_cleanup',
              error: `Failed to cancel subscription: ${subError}`,
              fatal: false
            });
          }
        }

        // Detach all payment methods from customer
        try {
          const paymentMethods = await stripe.paymentMethods.list({
            customer: profile.stripe_customer_id,
            limit: 100
          });

          for (const method of paymentMethods.data) {
            await stripe.paymentMethods.detach(method.id);
            console.log(`Detached payment method: ${method.id}`);
          }
        } catch (pmError) {
          errors.push({
            phase: 'stripe_cleanup',
            error: `Failed to detach payment methods: ${pmError}`,
            fatal: false
          });
        }

        // Update customer description to indicate deletion
        try {
          await stripe.customers.update(profile.stripe_customer_id, {
            description: `Account Deleted - ${new Date().toISOString()}`,
            metadata: {
              deleted_at: new Date().toISOString(),
              deleted_user_id: userId
            }
          });
          stripeCleanupSuccessful = true;
        } catch (updateError) {
          errors.push({
            phase: 'stripe_cleanup',
            error: `Failed to update customer record: ${updateError}`,
            fatal: false
          });
        }
      } catch (stripeError) {
        errors.push({
          phase: 'stripe_cleanup',
          error: `Stripe initialization error: ${stripeError}`,
          fatal: false
        });
      }
    }

    // =================================================================
    // PHASE 3: ANONYMIZE BUSINESS-CRITICAL DATA
    // =================================================================

    // Anonymize api_cost_logs (preserve for accounting, remove PII)
    try {
      await adminClient
        .from('api_cost_logs')
        .update({
          user_id: DELETED_USER_ID,
          prompt_used: null, // Remove prompts that might contain child names
          character_profile_id: null, // Will be deleted anyway
          content_id: null // Will be deleted anyway
        })
        .eq('user_id', userId);
      console.log('Anonymized API cost logs');
    } catch (apiLogError) {
      errors.push({
        phase: 'anonymize_business_data',
        error: `Failed to anonymize API logs: ${apiLogError}`,
        fatal: false
      });
    }

    // Anonymize contact_submissions (mask PII fields)
    try {
      await adminClient
        .from('contact_submissions')
        .update({
          user_id: DELETED_USER_ID,
          email: 'deleted-user@anonymous.local',
          name: '[REDACTED]'
          // Keep subject and message for support history
        })
        .eq('user_id', userId);
      console.log('Anonymized contact submissions');
    } catch (contactError) {
      errors.push({
        phase: 'anonymize_business_data',
        error: `Failed to anonymize contact submissions: ${contactError}`,
        fatal: false
      });
    }

    // =================================================================
    // PHASE 4: DELETE ALL CONTENT (Contains child names - COPPA requirement)
    // =================================================================

    // Delete all user content (cascades to content_characters, illustrations, panels)
    try {
      const { error: deleteContentError } = await adminClient
        .from('content')
        .delete()
        .eq('user_id', userId);

      if (deleteContentError) throw deleteContentError;
      console.log(`Deleted ${numStories || 0} stories and related content`);
    } catch (contentError) {
      errors.push({
        phase: 'delete_content',
        error: `Failed to delete content: ${contentError}`,
        fatal: true // This is critical for COPPA compliance
      });

      // If we can't delete content with child names, abort
      return NextResponse.json(
        {
          error: 'Failed to delete user content. Deletion aborted for safety.',
          details: errors
        },
        { status: 500 }
      );
    }

    // Delete reviews (user opinions)
    try {
      const { error: deleteReviewsError } = await adminClient
        .from('reviews')
        .delete()
        .eq('user_id', userId);

      if (deleteReviewsError) throw deleteReviewsError;
      console.log('Deleted user reviews');
    } catch (reviewError) {
      errors.push({
        phase: 'delete_content',
        error: `Failed to delete reviews: ${reviewError}`,
        fatal: false
      });
    }

    // =================================================================
    // PHASE 5: DELETE STORAGE FILES
    // =================================================================

    // Delete main avatar files
    try {
      const { data: avatarFiles } = await adminClient
        .storage
        .from('avatars')
        .list(userId);

      if (avatarFiles && avatarFiles.length > 0) {
        const filePaths = avatarFiles.map(obj => `${userId}/${obj.name}`);
        const { error: removeError } = await adminClient.storage
          .from('avatars')
          .remove(filePaths);

        if (removeError) throw removeError;
        console.log(`Deleted ${avatarFiles.length} avatar files`);
      }
    } catch (storageError) {
      errors.push({
        phase: 'delete_storage',
        error: `Failed to delete avatar files: ${storageError}`,
        fatal: false
      });
    }

    // Delete preview avatar files
    try {
      const { data: previewFiles } = await adminClient
        .storage
        .from('avatars')
        .list(`previews/${userId}`);

      if (previewFiles && previewFiles.length > 0) {
        const previewPaths = previewFiles.map(obj => `previews/${userId}/${obj.name}`);
        const { error: removePreviewError } = await adminClient.storage
          .from('avatars')
          .remove(previewPaths);

        if (removePreviewError) throw removePreviewError;
        console.log(`Deleted ${previewFiles.length} preview files`);
      }
    } catch (previewError) {
      errors.push({
        phase: 'delete_storage',
        error: `Failed to delete preview files: ${previewError}`,
        fatal: false
      });
    }

    // =================================================================
    // PHASE 6: CREATE AUDIT RECORD
    // =================================================================

    try {
      await adminClient
        .from('account_deletions')
        .insert({
          user_id: userId,
          user_email: userEmail,
          deletion_type: 'user_requested',
          deleted_by: null, // Self-service deletion
          stripe_customer_id: profile.stripe_customer_id,
          had_active_subscription: profile.subscription_status === 'active' || profile.subscription_status === 'trialing',
          metadata: {
            num_characters: numCharacters || 0,
            num_stories: numStories || 0,
            num_avatars: numAvatars || 0,
            stripe_cleanup_successful: stripeCleanupSuccessful,
            errors: errors.length > 0 ? errors : undefined
          }
        });
      console.log('Created audit record');
    } catch (auditError) {
      // If we can't create an audit record, abort deletion
      return NextResponse.json(
        {
          error: 'Failed to create audit record. Deletion aborted.',
          details: `${auditError}`
        },
        { status: 500 }
      );
    }

    // =================================================================
    // PHASE 7: DELETE AUTH USER (Triggers CASCADE deletes)
    // =================================================================

    // This will automatically CASCADE delete:
    // - user_profiles
    // - character_profiles (and avatar_cache via CASCADE)
    // - generation_usage
    // - all auth.* session data
    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      // Log the failure in a special audit record
      await adminClient
        .from('account_deletions')
        .insert({
          user_id: userId,
          user_email: userEmail,
          deletion_type: 'failed',
          deleted_by: null,
          stripe_customer_id: profile.stripe_customer_id,
          had_active_subscription: profile.subscription_status === 'active' || profile.subscription_status === 'trialing',
          metadata: {
            failure_reason: `Auth deletion failed: ${deleteAuthError}`,
            partial_completion: true,
            completed_phases: ['validation', 'stripe_cleanup', 'anonymize_business_data', 'delete_content', 'delete_storage', 'create_audit'],
            errors: errors
          }
        });

      console.error('Error deleting auth user:', deleteAuthError);
      return NextResponse.json(
        {
          error: 'Failed to complete account deletion',
          details: 'Partial deletion completed. Contact support for assistance.'
        },
        { status: 500 }
      );
    }

    console.log(`Successfully deleted account for user: ${userEmail} (${userId})`);

    // Return success with any non-fatal warnings
    const response: any = {
      success: true,
      message: 'Account successfully deleted'
    };

    if (errors.length > 0) {
      response.warnings = errors.filter(e => !e.fatal);
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Unexpected error in DELETE /api/user/delete-account:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? `${error}` : undefined
      },
      { status: 500 }
    );
  }
}