# User Deletion Testing Guide

## Overview
This document provides comprehensive testing procedures for the user account deletion feature in the Tuck & Tale MVP application. The deletion process follows strict GDPR, CCPA, and COPPA compliance requirements.

## Test Environment Setup

### Prerequisites
1. Test Supabase project with production-like schema
2. Test Stripe account with test API keys
3. Test user accounts with various data states

### Test User Profiles

Create test users with the following configurations:

#### Test User 1: Full Data User
- Active Stripe subscription
- Multiple payment methods attached
- 3+ character profiles with child names
- 5+ stories containing character names
- Avatar images uploaded
- Preview avatars in storage
- API cost logs generated
- Contact form submissions
- Story reviews

#### Test User 2: Minimal Data User
- No Stripe customer ID
- Single character profile
- No stories
- No avatars
- No API usage

#### Test User 3: Cancelled Subscription User
- Cancelled Stripe subscription
- Payment methods still attached
- Full content and characters

## Testing Phases

### Phase 1: Pre-Deletion Validation

#### Test 1.1: Authentication Check
```bash
# Test with unauthenticated request
curl -X DELETE https://your-app.com/api/user/delete-account
# Expected: 401 Unauthorized
```

#### Test 1.2: User Profile Validation
```sql
-- Verify user profile exists
SELECT * FROM user_profiles WHERE id = 'test-user-id';
-- Record all field values for post-deletion verification
```

#### Test 1.3: Data Count Verification
```sql
-- Count all related records
SELECT
  (SELECT COUNT(*) FROM character_profiles WHERE user_id = 'test-user-id') as characters,
  (SELECT COUNT(*) FROM content WHERE user_id = 'test-user-id') as stories,
  (SELECT COUNT(*) FROM api_cost_logs WHERE user_id = 'test-user-id') as api_logs,
  (SELECT COUNT(*) FROM contact_submissions WHERE user_id = 'test-user-id') as contacts,
  (SELECT COUNT(*) FROM reviews WHERE user_id = 'test-user-id') as reviews;
```

### Phase 2: Stripe Integration Testing

#### Test 2.1: Subscription Cancellation
```javascript
// Verify subscription is cancelled
const subscription = await stripe.subscriptions.retrieve('sub_xxx');
console.assert(subscription.status === 'canceled');
```

#### Test 2.2: Payment Method Detachment
```javascript
// Verify all payment methods are detached
const paymentMethods = await stripe.paymentMethods.list({
  customer: 'cus_xxx'
});
console.assert(paymentMethods.data.length === 0);
```

#### Test 2.3: Customer Metadata Update
```javascript
// Verify customer record is updated but not deleted
const customer = await stripe.customers.retrieve('cus_xxx');
console.assert(customer.description.includes('Account Deleted'));
console.assert(customer.metadata.deleted_at);
```

### Phase 3: Data Anonymization Testing

#### Test 3.1: API Cost Logs Anonymization
```sql
-- Verify anonymization
SELECT * FROM api_cost_logs
WHERE user_id = '00000000-0000-0000-0000-000000000001'
  AND prompt_used IS NULL
  AND character_profile_id IS NULL
  AND content_id IS NULL;
-- Should return previously user-owned records
```

#### Test 3.2: Contact Submissions Anonymization
```sql
-- Verify PII masking
SELECT * FROM contact_submissions
WHERE user_id = '00000000-0000-0000-0000-000000000001'
  AND email = 'deleted-user@anonymous.local'
  AND name = '[REDACTED]';
-- Message and subject should remain intact
```

### Phase 4: Content Deletion Testing

#### Test 4.1: Content Table Deletion
```sql
-- Verify all content is deleted
SELECT COUNT(*) FROM content WHERE user_id = 'test-user-id';
-- Expected: 0

-- Verify cascaded deletions
SELECT COUNT(*) FROM content_characters WHERE content_id IN
  (SELECT id FROM content WHERE user_id = 'test-user-id');
-- Expected: 0

SELECT COUNT(*) FROM content_illustrations WHERE content_id IN
  (SELECT id FROM content WHERE user_id = 'test-user-id');
-- Expected: 0

SELECT COUNT(*) FROM vignette_panels WHERE story_id IN
  (SELECT id FROM content WHERE user_id = 'test-user-id');
-- Expected: 0
```

