import { redirect } from "next/navigation";

/** Practice is one question list; this old index now opens it. */
export default function Page() {
  redirect("/practice/questions");
}
