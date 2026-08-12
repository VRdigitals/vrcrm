import { redirect } from "next/navigation";
import { requireClientAccess } from "@/lib/session";
import { getDailyDataForClient, getKnownCampaignNames } from "@/lib/db";
import { currentWeekRange, formatWeekLabel } from "@/lib/metrics";
import PortalHeader from "@/app/components/PortalHeader";
import DashboardBody from "@/app/components/DashboardBody";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Data-access is scoped by the authenticated session, not by the URL param:
  // a session without access to this specific client is refused here even
  // though `slug` in the URL could be anything.
  const access = await requireClientAccess(slug);
  if (!access) {
    redirect("/login");
  }
  const { client, accessibleClients } = access;

  const { fromDate, toDate } = currentWeekRange();
  const rows = getDailyDataForClient(client.id, { fromDate, toDate });
  const knownCampaigns = getKnownCampaignNames(client.id);
  const weekLabel = formatWeekLabel(fromDate, toDate);

  return (
    <main className="min-h-screen bg-slate-50">
      <PortalHeader
        title={client.display_name}
        subtitle={`Meta Ads performance · ${weekLabel}`}
        nav={[
          { href: `/${slug}/dashboard`, label: "Dashboard", active: true },
          { href: `/${slug}/leads`, label: "Leads", active: false },
        ]}
        accounts={accessibleClients.map((c) => ({
          href: `/${c.client_slug}/dashboard`,
          label: c.display_name,
          active: c.client_slug === slug,
        }))}
      />
      <DashboardBody
        rows={rows}
        knownCampaigns={knownCampaigns}
        weekLabel={weekLabel}
        reportHref={`/api/report/${slug}`}
      />
    </main>
  );
}
