import { REVIEW_DAYS, type ReviewState } from "./learning-state";

export function reviewReason(review: ReviewState): string {
  const last = [...review.history].reverse().find((h) => !h.early);
  if (last && !last.ok) return "The question or query needed another try last time, so this review returns after 1 day.";
  if (last) return `You remembered both parts last time. Your next review is after ${REVIEW_DAYS[review.level]} days.`;
  if (review.level > 0) return `Review scheduled after ${REVIEW_DAYS[review.level]} days.`;
  return "Your first review: revisit the concept 1 day after mastering the lesson.";
}

export function reviewWhen(due: number, now: number): string {
  const delta = due - now;
  const date = new Date(due).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  if (delta <= 0) {
    const days = Math.floor(-delta / 86400000);
    return days ? `Ready for ${days} day${days === 1 ? "" : "s"}` : "Ready to review";
  }
  return `Scheduled for ${date}`;
}
