import { NextResponse } from "next/server";
import { upsertWaitlistContact } from "@/lib/waitlist-contact";
import { waitlistNotifyEmail } from "@/lib/waitlist-email";

const TO = process.env.NOTIFY_TO_EMAIL ?? "krishnasathvikm@gmail.com";
const FROM = process.env.NOTIFY_FROM_EMAIL ?? "Runtime Waitlist <onboarding@resend.dev>";

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

export async function POST(req: Request) {
  let body: { email?: unknown; subjectId?: unknown; subjectTitle?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const subjectId = typeof body.subjectId === "string" ? body.subjectId.trim().slice(0, 64) : "";
  const subjectTitle = typeof body.subjectTitle === "string" ? body.subjectTitle.trim().slice(0, 80) : subjectId;

  if (!isEmail(email) || !subjectId) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("RESEND_API_KEY is not set");
    return NextResponse.json(
      { error: "Waitlist is not configured yet. Try again soon." },
      { status: 503 },
    );
  }

  const mail = waitlistNotifyEmail({ email, subjectId, subjectTitle });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: [TO],
      reply_to: email,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("Resend failed", res.status, detail);
    return NextResponse.json({ error: "Could not send. Try again in a moment." }, { status: 502 });
  }

  // Persist for later “course available” broadcasts (Resend Audience topic).
  const contact = await upsertWaitlistContact({
    apiKey: key,
    email,
    subjectId,
  });
  if (!contact.ok) {
    console.error("Resend contact upsert failed", contact.status, contact.detail);
    // Owner email already sent — still return ok so the learner isn't blocked.
  }

  return NextResponse.json({ ok: true });
}
