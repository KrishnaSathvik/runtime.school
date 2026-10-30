/**
 * Tell the Python waitlist that Python is open.
 *
 *   npx vite-node --config vitest.config.ts scripts/notify-python-waitlist.ts                     count + preview, sends nothing
 *   npx vite-node --config vitest.config.ts scripts/notify-python-waitlist.ts --send --confirm 42  send to exactly 42 people
 *
 * Who: Resend contacts opted in to the Python topic (RESEND_TOPIC_PYTHON), the list the landing page's
 * "Notify me" box fills (src/lib/waitlist-contact.ts). Unsubscribed contacts and reserved test domains are skipped.
 * What: the existing courseAvailableEmail template (src/lib/waitlist-email.ts).
 * How: each person gets their own email (never a shared To/CC), 100 per batch request. Each batch carries an
 * Idempotency-Key, so re-running within 24 hours doesn't email the same batch twice.
 *
 * Needs RESEND_API_KEY, RESEND_TOPIC_PYTHON and NOTIFY_FROM_EMAIL (a sender on a domain verified in Resend),
 * from the environment or .env.local. Prints counts only, never addresses.
 */
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { topicIdForSubject } from "@/lib/waitlist-contact";
import { courseAvailableEmail } from "@/lib/waitlist-email";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const args = process.argv.slice(2);
const send = args.includes("--send");
const confirmAt = args.indexOf("--confirm");
const confirm = confirmAt >= 0 ? Number(args[confirmAt + 1]) : NaN;

const KEY = process.env.RESEND_API_KEY;
const TOPIC = topicIdForSubject("python");
const FROM = process.env.NOTIFY_FROM_EMAIL;
const API = "https://api.resend.com";
const BATCH = 100;

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

if (!KEY) fail("RESEND_API_KEY is not set.");
if (!TOPIC) fail("RESEND_TOPIC_PYTHON is not set.");

const pause = (ms: number) => new Promise((done) => setTimeout(done, ms));

/** One Resend API call, paced under the default rate limit and retried when Resend says to slow down. */
async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    await pause(550);
    const res = await fetch(`${API}${path}`, { ...init, headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", ...init.headers } });
    if (res.status === 429 && attempt < 5) {
      await pause(Number(res.headers.get("retry-after") ?? 1) * 1000);
      continue;
    }
    const body = await res.text();
    if (!res.ok) fail(`Resend ${init.method ?? "GET"} ${path.split("?")[0]} failed (${res.status}): ${body.slice(0, 300)}`);
    return (body ? JSON.parse(body) : {}) as T;
  }
}

type Contact = { id: string; email: string; unsubscribed: boolean };
type Page<T> = { data: T[]; has_more: boolean };

async function allContacts(): Promise<Contact[]> {
  const out: Contact[] = [];
  for (let after: string | null = null; ; ) {
    const page: Page<Contact> = await api(`/contacts?limit=100${after ? `&after=${after}` : ""}`);
    out.push(...page.data);
    if (!page.has_more || page.data.length === 0) return out;
    after = page.data[page.data.length - 1].id;
  }
}

async function optedIn(contact: Contact): Promise<boolean> {
  const topics: Page<{ id: string; subscription: string }> = await api(`/contacts/${contact.id}/topics`);
  return topics.data.some((t) => t.id === TOPIC && t.subscription === "opt_in");
}

const contacts = await allContacts();
const reachable = contacts.filter((c) => !c.unsubscribed);
const waitlist: string[] = [];
for (const c of reachable) if (await optedIn(c)) waitlist.push(c.email);
/** Reserved test domains (RFC 2606), left by sign-up tests: Resend refuses them, and no one reads them. */
const isTestAddress = (email: string) => /@(?:[^@]+\.)?(?:example\.(?:com|net|org)|[^@]+\.(?:test|example|invalid|localhost))$/.test(email);
const unique = [...new Set(waitlist.map((e) => e.trim().toLowerCase()))];
const recipients = unique.filter((e) => !isTestAddress(e)).sort();

const mail = courseAvailableEmail({ subjectId: "python", subjectTitle: "Python" });
console.log(`Python waitlist: ${recipients.length} ${recipients.length === 1 ? "person" : "people"}`);
console.log(`  (${contacts.length} contacts checked, ${contacts.length - reachable.length} unsubscribed and ${unique.length - recipients.length} test addresses skipped)`);
console.log(`Email: "${mail.subject}" from ${FROM ?? "(NOTIFY_FROM_EMAIL not set)"}`);

if (!send) {
  console.log("\nNothing sent. To send, run again with --send --confirm <the count above>.");
  process.exit(0);
}
if (!FROM) fail("NOTIFY_FROM_EMAIL is not set. Use a sender on a domain verified in Resend, e.g. \"Runtime <hello@runtime.school>\".");
if (/@resend\.dev>?$/i.test(FROM)) fail("onboarding@resend.dev can only email the Resend account owner. Use a sender on your verified domain.");
if (confirm !== recipients.length) fail(`--confirm must equal the waitlist count (${recipients.length}). Nothing sent.`);
if (recipients.length === 0) {
  console.log("No one to email.");
  process.exit(0);
}

let sent = 0;
for (let i = 0; i < recipients.length; i += BATCH) {
  const batch = recipients.slice(i, i + BATCH);
  const key = `python-open-${createHash("sha256").update(batch.join("\n")).digest("hex").slice(0, 40)}`;
  await api("/emails/batch", {
    method: "POST",
    headers: { "Idempotency-Key": key },
    body: JSON.stringify(batch.map((to) => ({ from: FROM, to: [to], subject: mail.subject, html: mail.html, text: mail.text }))),
  });
  sent += batch.length;
  console.log(`  sent ${sent}/${recipients.length}`);
}
console.log(`✓ Emailed ${sent} ${sent === 1 ? "person" : "people"}.`);
