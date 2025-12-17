import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@/lib/supabase/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    // Validate required fields
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Get user agent and IP for metadata
    const userAgent = request.headers.get('user-agent') || undefined;
    const ipAddress = request.headers.get('x-forwarded-for') ||
                      request.headers.get('x-real-ip') ||
                      undefined;

    // Initialize Supabase client
    const supabase = await createClient();

    // Check if email already exists
    const { data: existing } = await supabase
      .from('waitlist_therapistbacked')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      // Email already on waitlist, return success without sending another email
      return NextResponse.json(
        { success: true, message: 'You\'re already on the list!' },
        { status: 200 }
      );
    }

    // Send notification email to hello@tuckandtale.com
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
            .field { margin-bottom: 20px; }
            .field-label { font-weight: bold; color: #4b5563; margin-bottom: 5px; }
            .field-value { background: white; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0;">New Waitlist Signup - Therapist-Backed Stories</h2>
            </div>
            <div class="content">
              <div class="field">
                <div class="field-label">Email:</div>
                <div class="field-value"><a href="mailto:${email}">${email}</a></div>
              </div>

              <div class="field">
                <div class="field-label">Signed Up At:</div>
                <div class="field-value">${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET</div>
              </div>

              ${userAgent ? `<div class="footer">User Agent: ${userAgent}</div>` : ''}
              ${ipAddress ? `<div class="footer">IP Address: ${ipAddress}</div>` : ''}
            </div>
          </div>
        </body>
      </html>
    `;

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Tuck & Tale <therapist@send.tuckandtale.com>',
      to: ['hello@tuckandtale.com'],
      subject: `New Waitlist Signup: ${email}`,
      html: emailHtml,
    });

    if (emailError) {
      console.error('Error sending notification email:', emailError);
      // Continue even if email fails - we still want to save to database
    }

    // Store signup in database
    const { error: dbError } = await supabase
      .from('waitlist_therapistbacked')
      .insert({
        email,
        notification_sent: !emailError,
        notification_sent_at: !emailError ? new Date().toISOString() : null,
        resend_message_id: emailData?.id || null,
        user_agent: userAgent,
        ip_address: ipAddress,
      });

    if (dbError) {
      // Check if it's a unique constraint violation (duplicate email)
      if (dbError.code === '23505') {
        return NextResponse.json(
          { success: true, message: 'You\'re already on the list!' },
          { status: 200 }
        );
      }
      console.error('Error saving to database:', dbError);
      throw new Error('Failed to save to waitlist');
    }

    return NextResponse.json(
      { success: true, message: 'You\'re on the list!' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error processing waitlist signup:', error);
    return NextResponse.json(
      { error: 'Failed to join waitlist. Please try again.' },
      { status: 500 }
    );
  }
}
