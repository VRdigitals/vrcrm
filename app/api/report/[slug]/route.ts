import { NextResponse } from "next/server";
import { requireClientAccess, requireTeamSession } from "@/lib/session";
import { getClientBySlug, getDailyDataForClient, getKnownCampaignNames } from "@/lib/db";
import {
  computeCampaignTables,
  computeNoDeliveryCampaigns,
  computeSummary,
  currentMonthRange,
  formatDateDMY,
} from "@/lib/metrics";

/**
 * Downloadable CSV covering the WHOLE calendar month (unlike the dashboard's
 * page view, which is scoped to the current week) — same per-campaign
 * daily-table shape as on screen, just for the full month at once.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Team logins can pull a report for any client; a client login only for
  // a tenant it actually has access to.
  const team = await requireTeamSession();
  if (!team) {
    const access = await requireClientAccess(slug);
    if (!access) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const client = getClientBySlug(slug);
  if (!client) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { fromDate, toDate } = currentMonthRange();
  const rows = getDailyDataForClient(client.id, { fromDate, toDate });
  const knownCampaigns = getKnownCampaignNames(client.id);
  const tables = computeCampaignTables(rows);
  const noDelivery = computeNoDeliveryCampaigns(knownCampaigns, tables);
  const summary = computeSummary(rows);

  const monthLabel = new Date(`${toDate}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const lines: string[] = [];
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const row = (...vals: (string | number)[]) => lines.push(vals.map(esc).join(","));

  row(`${client.display_name} — Meta Ads Report — ${monthLabel}`);
  row("");

  for (const t of tables) {
    row(t.campaign_name);
    row("Date", "Day", "Spend", "Leads", "Clicks", "Reach", "Impressions", "Cost/Lead");
    for (const d of t.days) {
      row(
        formatDateDMY(d.date),
        d.dayName,
        d.spend.toFixed(2),
        d.leads,
        d.clicks,
        d.reach,
        d.impressions,
        d.leads > 0 ? d.cost_per_lead.toFixed(2) : ""
      );
    }
    row(
      "Total",
      "",
      t.totals.spend.toFixed(2),
      t.totals.leads,
      t.totals.clicks,
      t.totals.reach,
      t.totals.impressions,
      t.totals.leads > 0 ? t.totals.cost_per_lead.toFixed(2) : ""
    );
    row("");
  }

  if (noDelivery.length > 0) {
    row(`No delivery this month: ${noDelivery.join(", ")}`);
    row("");
  }

  row(`Account Total — ${monthLabel} (MTD)`);
  row("Total Spend", summary.totalSpend.toFixed(2));
  row("Total Leads", summary.totalLeads);
  row("Total Clicks", summary.totalClicks);
  row("Total Reach", summary.totalReach);
  row("Total Impressions", summary.totalImpressions);
  row("Avg Cost/Lead", summary.avgCostPerLead.toFixed(2));
  row("Avg CPC", summary.avgCpc.toFixed(2));

  const csv = lines.join("\n");
  const filename = `${slug}-${toDate.slice(0, 7)}-report.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
