# Admin Signup Notifications

Get an email notification when a new user signs up.

## Setup

1. Add your admin email to `.env.local`:
   ```
   ADMIN_NOTIFICATION_EMAIL=ben@tuckandtale.com
   ```

2. Make sure `RESEND_API_KEY` is set (already configured)

3. Done! You'll now receive an email when:
   - A new user completes signup
   - They enter their name in onboarding

## What You Get

A nicely formatted email with:
- User's name
- User's email address
- Signup date/time
- User ID (for looking them up in Supabase)

## How It Works

- When a new user completes onboarding and enters their name
- The system sends them a welcome email
- At the same time, sends you a notification email
- Both emails are sent asynchronously (non-blocking)
- Failures are logged but don't affect user experience

## Files

- `/app/api/notify-admin-signup/route.ts` - API endpoint that sends the notification
- `/app/api/user/update-name/route.ts` - Triggers the notification after name is saved
