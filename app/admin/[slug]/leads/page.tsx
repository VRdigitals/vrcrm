import { redirect } from "next/navigation";
import { requireTeamSession } from "@/lib/session";
import {
  getAllClients,
  getClientBySlug,
  getLeadTabNames,
  getLeadsForClient,
  getLeadCountsByTab,
} from "@/lib/db";
import PortalHeader from "@/app/components/PortalHeader";
import LeadsBody from "@/app/components/LeadsBody";

export default async function AdminLeadsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { slug } = await params;
  const { tab } = await searchParams;

  const session = await requireTeamSession();
  if (!session) {
    redirect("/login");
  }

  const client = getClientBySlug(slug);
  if (!client) {
    redirect("/admin");
  }

  const allClients = getAllClients();
  const tabNames = getLeadTabNames(client.id);
  const counts = getLeadCountsByTab(client.id);
  const activeTab = tab && tabNames.includes(tab) ? tab : tabNames[0];
  const leads = activeTab ? getLeadsForClient(client.id, activeTab) : [];

  return (
    <main className="min-h-screen bg-slate-50">
      <PortalHeader
        title={client.display_name}
        subtitle="Leads (Admin)"
        nav={[
          { href: `/admin/${slug}`, label: "Dashboard", active: false },
          { href: `/admin/${slug}/leads`, label: "Leads", active: true },
        ]}
        accounts={allClients.map((c) => ({
          href: `/admin/${c.client_slug}/leads`,
          label: c.display_name,
          active: c.client_slug === slug,
        }))}
      />
      <LeadsBody
        basePath={`/admin/${slug}/leads`}
        tabNames={tabNames}
        counts={counts}
        activeTab={activeTab}
        leads={leads}
      />
    </main>
  );
}
