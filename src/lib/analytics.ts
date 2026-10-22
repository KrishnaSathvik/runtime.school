/**
 * Product analytics: PostHog and Google Analytics (gtag, loaded in app/layout.tsx) get the same events.
 * Safe no-op on the server or when neither is set up. Never send raw SQL, Python or editor contents:
 * only coarse ids and error kinds.
 */

export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

export function analyticsEnabled(): boolean {
  return typeof window !== "undefined" && !!KEY;
}

type Gtag = (command: "event", name: string, params?: AnalyticsProps) => void;

export function track(event: string, props?: AnalyticsProps): void {
  if (typeof window === "undefined") return;
  try {
    // Loaded on first use (the provider has already initialised the same instance), so code that only records
    // events, like the Python engine, doesn't pull PostHog in when it loads.
    if (KEY) void import("posthog-js").then(({ default: posthog }) => posthog.capture(event, props)).catch(() => {});
    (window as unknown as { gtag?: Gtag }).gtag?.("event", event, props);
  } catch {
    // Analytics must never break learning flows.
  }
}

/** Parse attempt keys like `lesson:3:0` or `project-2:5:1`. */
export function attemptContext(key: string): {
  subject: "sql";
  lessonId: number;
  challenge: number;
  projectId: number | null;
} | null {
  const lesson = /^lesson:(\d+):(\d+)$/.exec(key);
  if (lesson) {
    return {
      subject: "sql",
      lessonId: Number(lesson[1]),
      challenge: Number(lesson[2]) + 1,
      projectId: null,
    };
  }
  const project = /^project-(\d+):(\d+):(\d+)$/.exec(key);
  if (project) {
    return {
      subject: "sql",
      lessonId: Number(project[2]),
      challenge: Number(project[3]) + 1,
      projectId: Number(project[1]),
    };
  }
  return null;
}

/** Coarse SQLite / grader error kind for funnels (no message text). */
export function errorKind(message: string | undefined | null): string {
  if (!message) return "unknown";
  if (/timed out while starting|engine (could not load|worker failed)/i.test(message)) return "engine_boot";
  if (/Query timed out|took too long/i.test(message)) return "query_timeout";
  if (/no such column/i.test(message)) return "unknown_column";
  if (/no such table/i.test(message)) return "unknown_table";
  if (/syntax error/i.test(message)) return "syntax";
  if (/ambiguous/i.test(message)) return "ambiguous_column";
  if (/UNIQUE|PRIMARY KEY|CHECK|FOREIGN KEY|constraint/i.test(message)) return "constraint";
  return "runtime";
}
