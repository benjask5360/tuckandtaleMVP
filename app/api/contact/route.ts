import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@/lib/supabase/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// Generate reference number in format: CS-2025-XXXXXX
function generateReferenceNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `CS-${year}-${random}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'All fields are required' },
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

    // Generate unique reference number
    const referenceNumber = generateReferenceNumber();

    // Get user agent and IP for metadata
    const userAgent = request.headers.get('user-agent') || undefined;
    const ipAddress = request.headers.get('x-forwarded-for') ||
                      request.headers.get('x-real-ip') ||
                      undefined;

    // Initialize Supabase client
    const supabase = await createClient();

    // Get current user if logged in
    const { data: { user } } = await supabase.auth.getUser();

    // Send email via Resend
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .field { margin-bottom: 20px; }
            .field-label { font-weight: bold; color: #4b5563; margin-bottom: 5px; }
            .field-value { background: white; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb; }
            .reference { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 12px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0;">New Contact Form Submission</h2>
            </div>
            <div class="content">
              <div class="reference">
                <strong>Reference Number:</strong> ${referenceNumber}
              </div>

              <div class="field">
                <div class="field-label">From:</div>
                <div class="field-value">${name}</div>
              </div>

              <div class="field">
                <div class="field-label">Email:</div>
                <div class="field-value"><a href="mailto:${email}">${email}</a></div>
              </div>

              <div class="field">
                <div class="field-label">Subject:</div>
                <div class="field-value">${subject}</div>
              </div>

              <div class="field">
                <div class="field-label">Message:</div>
                <div class="field-value">${message.replace(/\n/g, '<br>')}</div>
              </div>

              ${userAgent ? `<div class="footer">User Agent: ${userAgent}</div>` : ''}
              ${ipAddress ? `<div class="footer">IP Address: ${ipAddress}</div>` : ''}
            </div>
          </div>
        </body>
      </html>
    `;

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Tuck & Tale <hello@tuckandtale.com>',
      to: ['hello@tuckandtale.com'],
      replyTo: email,
      subject: `[${referenceNumber}] ${subject}`,
      html: emailHtml,
    });

    if (emailError) {
      console.error('Error sending email:', emailError);
      throw new Error('Failed to send email');
    }

    // Store submission in database
    const { error: dbError } = await supabase
      .from('contact_submissions')
      .insert({
        reference_number: referenceNumber,
        name,
        email,
        subject,
        message,
        user_id: user?.id || null,
        email_sent: true,
        email_sent_at: new Date().toISOString(),
        resend_message_id: emailData?.id || null,
        user_agent: userAgent,
        ip_address: ipAddress,
      });

    if (dbError) {
      console.error('Error saving to database:', dbError);
      // Don't fail the request if database insert fails, email was already sent
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Message sent successfully!',
        referenceNumber
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error processing contact form:', error);
    return NextResponse.json(
      { error: 'Failed to send message. Please try again.' },
      { status: 500 }
    );
  }
}
