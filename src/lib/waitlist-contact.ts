/**
 * Map gated subject ids → Resend Topic IDs (Audience → Topics).
 * Add env vars as you create more topics in Resend.
 */
export function topicIdForSubject(subjectId: string): string | null {
  const map: Record<string, string | undefined> = {
    python: process.env.RESEND_TOPIC_PYTHON,
    pyspark: process.env.RESEND_TOPIC_PYSPARK,
    "power-bi": process.env.RESEND_TOPIC_POWER_BI,
    ml: process.env.RESEND_TOPIC_ML,
    "ai-engineering": process.env.RESEND_TOPIC_AI_ENGINEERING,
  };
  const id = map[subjectId]?.trim();
  return id || null;
}

/**
 * Upsert a waitlist contact and opt them into the subject's Resend topic.
 * Owner email still goes out separately; this is how we store who to notify later.
 */
export async function upsertWaitlistContact(opts: {
  apiKey: string;
  email: string;
  subjectId: string;
}): Promise<{ ok: true } | { ok: false; status: number; detail: string }> {
  const topicId = topicIdForSubject(opts.subjectId);
  if (!topicId) {
    return { ok: false, status: 0, detail: `No Resend topic configured for ${opts.subjectId}` };
  }

  const headers = {
    Authorization: `Bearer ${opts.apiKey}`,
    "Content-Type": "application/json",
  };

  const body = {
    email: opts.email,
    unsubscribed: false,
    topics: [{ id: topicId, subscription: "opt_in" as const }],
  };

  const create = await fetch("https://api.resend.com/contacts", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (create.ok) return { ok: true };

  const detail = await create.text().catch(() => "");
  // Contact already exists — update topic subscription by email.
  if (create.status === 409 || /already exists|duplicate/i.test(detail)) {
    const update = await fetch(
      `https://api.resend.com/contacts/${encodeURIComponent(opts.email)}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          unsubscribed: false,
          topics: [{ id: topicId, subscription: "opt_in" as const }],
        }),
      },
    );
    if (update.ok) return { ok: true };
    const updateDetail = await update.text().catch(() => "");
    return { ok: false, status: update.status, detail: updateDetail };
  }

  return { ok: false, status: create.status, detail };
}
