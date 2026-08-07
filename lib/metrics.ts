import type { DailyDataRow } from "./db";

export interface SummaryTotals {
  totalSpend: number;
  totalLeads: number;
  totalClicks: number;
  totalImpressions: number;
  avgCostPerLead: number;
  avgCpc: number;
}

export function computeSummary(rows: DailyDataRow[]): SummaryTotals {
  const totalSpend = rows.reduce((sum, r) => sum + r.spend, 0);
  const totalLeads = rows.reduce((sum, r) => sum + r.leads, 0);
  const totalClicks = rows.reduce((sum, r) => sum + r.clicks, 0);
  const totalImpressions = rows.reduce((sum, r) => sum + r.impressions, 0);

  return {
    totalSpend,
    totalLeads,
    totalClicks,
    totalImpressions,
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
