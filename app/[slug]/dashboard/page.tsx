import { redirect } from "next/navigation";
import { requireClientSession } from "@/lib/session";
import { getClientBySlug, getDailyDataForClient } from "@/lib/db";
import {
  computeCampaignBreakdown,
  computeDailyTrend,
  computeSummary,
  currentMonthRange,
  formatCurrency,
  formatNumber,
} from "@/lib/metrics";
import { logoutAction } from "@/app/actions/auth";
import CostPerLeadChart from "./CostPerLeadChart";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Data-access is scoped by the authenticated session, not by the URL param:
  // a session for a different client (or no session) is refused here even
  // though `slug` in the URL could be anything.
  const session = await requireClientSession(slug);
  if (!session) {
    redirect("/login");
  }

  const client = getClientBySlug(slug);
  if (!client) {
    redirect("/login");
  }

  const { fromDate, toDate } = currentMonthRange();
  const rows = getDailyDataForClient(client.id, { fromDate, toDate });
  const summary = computeSummary(rows);
  const campaigns = computeCampaignBreakdown(rows);
  const trend = computeDailyTrend(rows);

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-base font-semibold text-slate-900">
              {client.display_name}
            </h1>
            <p className="text-xs text-slate-500">Meta Ads performance</p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="text-sm text-slate-500 hover:text-slate-900"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <SummaryCard label="Total Spend" value={formatCurrency(summary.totalSpend)} />
          <SummaryCard label="Total Leads" value={formatNumber(summary.totalLeads)} />
          <SummaryCard
            label="Avg. Cost / Lead"
            value={formatCurrency(summary.avgCostPerLead)}
          />
          <SummaryCard label="Avg. CPC" value={formatCurrency(summary.avgCpc)} />
        </section>

        <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">
            Cost per Lead — Daily Trend
          </h2>
          <CostPerLeadChart data={trend} />
        </section>

        <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">
            Campaign Breakdown
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-4 font-medium">Campaign</th>
                  <th className="py-2 pr-4 font-medium">Spend</th>
                  <th className="py-2 pr-4 font-medium">Leads</th>
                  <th className="py-2 pr-4 font-medium">Clicks</th>
                  <th className="py-2 pr-4 font-medium">Impressions</th>
                  <th className="py-2 pr-4 font-medium">Cost / Lead</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No campaign data yet for this month.
                    </td>
                  </tr>
                ) : (
                  campaigns.map((c) => (
                    <tr key={c.campaign_name} className="border-b border-slate-100">
                      <td className="py-2 pr-4 text-slate-800">{c.campaign_name}</td>
                      <td className="py-2 pr-4 text-slate-600">
                        {formatCurrency(c.spend)}
                      </td>
                      <td className="py-2 pr-4 text-slate-600">
                        {formatNumber(c.leads)}
                      </td>
                      <td className="py-2 pr-4 text-slate-600">
                        {formatNumber(c.clicks)}
                      </td>
                      <td className="py-2 pr-4 text-slate-600">
                        {formatNumber(c.impressions)}
                      </td>
                      <td className="py-2 pr-4 text-slate-600">
                        {formatCurrency(c.cost_per_lead)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