#### Test 4.2: Reviews Deletion
```sql
-- Verify reviews are deleted
SELECT COUNT(*) FROM reviews WHERE user_id = 'test-user-id';
-- Expected: 0
```

### Phase 5: Storage Cleanup Testing

#### Test 5.1: Avatar Files Deletion
```javascript
// Verify main avatar folder is empty
const { data: avatarFiles } = await supabase.storage
  .from('avatars')
  .list('test-user-id');
console.assert(avatarFiles.length === 0);
```

#### Test 5.2: Preview Files Deletion
```javascript
// Verify preview folder is empty
const { data: previewFiles } = await supabase.storage
  .from('avatars')
  .list('previews/test-user-id');
console.assert(previewFiles.length === 0);
```

### Phase 6: Audit Trail Testing

#### Test 6.1: Audit Record Creation
```sql
-- Verify audit record exists
SELECT * FROM account_deletions
WHERE user_id = 'test-user-id'
  AND deletion_type = 'user_requested';

-- Verify metadata contains statistics
SELECT metadata FROM account_deletions
WHERE user_id = 'test-user-id';
-- Should contain: num_characters, num_stories, num_avatars, stripe_cleanup_successful
```

### Phase 7: Final Deletion Testing

#### Test 7.1: Auth User Deletion
```sql
-- Verify auth user is deleted
SELECT * FROM auth.users WHERE id = 'test-user-id';
-- Expected: 0 rows
```

#### Test 7.2: Cascade Deletion Verification
```sql
-- Verify all cascaded tables are cleaned
SELECT COUNT(*) FROM user_profiles WHERE id = 'test-user-id';
-- Expected: 0

SELECT COUNT(*) FROM character_profiles WHERE user_id = 'test-user-id';
-- Expected: 0

SELECT COUNT(*) FROM generation_usage WHERE user_id = 'test-user-id';
-- Expected: 0

SELECT COUNT(*) FROM avatar_cache WHERE character_profile_id IN
  (SELECT id FROM character_profiles WHERE user_id = 'test-user-id');
-- Expected: 0
```

## Error Handling Tests

### Test E1: Content Deletion Failure
1. Make content table temporarily read-only
2. Attempt deletion
3. Verify deletion is aborted with appropriate error
4. Verify no partial deletion occurred

### Test E2: Audit Record Failure
1. Make account_deletions table temporarily read-only
2. Attempt deletion
3. Verify deletion is aborted before auth user deletion
4. Verify user can still log in

### Test E3: Stripe API Failure
1. Use invalid Stripe API key
2. Attempt deletion
3. Verify deletion continues with error logged
4. Verify Stripe errors appear in audit metadata

## Post-Deletion Verification Checklist

### Data That Should Be Deleted
- [ ] auth.users record
- [ ] user_profiles record
- [ ] All character_profiles records
- [ ] All content records
- [ ] All content_characters records
- [ ] All content_illustrations records
- [ ] All vignette_panels records
- [ ] All generation_usage records
- [ ] All reviews records
- [ ] All avatar_cache records
- [ ] All storage files in avatars/{user_id}/
- [ ] All storage files in previews/{user_id}/

### Data That Should Be Preserved (Anonymized)
- [ ] api_cost_logs with sentinel UUID
- [ ] contact_submissions with masked PII
- [ ] account_deletions audit record

### Business Continuity Checks
- [ ] API cost reports still calculate totals
- [ ] Support dashboard shows anonymized tickets
- [ ] No foreign key constraint violations
- [ ] No orphaned records in any table

## Compliance Verification

### GDPR Compliance
- [ ] All personally identifiable information removed
- [ ] Audit trail maintained in account_deletions
- [ ] Right to erasure fulfilled
- [ ] Data portability (export before delete) available

