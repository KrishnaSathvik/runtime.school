import { redirect } from "next/navigation";

/** Legacy bookmark — continuation lives on Learn. */
export default function MyLearningPage() {
  redirect("/sql");
}
