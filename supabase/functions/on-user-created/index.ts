// Supabase Edge Function: Notify admin when a new user signs up
// Triggered by database webhook on user_profiles insert

import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const ADMIN_EMAIL = Deno.env.get("ADMIN_NOTIFICATION_EMAIL") || "hello@tuckandtale.com";

// Webhook payload type from Supabase
interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: {
    id: string;
    email: string;
    full_name: string | null;
    created_at: string;
  };
  schema: string;
  old_record: null | Record<string, unknown>;
}

Deno.serve(async (req) => {
  // Verify the request is authorized
  const authHeader = req.headers.get("Authorization");
  const expectedToken = Deno.env.get("WEBHOOK_SECRET");

  if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const payload: WebhookPayload = await req.json();

    // Only process INSERT events
    if (payload.type !== "INSERT") {
      return new Response(JSON.stringify({ message: "Ignored non-INSERT event" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { id, email, full_name, created_at } = payload.record;

    const signupDate = new Date(created_at).toLocaleString("en-US", {
      dateStyle: "full",
      timeStyle: "short",
    });

    // Display name - use full_name if available, otherwise indicate it's pending
    const displayName = full_name && full_name.trim() !== ""
      ? full_name
      : "(Name not yet provided)";

    await resend.emails.send({
      from: "Tuck & Tale <notifications@tuckandtale.com>",
      to: [ADMIN_EMAIL],
      subject: `🎉 New User Signup: ${email}`,
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
                    <td style="padding: 8px 0; color: #333; text-align: right;">${displayName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666; font-weight: 600;">Email:</td>
                    <td style="padding: 8px 0; text-align: right;">
                      <a href="mailto:${email}" style="color: #0c8ce9; text-decoration: none;">${email}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666; font-weight: 600;">User ID:</td>
                    <td style="padding: 8px 0; color: #999; text-align: right; font-size: 12px;">${id}</td>
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
      `,
    });

    console.log(`Admin notification sent for new user: ${email}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
