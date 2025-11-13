import { Resend } from 'resend';
import { NextResponse } from 'next/server';

// Initialize Resend client with API key
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
  try {
    // Parse the request body
    const { email, name } = await request.json();

    // Validate required fields
    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      );
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Use your verified domain for all emails
    // Note: Domain must be verified in Resend dashboard at resend.com/domains
    const fromEmail = 'Tuck & Tale <hello@tuckandtale.com>';

    // Send the welcome email
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: `Welcome to Tuck & Tale, ${name}! ✨`,
      html: `
        <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
        <html xmlns="http://www.w3.org/1999/xhtml">
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
          <title>Welcome to Tuck & Tale</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #ffffff; font-family: Arial, Helvetica, sans-serif;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <!-- Main Container -->
                <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; max-width: 600px;">

                  <!-- Logo Header -->
                  <tr>
                    <td style="padding: 50px 40px 40px 40px;">
                      <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td align="center">
                            <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                              <tr>
                                <td width="60" style="padding-right: 8px; vertical-align: middle;">
                                  <img src="https://tuckandtale.com/images/logo.png" alt="Tuck and Tale Logo" width="60" height="60" style="display: block; border: 0;" />
                                </td>
                                <td style="vertical-align: middle; line-height: 1;">
                                  <span style="font-family: 'Playfair Display', Georgia, serif; font-size: 32px; font-weight: 800; background: linear-gradient(135deg, #36adf8 0%, #0c8ce9 50%, #0070c7 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; color: #0c8ce9;">Tuck and Tale</span>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Greeting -->
                  <tr>
                    <td style="padding: 0 40px 20px 40px;">
                      <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td style="color: #1f2937; font-size: 18px; font-weight: normal; line-height: 1.5;">
                            Hi ${name},
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Welcome Message -->
                  <tr>
                    <td style="padding: 0 40px 20px 40px;">
                      <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td style="color: #4b5563; font-size: 16px; line-height: 1.7;">
                            <strong>Welcome to Tuck & Tale — we're thrilled you're here.</strong> ✨
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Body Text -->
                  <tr>
                    <td style="padding: 0 40px 20px 40px;">
                      <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td style="color: #4b5563; font-size: 16px; line-height: 1.7;">
                            You're about to create something truly magical: personalized bedtime stories where your child becomes the hero. Every story is a moment of connection, imagination, and calm at the end of a long day.
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Steps Box -->
                  <tr>
                    <td style="padding: 0 40px 20px 40px;">
                      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 24px; overflow: hidden;">
                        <!-- Steps Title -->
                        <tr>
                          <td style="padding: 20px 20px 16px 20px; border-radius: 24px 24px 0 0;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                              <tr>
                                <td style="color: #1f2937; font-size: 17px; font-weight: 600; line-height: 1.5;">
                                  Here's how to get started (it takes under 5 minutes):
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>

                        <!-- Step 1 -->
                        <tr>
                          <td style="padding: 0 20px 12px 20px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                              <tr>
                                <td width="32" valign="top" style="padding-right: 12px;">
                                  <table border="0" cellpadding="0" cellspacing="0" width="28" height="28" style="background-color: #0c8ce9; border-radius: 50%;">
                                    <tr>
                                      <td align="center" valign="middle" style="color: #ffffff; font-size: 14px; font-weight: 600;">
                                        1
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                                <td style="color: #374151; font-size: 16px; line-height: 1.5;">
                                  Create your child's character (name, age, interests)
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>

                        <!-- Step 2 -->
                        <tr>
                          <td style="padding: 0 20px 12px 20px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                              <tr>
                                <td width="32" valign="top" style="padding-right: 12px;">
                                  <table border="0" cellpadding="0" cellspacing="0" width="28" height="28" style="background-color: #0c8ce9; border-radius: 50%;">
                                    <tr>
                                      <td align="center" valign="middle" style="color: #ffffff; font-size: 14px; font-weight: 600;">
                                        2
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                                <td style="color: #374151; font-size: 16px; line-height: 1.5;">
                                  Pick a theme — adventure, friendship, learning, or bedtime
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>

                        <!-- Step 3 -->
                        <tr>
                          <td style="padding: 0 20px 20px 20px; border-radius: 0 0 24px 24px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                              <tr>
                                <td width="32" valign="top" style="padding-right: 12px;">
                                  <table border="0" cellpadding="0" cellspacing="0" width="28" height="28" style="background-color: #0c8ce9; border-radius: 50%;">
                                    <tr>
                                      <td align="center" valign="middle" style="color: #ffffff; font-size: 14px; font-weight: 600;">
                                        3
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                                <td style="color: #374151; font-size: 16px; line-height: 1.5;">
                                  Generate your first story and watch it come to life
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- CTA Button -->
                  <tr>
                    <td align="center" style="padding: 20px 40px;">
                      <table border="0" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="background-color: #0c8ce9; border-radius: 50px; mso-padding-alt: 0;">
                            <!--[if mso]>
                            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="https://tuckandtale.com/dashboard" style="height:56px;v-text-anchor:middle;width:220px;" arcsize="50%" strokecolor="#0c8ce9" fillcolor="#0c8ce9">
                            <w:anchorlock/>
                            <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:600;">Create Your First Story</center>
                            </v:roundrect>
                            <![endif]-->
                            <!--[if !mso]><!-->
                            <a href="https://tuckandtale.com/dashboard" target="_blank" style="background-color: #0c8ce9; border-radius: 50px; color: #ffffff; display: inline-block; font-family: Arial, sans-serif; font-size: 16px; font-weight: 600; padding: 16px 32px; text-align: center; text-decoration: none; -webkit-text-size-adjust: none; mso-hide: all;">
                              Create Your First Story
                            </a>
                            <!--<![endif]-->
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Free Story Message -->
                  <tr>
                    <td style="padding: 0 40px 20px 40px;">
                      <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td style="color: #4b5563; font-size: 16px; line-height: 1.7;">
                            Your first story is free, and each new character you create opens the door to fresh adventures your child will love.
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Social Proof -->
                  <tr>
                    <td style="padding: 0 40px 20px 40px;">
                      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 24px; overflow: hidden;">
                        <tr>
                          <td style="padding: 16px 20px; color: #4b5563; font-size: 16px; font-style: italic; line-height: 1.7; border-radius: 24px;">
                            🌙 Many parents tell us their kids now ask for their "Tuck & Tale story" every night — we hope it becomes part of your family's routine too.
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Help Text -->
                  <tr>
                    <td style="padding: 0 40px 20px 40px;">
                      <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td style="color: #4b5563; font-size: 16px; line-height: 1.7;">
                            If you ever need help, have questions, or want story recommendations, we're always here at <a href="mailto:hello@tuckandtale.com" style="color: #0c8ce9; text-decoration: none;">hello@tuckandtale.com</a>.
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Signature -->
                  <tr>
                    <td style="padding: 20px 40px 40px 40px;">
                      <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td style="color: #6b7280; font-size: 15px; line-height: 1.7;">
                            Warm wishes and happy storytelling,<br/>
                            <span style="color: #1f2937; font-weight: 600;">The Tuck & Tale Team</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding: 0 40px 40px 40px; border-top: 1px solid #e5e7eb;">
                      <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td align="center" style="padding-top: 24px; color: #9ca3af; font-size: 13px; line-height: 1.7;">
                            You received this email because you created an account at Tuck & Tale.<br/>
                            If this wasn't you, please reply to let us know.
                          </td>
                        </tr>
                        <tr>
                          <td align="center" style="padding-top: 16px; color: #9ca3af; font-size: 13px;">
                            © ${new Date().getFullYear()} Tuck & Tale™. All rights reserved.
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    });

    // Handle Resend API errors
    if (error) {
      console.error('Resend API error:', error);
      return NextResponse.json(
        {
          error: 'Failed to send welcome email',
          details: error.message
        },
        { status: 500 }
      );
    }

    // Return success response
    return NextResponse.json({
      success: true,
      messageId: data?.id,
      message: `Welcome email sent successfully to ${email}`
    });

  } catch (error) {
    console.error('Unexpected error in send-welcome route:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message
      },
      { status: 500 }
    );
  }
}