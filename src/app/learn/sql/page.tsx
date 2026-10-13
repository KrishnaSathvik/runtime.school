import { redirect } from "next/navigation";

/** `/learn/sql` is the subject prefix for SEO lessons; send browsers to the SQL dashboard. */
export default function Page() {
  redirect("/sql");
}
