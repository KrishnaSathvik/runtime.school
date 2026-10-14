import { BRAND_DOMAIN, BRAND_NAME, BRAND_TAGLINE, SITE_URL } from "@/platform/brand";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type BrandedMailArgs = {
  label: string;
  headline: string;
  bodyHtml: string;
  bodyText: string[];
  cta?: { href: string; label: string };
  footerNote?: string;
  subject: string;
};

/** Shared flat Runtime email shell (logo, wordmark, label, headline, CTA, footer). */
function brandedMail(args: BrandedMailArgs): { subject: string; text: string; html: string } {
  const logo = `${SITE_URL}/logo.png`;
  const home = SITE_URL;
  const label = escapeHtml(args.label);
  const headline = escapeHtml(args.headline);

  const ctaHtml = args.cta
    ? `<p style="margin:28px 0 0;">
          <a href="${escapeHtml(args.cta.href)}"
             style="font-size:14px;font-weight:650;color:#8f5300;text-decoration:underline;text-underline-offset:3px;">
            ${escapeHtml(args.cta.label)}
          </a>
        </p>`
    : "";

  const ctaText = args.cta ? ["", args.cta.label, args.cta.href] : [];
  const footerNote = args.footerNote ? escapeHtml(args.footerNote) : `Sent by ${BRAND_NAME}`;

  const text = [
    `${BRAND_NAME}`,
    BRAND_TAGLINE,
    "",
    args.label,
    args.headline,
    "",
    ...args.bodyText,
    ...ctaText,
    "",
    home,
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(args.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;color:#1b1913;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;padding:36px 24px;">
    <tr>
      <td align="left" style="max-width:520px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
          <tr>
            <td style="vertical-align:middle;padding-right:12px;">
              <img src="${logo}" width="32" height="32" alt="${BRAND_NAME}" style="display:block;border-radius:7px;border:0;" />
            </td>
            <td style="vertical-align:middle;">
              <div style="font-size:18px;font-weight:700;letter-spacing:-0.03em;color:#1b1913;line-height:1;">
                ${BRAND_NAME.toLowerCase()}<span style="color:#e3a03a;">.</span>
              </div>
              <div style="margin-top:3px;font-size:12px;color:#8a8578;">${escapeHtml(BRAND_TAGLINE)}</div>
            </td>
          </tr>
        </table>

        <p style="margin:0;font-size:12px;font-weight:650;letter-spacing:0.06em;text-transform:uppercase;color:#8f5300;">
          ${label}
        </p>
        <h1 style="margin:8px 0 0;font-size:22px;line-height:1.3;font-weight:700;letter-spacing:-0.02em;color:#1b1913;">
          ${headline}
        </h1>
        ${args.bodyHtml}
        ${ctaHtml}

        <p style="margin:36px 0 0;font-size:12px;line-height:1.5;color:#8a8578;">
          ${footerNote} · <a href="${home}" style="color:#8a8578;text-decoration:underline;text-underline-offset:2px;">${BRAND_DOMAIN}</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject: args.subject, text, html };
}

/** Owner notification when someone joins a subject waitlist. */
export function waitlistNotifyEmail(args: {
  email: string;
  subjectId: string;
  subjectTitle: string;
  when?: Date;
}): { subject: string; text: string; html: string } {
  const when = (args.when ?? new Date()).toISOString();
  const title = escapeHtml(args.subjectTitle);
  const id = escapeHtml(args.subjectId);
  const mail = escapeHtml(args.email);
  const subject = `${BRAND_NAME} waitlist · ${args.subjectTitle}`;

  return brandedMail({
    subject,
    label: "Waitlist",
    headline: `New interest in ${args.subjectTitle}`,
    bodyText: [
      `Someone wants to be notified when ${args.subjectTitle} is available.`,
      "",
      `Subject: ${args.subjectTitle} (${args.subjectId})`,
      `Email: ${args.email}`,
      `When: ${when}`,
      "",
      "Reply to this message to reach them.",
    ],
    bodyHtml: `
        <p style="margin:12px 0 0;font-size:15px;line-height:1.6;color:#4a463c;">
          Someone wants to be notified when <strong style="color:#1b1913;">${title}</strong> opens on ${BRAND_NAME}.
        </p>
        <p style="margin:22px 0 0;font-size:15px;line-height:1.7;color:#1b1913;">
          Subject · ${title} <span style="color:#8a8578;">(${id})</span><br />
          Email · <a href="mailto:${mail}" style="color:#8f5300;text-decoration:none;">${mail}</a><br />
          When · <span style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;color:#4a463c;">${escapeHtml(when)}</span>
        </p>`,
    cta: {
      href: `mailto:${args.email}?subject=${encodeURIComponent(`Re: ${BRAND_NAME} — ${args.subjectTitle}`)}`,
      label: "Reply to learner →",
    },
    footerNote: `Sent by ${BRAND_NAME}`,
  });
}

/** Learner email when a gated subject opens. Same shell as the owner waitlist mail. */
export function courseAvailableEmail(args: {
  subjectId: string;
  subjectTitle: string;
  /** Absolute or site-relative path to open the course. Defaults to /{subjectId}. */
  coursePath?: string;
}): { subject: string; text: string; html: string } {
  const path = args.coursePath ?? `/${args.subjectId}`;
  const courseUrl = path.startsWith("http") ? path : `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const title = escapeHtml(args.subjectTitle);
  const subject = `${args.subjectTitle} is open on ${BRAND_NAME}`;

  return brandedMail({
    subject,
    label: "Available",
    headline: `${args.subjectTitle} is open on ${BRAND_NAME}`,
    bodyText: [
      `Your waitlist spot for ${args.subjectTitle} is ready.`,
      "Start the course whenever you want.",
    ],
    bodyHtml: `
        <p style="margin:12px 0 0;font-size:15px;line-height:1.6;color:#4a463c;">
          Your waitlist spot for <strong style="color:#1b1913;">${title}</strong> is ready — start the course whenever you want.
        </p>`,
    cta: {
      href: courseUrl,
      label: `Open ${args.subjectTitle} →`,
    },
    footerNote: `You’re getting this because you asked to be notified on ${BRAND_NAME}`,
  });
}
