import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getAccessibleClients } from "@/lib/db";

export default async function Home() {
  const session = await getSession();
  if (session.role === "client" && session.userId != null) {
    const accessibleClients = getAccessibleClients(session.userId);
    if (accessibleClients.length > 0) {
      redirect(`/${accessibleClients[0].client_slug}/dashboard`);
    }
  }
  if (session.role === "team") {
    redirect("/admin");
  }
  redirect("/login");
}
