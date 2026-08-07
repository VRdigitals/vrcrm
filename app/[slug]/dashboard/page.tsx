import { redirect } from "next/navigation";
import { requireClientSession } from "@/lib/session";
import {
  getClientBySlug,
  getDailyDataForClient,
  getKnownCampaignNames,
} from "@/lib/db";
import {
  computeCampaignTables,
  computeDailyTrend,
  computeNoDeliveryCampaigns,
  computeSummary,
  currentMonthRange,
  formatCurrency,
  formatNumber,
} from "@/lib/metrics";
import { logoutAction } from "@/app/actions/auth";
import Logo from "@/app/components/Logo";
import {
  IconCurrency,
  IconUsers,
  IconTag,
  IconCursorClick,
} from "@/app/components/icons";
import CostPerLeadChart from "./CostPerLeadChart";
import SpendLeadsChart from "./SpendLeadsChart";
import CampaignTables from "./CampaignTables";

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
  const campaignTables = computeCampaignTables(rows);
  const trend = computeDailyTrend(rows);
  const knownCampaigns = getKnownCampaignNames(client.id);
  const noDeliveryCampaigns = computeNoDeliveryCampaigns(knownCampaigns, campaignTables);
  const monthLabel = new Date(`${toDate}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Logo />
            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-slate-900">
                {client.display_name}
              </h1>
              <p className="text-xs font-medium text-slate-400">
                Meta Ads performance · {monthLabel}
              </p>
            </div>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Total Spend"
            value={formatCurrency(summary.totalSpend)}
            icon={<IconCurrency className="h-5 w-5" />}
            accent="var(--brand-spend)"
            accentBg="#eff6ff"
          />
          <StatCard
            label="Total Leads"
            value={formatNumber(summary.totalLeads)}
            icon={<IconUsers className="h-5 w-5" />}
            accent="var(--brand-leads)"
            accentBg="#ecfdf5"
          />
          <StatCard
            label="Avg. Cost / Lead"
            value={formatCurrency(summary.avgCostPerLead)}
            icon={<IconTag className="h-5 w-5" />}
            accent="var(--brand-cost)"
            accentBg="#fffbeb"
          />
          <StatCard
            label="Avg. CPC"
            value={formatCurrency(summary.avgCpc)}
            icon={<IconCursorClick className="h-5 w-5" />}
            accent="var(--brand-clicks)"
            accentBg="#f5f3ff"
          />
        </section>

        <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-3">
            <h2 className="mb-1 text-base font-bold text-slate-900">
              Spend vs. Leads
            </h2>
            <p className="mb-4 text-xs text-slate-400">Daily breakdown this month</p>
            <SpendLeadsChart data={trend} />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <h2 className="mb-1 text-base font-bold text-slate-900">
              Cost per Lead
            </h2>
            <p className="mb-4 text-xs text-slate-400">Daily trend this month</p>
            <CostPerLeadChart data={trend} />
          </div>
        </section>

        <section className="mt-6">
          <h2 className="mb-4 text-base font-bold text-slate-900">
            Campaign Breakdown
          </h2>
          <CampaignTables tables={campaignTables} />

          {noDeliveryCampaigns.length > 0 && (
            <p className="mt-4 text-sm text-slate-400">
              <span className="font-semibold text-slate-500">
                No delivery this month:
              </span>{" "}
              {noDeliveryCampaigns.join(", ")}
            </p>
          )}
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="px-6 py-4" style={{ background: "var(--brand-gradient)" }}>
            <h2 className="text-sm font-bold text-white">
              Account Total — {monthLabel} (MTD)
            </h2>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 p-6 sm:grid-cols-4">
            <AccountTotalStat label="Total Spend" value={formatCurrency(summary.totalSpend)} />
            <AccountTotalStat label="Total Leads" value={formatNumber(summary.totalLeads)} />
            <AccountTotalStat label="Total Clicks" value={formatNumber(summary.totalClicks)} />
            <AccountTotalStat label="Total Reach" value={formatNumber(summary.totalReach)} />
            <AccountTotalStat
              label="Total Impressions"
              value={formatNumber(summary.totalImpressions)}
            />
            <AccountTotalStat
              label="Avg. Cost / Lead"
              value={formatCurrency(summary.avgCostPerLead)}
            />
            <AccountTotalStat label="Avg. CPC" value={formatCurrency(summary.avgCpc)} />
          </dl>
        </section>
      </div>
    </main>
  );
}

function AccountTotalStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="mt-1 text-xl font-extrabold tracking-tight text-slate-900">
        {value}
      </dd>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
  accentBg,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: string;
  accentBg: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div
        className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
        style={{ background: accentBg, color: accent }}
      >
        {icon}
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">
        {value}
      </p>
    </div>
  );
}
