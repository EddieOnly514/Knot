import { Resend } from "resend";

/**
 * Match-related transactional emails via Resend.
 * Requires RESEND_API_KEY. Uses same from-address pattern as waitlist.
 */
function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

const DEFAULT_FROM = "Knot <onboarding@resend.dev>";

export async function sendMatchAcceptedEmail(
  to: string,
  otherName: string,
  routeSummary: string
): Promise<{ ok: boolean; error?: string }> {
  const resend = getResendClient();
  if (!resend) {
    return { ok: false, error: "RESEND_API_KEY not set" };
  }

  const from = process.env.WAITLIST_FROM_EMAIL ?? DEFAULT_FROM;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://knot.app";
  const subject = `You're matched with ${otherName} on Knot`;
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're matched</title>
</head>
<body style="margin:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; padding: 24px;">
  <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
    <h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 700; color: #18181b;">You're matched!</h1>
    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #3f3f46;">
      You and <strong>${otherName}</strong> have accepted a ride match.
    </p>
    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #3f3f46;">
      Route: <strong>${routeSummary}</strong>
    </p>
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #3f3f46;">
      Open the app to chat and coordinate your ride.
    </p>
    <p style="margin: 0 0 24px;">
      <a href="${appUrl}/messages" style="display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600;">Open messages</a>
    </p>
    <p style="margin: 0; font-size: 14px; color: #71717a;">— The Knot team</p>
  </div>
</body>
</html>
  `.trim();

  try {
    const { error } = await resend.emails.send({ from, to: [to], subject, html });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send email";
    return { ok: false, error: message };
  }
}

export async function sendSuggestedMatchesEmail(
  to: string,
  count: number,
  appUrl?: string
): Promise<{ ok: boolean; error?: string }> {
  const resend = getResendClient();
  if (!resend) {
    return { ok: false, error: "RESEND_API_KEY not set" };
  }

  const from = process.env.WAITLIST_FROM_EMAIL ?? DEFAULT_FROM;
  const url = appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://knot.app";
  const subject = count === 1 ? "You have 1 suggested match on Knot" : `You have ${count} suggested matches on Knot`;
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Suggested matches</title>
</head>
<body style="margin:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; padding: 24px;">
  <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
    <h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 700; color: #18181b;">Suggested matches</h1>
    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #3f3f46;">
      ${count === 1 ? "There's 1 ride that could be a good match for you." : `There are ${count} rides that could be good matches for you.`}
    </p>
    <p style="margin: 0 0 24px;">
      <a href="${url}/home" style="display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600;">View matches</a>
    </p>
    <p style="margin: 0; font-size: 14px; color: #71717a;">— The Knot team</p>
  </div>
</body>
</html>
  `.trim();

  try {
    const { error } = await resend.emails.send({ from, to: [to], subject, html });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send email";
    return { ok: false, error: message };
  }
}
