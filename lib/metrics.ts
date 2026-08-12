import type { DailyDataRow } from "./db";

export interface SummaryTotals {
  totalSpend: number;
  totalLeads: number;
  totalClicks: number;
  totalImpressions: number;
  totalReach: number;
  avgCostPerLead: number;
  avgCpc: number;
}

export function computeSummary(rows: DailyDataRow[]): SummaryTotals {
  const totalSpend = rows.reduce((sum, r) => sum + r.spend, 0);
  const totalLeads = rows.reduce((sum, r) => sum + r.leads, 0);
  const totalClicks = rows.reduce((sum, r) => sum + r.clicks, 0);
  const totalImpressions = rows.reduce((sum, r) => sum + r.impressions, 0);
  const totalReach = rows.reduce((sum, r) => sum + r.reach, 0);

  return {
    totalSpend,
    totalLeads,
    totalClicks,
    totalImpressions,
    totalReach,
    avgCostPerLead: totalLeads > 0 ? totalSpend / totalLeads : 0,
    avgCpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
  };
}

export interface CampaignBreakdownRow {
  campaign_name: string;
  spend: number;
  leads: number;
  clicks: number;
  impressions: number;
  cost_per_lead: number;
}

export function computeCampaignBreakdown(
  rows: DailyDataRow[]
): CampaignBreakdownRow[] {
  const byCampaign = new Map<string, CampaignBreakdownRow>();

  for (const row of rows) {
    const existing = byCampaign.get(row.campaign_name) ?? {
      campaign_name: row.campaign_name,
      spend: 0,
      leads: 0,
      clicks: 0,
      impressions: 0,
      cost_per_lead: 0,
    };
    existing.spend += row.spend;
    existing.leads += row.leads;
    existing.clicks += row.clicks;
    existing.impressions += row.impressions;
    byCampaign.set(row.campaign_name, existing);
  }

  return Array.from(byCampaign.values())
    .map((c) => ({
      ...c,
      cost_per_lead: c.leads > 0 ? c.spend / c.leads : 0,
    }))
    .sort((a, b) => b.spend - a.spend);
}

export interface CampaignDayRow {
  date: string;
  dayName: string;
  spend: number;
  leads: number;
  clicks: number;
  reach: number;
  impressions: number;
  cost_per_lead: number;
}

export interface CampaignTable {
  campaign_name: string;
  days: CampaignDayRow[];
  totals: {
    spend: number;
    leads: number;
    clicks: number;
    reach: number;
    impressions: number;
    cost_per_lead: number;
  };
}

/**
 * One table per campaign, each with a day-by-day breakdown and a totals
 * row — mirrors the manual daily-tracking spreadsheet format clients are
 * used to, so the dashboard reads the same way at a glance.
 */
export function computeCampaignTables(rows: DailyDataRow[]): CampaignTable[] {
  const byCampaign = new Map<string, DailyDataRow[]>();
  for (const row of rows) {
    const arr = byCampaign.get(row.campaign_name) ?? [];
    arr.push(row);
    byCampaign.set(row.campaign_name, arr);
  }

  const tables = Array.from(byCampaign.entries()).map(([campaign_name, campaignRows]) => {
    const sorted = [...campaignRows].sort((a, b) => a.date.localeCompare(b.date));
    const days: CampaignDayRow[] = sorted.map((r) => ({
      date: r.date,
      dayName: new Date(`${r.date}T00:00:00Z`).toLocaleDateString("en-US", {
        weekday: "long",
        timeZone: "UTC",
      }),
      spend: r.spend,
      leads: r.leads,
      clicks: r.clicks,
      reach: r.reach,
      impressions: r.impressions,
      cost_per_lead: r.cost_per_lead,
    }));

    const totals = days.reduce(
      (acc, d) => ({
        spend: acc.spend + d.spend,
        leads: acc.leads + d.leads,
        clicks: acc.clicks + d.clicks,
        reach: acc.reach + d.reach,
        impressions: acc.impressions + d.impressions,
        cost_per_lead: 0,
      }),
      { spend: 0, leads: 0, clicks: 0, reach: 0, impressions: 0, cost_per_lead: 0 }
    );
    totals.cost_per_lead = totals.leads > 0 ? totals.spend / totals.leads : 0;

    return { campaign_name, days, totals };
  });

  return tables.sort((a, b) => b.totals.spend - a.totals.spend);
}

/**
 * Campaigns known to exist on the account (from the full roster pulled
 * alongside insights) that had no daily_data rows this period — i.e. no
 * delivery at all, not just zero leads.
 */
export function computeNoDeliveryCampaigns(
  knownCampaignNames: string[],
  tables: CampaignTable[]
): string[] {
  const withData = new Set(tables.map((t) => t.campaign_name));
  return knownCampaignNames.filter((name) => !withData.has(name)).sort();
}

export interface DailyTrendPoint {
  date: string;
  spend: number;
  leads: number;
  costPerLead: number;
}

export function computeDailyTrend(rows: DailyDataRow[]): DailyTrendPoint[] {
  const byDate = new Map<string, { spend: number; leads: number }>();

  for (const row of rows) {
    const existing = byDate.get(row.date) ?? { spend: 0, leads: 0 };
    existing.spend += row.spend;
    existing.leads += row.leads;
    byDate.set(row.date, existing);
  }

  return Array.from(byDate.entries())
    .map(([date, v]) => ({
      date,
      spend: v.spend,
      leads: v.leads,
      costPerLead: v.leads > 0 ? v.spend / v.leads : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** YYYY-MM-DD bounds for the current calendar month. */
export function currentMonthRange(): { fromDate: string; toDate: string } {
  const now = new Date();
  const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const last = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { fromDate: fmt(first), toDate: fmt(last) };
}

/**
 * Ad spend currency varies per Meta ad account, so we don't assume USD here —
 * format as a plain decimal and let the UI attach whatever currency label
 * the client's ad account actually uses.
 */
export function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

/** "YYYY-MM-DD" -> "DD/MM/YY" */
export function formatDateDMY(date: string): string {
  return `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(2, 4)}`;
}

/** "YYYY-MM-DD" -> "DD/MM" (compact, for chart axis labels) */
export function formatDateDM(date: string): string {
  return `${date.slice(8, 10)}/${date.slice(5, 7)}`;
}
