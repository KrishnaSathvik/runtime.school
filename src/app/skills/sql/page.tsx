import { redirect } from "next/navigation";

/** The SQL overview is now the SQL dashboard. */
export default function Page() {
  redirect("/sql");
}
