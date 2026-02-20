import { Resend } from "resend";

/**
 * Send thank-you email after waitlist signup.
 * Requires RESEND_API_KEY in env. Optional WAITLIST_FROM_EMAIL (e.g. "Knot <hello@yourdomain.com>").
 * Resend free tier: use onboarding@resend.dev for testing, or verify your domain for production.
 */
function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

const DEFAULT_FROM = "Knot <onboarding@resend.dev>";

export async function sendWaitlistThankYou(to: string): Promise<{ ok: boolean; error?: string }> {
  const resend = getResendClient();
  if (!resend) {
    return { ok: false, error: "RESEND_API_KEY not set" };
  }

  const from = process.env.WAITLIST_FROM_EMAIL ?? DEFAULT_FROM;

  const subject = "You're on the list — thanks for joining Knot";
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thanks for joining Knot</title>
</head>
<body style="margin:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; padding: 24px;">
  <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
    <h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 700; color: #18181b;">Thanks for joining the waitlist</h1>
    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #3f3f46;">
      You're on the list for early access to Knot — we're glad you're here.
    </p>
    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #3f3f46;">
      We'll only email you about launch and important ride updates. No spam, ever.
    </p>
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #3f3f46;">
      In the meantime: tell friends from your school who are splitting airport rides. Same trip, smaller bill.
    </p>
    <p style="margin: 0; font-size: 14px; color: #71717a;">
      — The Knot team
    </p>
  </div>
  <p style="max-width: 480px; margin: 16px auto 0; font-size: 12px; color: #a1a1aa; text-align: center;">
    You're receiving this because you signed up for the Knot waitlist.
  </p>
</body>
</html>
  `.trim();

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: [to],
      subject,
      html,
    });

    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send email";
    return { ok: false, error: message };
  }
}
