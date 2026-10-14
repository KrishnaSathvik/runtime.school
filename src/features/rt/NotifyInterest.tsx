"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Bell } from "lucide-react";
import { track } from "@/lib/analytics";

const storageKey = (subjectId: string) => `rt-notify:${subjectId}`;

/**
 * Inline waitlist for subjects that are not open yet.
 * Emails the site owner via /api/notify-interest (Resend).
 */
export function NotifyInterest({
  subjectId,
  subjectTitle,
}: {
  subjectId: string;
  subjectTitle: string;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey(subjectId))) setStatus("done");
    } catch {
      // ignore
    }
  }, [subjectId]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (status === "loading" || status === "done") return;
    setStatus("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/notify-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, subjectId, subjectTitle }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Something went wrong.");
        return;
      }
      try {
        localStorage.setItem(storageKey(subjectId), email.trim().toLowerCase());
      } catch {
        // ignore
      }
      track("waitlist_signup", { subject: subjectId });
      setStatus("done");
      setOpen(false);
    } catch {
      setStatus("error");
      setMessage("Network error. Try again.");
    }
  };

  if (status === "done") {
    return <span className="rx-subject-note mono">you’ll be notified</span>;
  }

  if (!open) {
    return (
      <button
        type="button"
        className="rx-notify-btn"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <Bell size={13} aria-hidden="true" /> Get notified
      </button>
    );
  }

  return (
    <form className="rx-notify" onSubmit={(e) => void submit(e)} onClick={(e) => e.stopPropagation()}>
      <label className="sr-only" htmlFor={`notify-${subjectId}`}>
        Email for {subjectTitle} updates
      </label>
      <input
        id={`notify-${subjectId}`}
        type="email"
        name="email"
        autoComplete="email"
        required
        placeholder="you@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={status === "loading"}
        autoFocus
      />
      <button type="submit" className="rx-btn primary" disabled={status === "loading"}>
        {status === "loading" ? "Sending…" : "Notify me"}
      </button>
      <button
        type="button"
        className="rx-btn ghost"
        onClick={() => {
          setOpen(false);
          setMessage(null);
          setStatus("idle");
        }}
      >
        Cancel
      </button>
      {message && <p className="rx-notify-err" role="alert">{message}</p>}
    </form>
  );
}
