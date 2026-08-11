import { redirect } from "next/navigation";
import { requireTeamSession } from "@/lib/session";
import { getAllClients, getClientBySlug, getDailyDataForClient, getKnownCampaignNames } from "@/lib/db";
import { currentMonthRange } from "@/lib/metrics";
import PortalHeader from "@/app/components/PortalHeader";
import DashboardBody from "@/app/components/DashboardBody";

export default async function AdminClientPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const session = await requireTeamSession();
  if (!session) {
    redirect("/login");
  }

  const client = getClientBySlug(slug);
  if (!client) {
    redirect("/admin");
  }

  const allClients = getAllClients();
  const { fromDate, toDate } = currentMonthRange();
  const rows = getDailyDataForClient(client.id, { fromDate, toDate });
  const knownCampaigns = getKnownCampaignNames(client.id);
  const monthLabel = new Date(`${toDate}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <main className="min-h-screen bg-slate-50">
      <PortalHeader
        title={client.display_name}
        subtitle={`Meta Ads performance · ${monthLabel} (Admin)`}
        nav={[
          { href: `/admin/${slug}`, label: "Dashboard", active: true },
          { href: `/admin/${slug}/leads`, label: "Leads", active: false },
        ]}
        accounts={allClients.map((c) => ({
          href: `/admin/${c.client_slug}`,
          label: c.display_name,
          active: c.client_slug === slug,
        }))}
      />
      <DashboardBody rows={rows} knownCampaigns={knownCampaigns} monthLabel={monthLabel} />
    </main>
  );
}
