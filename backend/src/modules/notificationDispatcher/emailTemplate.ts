// Shared HTML wrapper for every outbound notification email. Called once,
// from postgres.ts's prepareCommittedDelivery, at the moment a queued
// notification is prepared for delivery -- the resulting HTML is stored
// permanently on the notification_deliveries row (see ADR-006), so this
// function's output IS what real users receive; there is no later
// re-rendering step.
//
// ConnectSphere brand tokens below are mirrored from frontend/src/styles.css
// :root (verified against the live app, not guessed). Keep the two files in
// sync if the brand palette changes -- there is no shared token source
// between frontend and backend today.
const BRAND = {
  teal: '#0e7c7b',
  tealSoft: '#e4f3f1',
  page: '#f7f7f5',
  surface: '#ffffff',
  ink: '#0f0f0f',
  muted: '#5c5c5c',
  border: '#e5e5e5',
  font: "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
} as const;

// title and message originate from application-controlled notification rows
// (see backend/src/modules/notificationDispatcher/postgres.ts), never from
// arbitrary caller-supplied HTML -- but they can still contain user-influenced
// text (e.g. an event title), so every value is escaped before insertion.
export const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]!);

// Runs on already-escaped text. http(s) URLs are common in notification
// bodies (verification links, password reset links) and read far better as
// a real, brand-colored link than as inert plain text. This is a simple
// heuristic, not a general-purpose URL parser: it matches a run of
// non-whitespace characters after the scheme, then trims ONE trailing
// sentence-punctuation character back out of the link if present, since
// messages in this codebase put URLs at the end of a sentence or on their
// own line (see verificationEmail.ts's buildVerificationMessage). Escaped
// entities like `&amp;` inside a multi-param query string are matched
// correctly because none of escapeHtml's replacement characters are
// whitespace.
function linkifyEscapedUrls(escapedText: string): string {
  return escapedText.replace(/https?:\/\/\S+/g, (match) => {
    const trailingPunctuation = /[.,!?)]$/.exec(match);
    const url = trailingPunctuation ? match.slice(0, -1) : match;
    const suffix = trailingPunctuation ? trailingPunctuation[0] : '';
    return `<a href="${url}" style="color:${BRAND.teal};">${url}</a>${suffix}`;
  });
}

/**
 * Builds the branded ConnectSphere transactional email layout around a
 * plain-text notification title and message. Table-based structure with
 * inline styles throughout -- Outlook and several other clients strip
 * `<style>` blocks and have inconsistent CSS support, so every rule that
 * matters is inlined directly on the element it affects.
 */
export function buildNotificationEmailHtml(title: string, message: string): string {
  const safeTitle = escapeHtml(title);
  const safeBody = linkifyEscapedUrls(escapeHtml(message)).replace(/\r?\n/g, '<br>');
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${safeTitle}</title></head>
<body style="margin:0;padding:0;background:${BRAND.page};font-family:${BRAND.font};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.page};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${BRAND.surface};border:1px solid ${BRAND.border};border-radius:12px;overflow:hidden;">
        <tr>
          <td style="background:${BRAND.teal};padding:28px 32px;">
            <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.02em;">ConnectSphere</span>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 32px 24px;">
            <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:${BRAND.ink};line-height:1.3;">${safeTitle}</h1>
            <p style="margin:0;font-size:15px;line-height:1.6;color:${BRAND.muted};">${safeBody}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid ${BRAND.border};background:${BRAND.tealSoft};">
            <p style="margin:0;font-size:12.5px;line-height:1.6;color:${BRAND.muted};">
              This is an automated message from ConnectSphere.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
