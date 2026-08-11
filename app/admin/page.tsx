import { redirect } from "next/navigation";
import { requireTeamSession } from "@/lib/session";
import { getAllClients } from "@/lib/db";

export default async function AdminPage() {
  const session = await requireTeamSession();
  if (!session) {
    redirect("/login");
  }

  const clients = getAllClients();
  if (clients.length === 0) {
    redirect("/login");
  }
  redirect(`/admin/${clients[0].client_slug}`);
}
