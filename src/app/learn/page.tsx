import { redirect } from "next/navigation";

/** The SQL course home moved to /sql. */
export default function Page() {
  redirect("/sql");
}
