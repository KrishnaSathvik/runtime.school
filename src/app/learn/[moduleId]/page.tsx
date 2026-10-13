import { redirect } from "next/navigation";

/** Legacy module index — Runtime Learn opens the next lesson under /sql. */
export default function ModulePage() {
  redirect("/sql");
}
