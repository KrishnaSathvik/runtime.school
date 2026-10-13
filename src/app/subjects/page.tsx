import { redirect } from "next/navigation";

/** All subjects live on the landing page. */
export default function Page() {
  redirect("/");
}
