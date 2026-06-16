import crypto from "node:crypto";
import type React from "react";
import { resend } from "./resend-client.js";

const FROM_ADDRESS = process.env.EMAIL_FROM ?? "Udruga eCommerce Hrvatska <udruga@ecommerce.hr>";
// Odgovori članova idu na pravi sandučić udruge (da se može odgovarati i pratiti komunikacija).
const REPLY_TO = process.env.EMAIL_REPLY_TO ?? "udruga@ecommerce.hr";
const isDev = process.env.NODE_ENV !== "production";
const API_BASE = process.env.API_BASE_URL ?? "https://api.ecommerce.hr";

export interface EmailAttachment {
  filename: string;
  content: string; // base64 encoded
  contentType: string;
  encoding?: string;
}

export interface SendEmailOptions {
  memberId?: string;
  templateName?: string;
  attachments?: EmailAttachment[];
  trackingId?: string;
}

// Optional email logger — set by the API at startup to avoid circular deps
let emailLogger: ((data: {
  to: string;
  subject: string;
  body?: string;
  memberId?: string;
  templateName?: string;
  trackingId?: string;
}) => Promise<void>) | null = null;

export function setEmailLogger(fn: typeof emailLogger) {
  emailLogger = fn;
}

/**
 * Send a raw HTML email via Resend. In development mode the email is logged to
 * the console instead of being dispatched.
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  options?: SendEmailOptions,
): Promise<void> {
  // Generate tracking ID and inject tracking pixel
  const trackingId = options?.trackingId ?? crypto.randomUUID();
  const trackingPixel = `<img src="${API_BASE}/api/public/track/open/${trackingId}.gif" width="1" height="1" style="display:none;" alt="" />`;
  const trackedHtml = html.includes("</body>")
    ? html.replace("</body>", `${trackingPixel}</body>`)
    : html + trackingPixel;

  if (isDev) {
    console.log("──── DEV EMAIL ────");
    console.log(`From: ${FROM_ADDRESS}`);
    console.log(`To:   ${to}`);
    console.log(`Subj: ${subject}`);
    console.log(`TrackingId: ${trackingId}`);
    if (options?.attachments?.length) {
      console.log(`Attachments: ${options.attachments.map(a => a.filename).join(', ')}`);
    }
    console.log(trackedHtml);
    console.log("───────────────────");
  } else {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: [to],
      replyTo: REPLY_TO,
      subject,
      html: trackedHtml,
      ...(options?.attachments?.length
        ? {
            attachments: options.attachments.map((att) => ({
              filename: att.filename,
              content: Buffer.from(att.content, "base64"),
              contentType: att.contentType,
            })),
          }
        : {}),
    });

    if (error) {
      throw new Error(
        `Resend send failed: ${error.message ?? JSON.stringify(error)}`,
      );
    }
  }

  // Log email to DB if logger is set
  if (emailLogger) {
    try {
      await emailLogger({
        to,
        subject,
        body: trackedHtml,
        memberId: options?.memberId,
        templateName: options?.templateName,
        trackingId,
      });
    } catch (err) {
      console.error('[EmailLogger] Failed to log email:', err);
    }
  }
}

/**
 * Render a React-email component to an HTML string and send it.
 */
export async function sendRenderedEmail(
  to: string,
  subject: string,
  component: React.ReactElement,
  options?: SendEmailOptions,
): Promise<void> {
  const { render } = await import("@react-email/render");
  const html = await render(component);
  await sendEmail(to, subject, html, options);
}

/**
 * Send a templated email. Currently a placeholder that renders the template
 * data into the subject line and delegates to `sendEmail`.
 */
export async function sendTemplatedEmail(
  to: string,
  templateName: string,
  data: Record<string, unknown>,
): Promise<void> {
  const subject = `[${templateName}] Notification`;
  const html = `<p>Template: <strong>${templateName}</strong></p><pre>${JSON.stringify(data, null, 2)}</pre>`;

  await sendEmail(to, subject, html);
}