### CCPA Compliance
- [ ] Consumer request honored
- [ ] Deletion completed immediately
- [ ] Verification of requestor identity
- [ ] No sale of personal information

### COPPA Compliance
- [ ] All child-related data deleted
- [ ] Character names removed from all locations
- [ ] Avatar images completely deleted
- [ ] No retention of child information

## Performance Testing

### Load Test Scenarios

#### Scenario 1: User with Large Dataset
- 100+ characters
- 500+ stories
- 1000+ API log entries
- Expected completion: < 30 seconds

#### Scenario 2: Concurrent Deletions
- 5 users deleting simultaneously
- Verify no deadlocks
- Verify audit records are accurate

#### Scenario 3: Storage-Heavy User
- 50+ avatar files
- Large preview folder
- Verify storage cleanup completes

## Rollback Procedures

### If Deletion Partially Fails

1. Check audit record for completed phases
2. Manually complete remaining phases if safe
3. If auth user still exists, user can retry deletion
4. If auth user deleted but data remains, manual cleanup required

### Manual Cleanup SQL
```sql
-- Only run if auth user is already deleted but data remains

-- Set sentinel UUID for remaining business data
UPDATE api_cost_logs SET user_id = '00000000-0000-0000-0000-000000000001'
WHERE user_id = 'orphaned-user-id';

UPDATE contact_submissions
SET user_id = '00000000-0000-0000-0000-000000000001',
    email = 'deleted-user@anonymous.local',
    name = '[REDACTED]'
WHERE user_id = 'orphaned-user-id';

-- Delete remaining user data
DELETE FROM content WHERE user_id = 'orphaned-user-id';
DELETE FROM reviews WHERE user_id = 'orphaned-user-id';
DELETE FROM character_profiles WHERE user_id = 'orphaned-user-id';
DELETE FROM generation_usage WHERE user_id = 'orphaned-user-id';
DELETE FROM user_profiles WHERE id = 'orphaned-user-id';
```

## Monitoring and Alerts

### Key Metrics to Monitor
1. Deletion success rate
2. Average deletion time
3. Storage cleanup failures
4. Stripe API errors
5. Partial deletion occurrences

### Alert Triggers
- Deletion takes > 60 seconds
- Multiple failed deletions from same user
- Storage cleanup failures > 5%
- Audit record creation failures

## Test Automation

### Jest Test Suite Example
```javascript
describe('User Deletion', () => {
  let testUser;

  beforeEach(async () => {
    testUser = await createTestUserWithFullData();
  });

  afterEach(async () => {
    await cleanupTestData(testUser);
  });

  test('should delete all user data', async () => {
    const response = await deleteUser(testUser.id);
    expect(response.success).toBe(true);

    // Verify auth deletion
    const authUser = await getAuthUser(testUser.id);
    expect(authUser).toBeNull();

    // Verify content deletion
    const content = await getUserContent(testUser.id);
    expect(content.length).toBe(0);

    // Verify anonymization
    const apiLogs = await getAnonymizedApiLogs();
    expect(apiLogs.some(log => log.user_id === SENTINEL_UUID)).toBe(true);
  });

  test('should handle Stripe errors gracefully', async () => {
    mockStripeError();
    const response = await deleteUser(testUser.id);
    expect(response.success).toBe(true);
    expect(response.warnings).toContainEqual(
      expect.objectContaining({
        phase: 'stripe_cleanup',
        fatal: false
      })
    );
  });
});
```

## Security Considerations

### Authorization Tests
- [ ] User can only delete their own account
- [ ] Admin deletion uses different endpoint
- [ ] Rate limiting prevents abuse
- [ ] CSRF protection enabled

### Data Leak Prevention
- [ ] Deleted user cannot be recovered
- [ ] No PII exposed in logs
- [ ] Audit records don't contain sensitive data
- [ ] Error messages don't reveal system details

## Documentation Updates

When testing reveals issues, update:
1. This testing guide
2. API documentation
3. User-facing deletion instructions
4. Admin troubleshooting guide
5. Compliance documentation

---

Last Updated: November 2024
Version: 1.0