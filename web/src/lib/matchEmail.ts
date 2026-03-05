import { Resend } from "resend";

/**
 * Match- and messaging-related transactional emails via Resend.
 * Requires RESEND_API_KEY. Uses MATCH_FROM_EMAIL or WAITLIST_FROM_EMAIL for sender.
 *
 * IMPORTANT: The default "onboarding@resend.dev" is Resend's sandbox domain
 * which ONLY delivers to the Resend account owner's email address.
 * Default sender: Knot <knot@knotride.com>. Override with MATCH_FROM_EMAIL or WAITLIST_FROM_EMAIL.
 */
function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

const DEFAULT_FROM = "Knot <knot@knotride.com>";

function getFromAddress(): string {
  return (
    process.env.MATCH_FROM_EMAIL ??
    process.env.WAITLIST_FROM_EMAIL ??
    DEFAULT_FROM
  );
}

function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return ch;
    }
  });
}

export async function sendWelcomeEmail(to: string): Promise<{ ok: boolean; error?: string }> {
  const resend = getResendClient();
  if (!resend) {
    console.error("[matchEmail] RESEND_API_KEY not set — cannot send welcome email");
    return { ok: false, error: "RESEND_API_KEY not set" };
  }

  const from = getFromAddress();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://knotride.com";
  const subject = "Welcome to Knot";
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Knot</title>
</head>
<body style="margin:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; padding: 24px;">
  <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
    <h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 700; color: #18181b;">Welcome to Knot</h1>
    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #3f3f46;">
      You're in. Split rides, save money, and meet people going the same way.
    </p>
    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #3f3f46;">
      Post a ride or browse matches to get started. When you find someone going your way, connect and coordinate in the app.
    </p>
    <p style="margin: 0 0 24px;">
      <a href="${appUrl}/home" style="display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600;">Open Knot</a>
    </p>
    <p style="margin: 0; font-size: 14px; color: #71717a;">— The Knot team</p>
  </div>
</body>
</html>
  `.trim();

  try {
    const { error } = await resend.emails.send({ from, to: [to], subject, html });
    if (error) {
      console.error(`[matchEmail] Failed to send welcome email to ${to}:`, error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send email";
    console.error(`[matchEmail] Exception sending welcome email to ${to}:`, message);
    return { ok: false, error: message };
  }
}

export async function sendMatchAcceptedEmail(
  to: string,
  otherName: string,
  routeSummary: string
): Promise<{ ok: boolean; error?: string }> {
  const resend = getResendClient();
  if (!resend) {
    console.error("[matchEmail] RESEND_API_KEY not set — cannot send match accepted email");
    return { ok: false, error: "RESEND_API_KEY not set" };
  }

  const from = getFromAddress();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://knotride.com";
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
    if (error) {
      console.error(`[matchEmail] Failed to send match-accepted email to ${to}:`, error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send email";
    console.error(`[matchEmail] Exception sending match-accepted email to ${to}:`, message);
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
    console.error("[matchEmail] RESEND_API_KEY not set — cannot send suggested matches email");
    return { ok: false, error: "RESEND_API_KEY not set" };
  }

  const from = getFromAddress();
  const url = appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://knotride.com";
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
    if (error) {
      console.error(`[matchEmail] Failed to send suggested-matches email to ${to}:`, error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send email";
    console.error(`[matchEmail] Exception sending suggested-matches email to ${to}:`, message);
    return { ok: false, error: message };
  }
}

export async function sendNewMessageEmail(
  to: string,
  senderName: string,
  routeSummary: string | null,
  preview: string,
  threadUrl: string
): Promise<{ ok: boolean; error?: string }> {
  const resend = getResendClient();
  if (!resend) {
    console.error("[matchEmail] RESEND_API_KEY not set — cannot send new message email");
    return { ok: false, error: "RESEND_API_KEY not set" };
  }

  const from = getFromAddress();
  const safeSender = escapeHtml(senderName);
  const safeRoute = routeSummary ? escapeHtml(routeSummary) : null;
  const trimmedPreview = preview.trim().slice(0, 140);
  const safePreview = escapeHtml(trimmedPreview || "Open Knot to read it.");

  const subject = `New message from ${senderName} on Knot`;
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New message</title>
</head>
<body style="margin:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; padding: 24px;">
  <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
    <h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 700; color: #18181b;">New message</h1>
    <p style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #3f3f46;">
      <strong>${safeSender}</strong> just sent you a message on Knot.
    </p>
    ${
      safeRoute
        ? `<p style="margin: 0 0 12px; font-size: 14px; line-height: 1.6; color: #52525b;">
      Trip: <strong>${safeRoute}</strong>
    </p>`
        : ""
    }
    <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #71717a;">
      "${safePreview}"${trimmedPreview.length >= 140 ? "…" : ""}
    </p>
    <p style="margin: 0 0 24px;">
      <a href="${threadUrl}" style="display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600;">Open messages</a>
    </p>
    <p style="margin: 0; font-size: 14px; color: #71717a;">— The Knot team</p>
  </div>
</body>
</html>
  `.trim();

  try {
    const { error } = await resend.emails.send({ from, to: [to], subject, html });
    if (error) {
      console.error(`[matchEmail] Failed to send new-message email to ${to}:`, error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send email";
    console.error(`[matchEmail] Exception sending new-message email to ${to}:`, message);
    return { ok: false, error: message };
  }
}

