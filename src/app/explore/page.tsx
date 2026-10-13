import { redirect } from "next/navigation";

/** Tools are listed in the SQL sidebar. */
export default function Page() {
  redirect("/sql");
}
