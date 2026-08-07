import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function Home() {
  const session = await getSession();
  if (session.role === "client" && session.clientSlug) {
    redirect(`/${session.clientSlug}/dashboard`);
  }
  if (session.role === "team") {
    redirect("/admin");
  }
  redirect("/login");
}
