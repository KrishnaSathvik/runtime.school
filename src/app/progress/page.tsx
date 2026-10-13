import { redirect } from "next/navigation";

/** Legacy bookmark — progress is shown inside Learn, Practice, and Projects. */
export default function ProgressPage() {
  redirect("/sql");
}
