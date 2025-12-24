// Simple API route to notify admin of new user signups
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'hello@tuckandtale.com';

export async function POST(request: Request) {
  try {
    const { email, name, userId } = await request.json();

    const signupDate = new Date().toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'short'
    });

    const { data, error: sendError } = await resend.emails.send({
      from: 'Tuck & Tale <notifications@send.tuckandtale.com>',
      to: [ADMIN_EMAIL],
      subject: `🎉 New User Signup: ${name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin: 0; padding: 40px; background: #f5f5f5; font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

            <div style="background: linear-gradient(135deg, #0c8ce9 0%, #0066cc 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 28px;">🎉 New User Signup!</h1>
            </div>

            <div style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #333; font-size: 16px;">
                A new user has joined <strong>Tuck & Tale</strong>!
              </p>

              <div style="background: #f8f9fa; border-left: 4px solid #0c8ce9; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #666; font-weight: 600;">Name:</td>
                    <td style="padding: 8px 0; color: #333; text-align: right;">${name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666; font-weight: 600;">Email:</td>
                    <td style="padding: 8px 0; text-align: right;">
                      <a href="mailto:${email}" style="color: #0c8ce9; text-decoration: none;">${email}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666; font-weight: 600;">Signup Date:</td>
                    <td style="padding: 8px 0; color: #333; text-align: right;">${signupDate}</td>
                  </tr>
                </table>
              </div>
            </div>

            <div style="padding: 20px 30px; background: #f8f9fa; text-align: center;">
              <p style="margin: 0; color: #666; font-size: 13px;">
                Automated notification from <strong>Tuck & Tale</strong>
              </p>
            </div>

          </div>
        </body>
        </html>
      `
    });

    if (sendError) {
      console.error('Resend error:', sendError);
      return NextResponse.json({ success: false, error: sendError.message }, { status: 500 });
    }

    console.log('Admin notification sent:', data);
    return NextResponse.json({ success: true, id: data?.id });
  } catch (error: any) {
    console.error('Failed to send admin notification:', error);
    // Don't fail the signup if notification fails
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
