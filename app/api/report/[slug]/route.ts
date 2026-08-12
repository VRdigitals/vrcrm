import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { requireClientAccess, requireTeamSession } from "@/lib/session";
import { getClientBySlug, getDailyDataForClient, getKnownCampaignNames } from "@/lib/db";
import {
  computeCampaignTables,
  computeNoDeliveryCampaigns,
  computeSummary,
  currentMonthRange,
  formatCurrency,
  formatDateDMY,
  formatNumber,
  type CampaignTable,
  type SummaryTotals,
} from "@/lib/metrics";
import type { ClientRecord } from "@/lib/db";

// pdfkit touches the filesystem (font metrics) — needs the Node runtime,
// not edge.
export const runtime = "nodejs";

const COLS = ["Date", "Day", "Spend", "Leads", "Clicks", "Reach", "Impressions", "Cost/Lead"];
const COL_WIDTHS = [62, 72, 62, 50, 55, 65, 78, 68];
const LEFT = 36;
const RIGHT_EDGE = 36 + COL_WIDTHS.reduce((a, b) => a + b, 0);

/**
 * Downloadable PDF covering the WHOLE calendar month (unlike the
 * dashboard's page view, which is scoped to the current week) — same
 * per-campaign daily-table shape as on screen, just for the full month.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

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

  const pdf = await renderPdf({ client, monthLabel, tables, noDelivery, summary });
  const filename = `${slug}-${toDate.slice(0, 7)}-report.pdf`;

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function renderPdf(opts: {
  client: ClientRecord;
  monthLabel: string;
  tables: CampaignTable[];
  noDelivery: string[];
  summary: SummaryTotals;
}): Promise<Buffer> {
  const { client, monthLabel, tables, noDelivery, summary } = opts;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 36, size: "A4", layout: "landscape" });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(16).fillColor("#0f172a").text(`${client.display_name} — Meta Ads Report`);
    doc.fontSize(11).fillColor("#64748b").text(monthLabel);
    doc.moveDown(1);

    for (const table of tables) {
      ensureSpace(doc, 26 + 20 + table.days.length * 16 + 20);
      drawCampaignHeader(doc, table.campaign_name);
      drawTableHeaderRow(doc);
      for (const d of table.days) {
        drawTableRow(doc, [
          formatDateDMY(d.date),
          d.dayName,
          formatCurrency(d.spend),
          d.leads > 0 ? formatNumber(d.leads) : "—",
          formatNumber(d.clicks),
          formatNumber(d.reach),
          formatNumber(d.impressions),
          d.leads > 0 ? formatCurrency(d.cost_per_lead) : "—",
        ]);
      }
      drawTableRow(
        doc,
        [
          "Total",
          "",
          formatCurrency(table.totals.spend),
          formatNumber(table.totals.leads),
          formatNumber(table.totals.clicks),
          formatNumber(table.totals.reach),
          formatNumber(table.totals.impressions),
          table.totals.leads > 0 ? formatCurrency(table.totals.cost_per_lead) : "—",
        ],
        { bold: true, fill: "#059669", color: "#ffffff" }
      );
      doc.moveDown(1.1);
    }

    if (noDelivery.length > 0) {
      ensureSpace(doc, 30);
      doc
        .fontSize(9)
        .fillColor("#94a3b8")
        .text(`No delivery this month: ${noDelivery.join(", ")}`, LEFT, doc.y, {
          width: RIGHT_EDGE - LEFT,
        });
      doc.moveDown(1);
    }

    ensureSpace(doc, 150);
    drawCampaignHeader(doc, `Account Total — ${monthLabel} (MTD)`);
    doc.moveDown(0.4);
    doc.fontSize(10).fillColor("#334155");
    const stats: [string, string][] = [
      ["Total Spend", formatCurrency(summary.totalSpend)],
      ["Total Leads", formatNumber(summary.totalLeads)],
      ["Total Clicks", formatNumber(summary.totalClicks)],
      ["Total Reach", formatNumber(summary.totalReach)],
      ["Total Impressions", formatNumber(summary.totalImpressions)],
      ["Avg. Cost / Lead", formatCurrency(summary.avgCostPerLead)],
      ["Avg. CPC", formatCurrency(summary.avgCpc)],
    ];
    for (const [label, value] of stats) {
      doc.text(`${label}: ${value}`, LEFT, doc.y);
    }

    doc.end();
  });
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y + needed > bottom) {
    doc.addPage();
  }
}

function drawCampaignHeader(doc: PDFKit.PDFDocument, text: string) {
  const y = doc.y;
  doc.rect(LEFT, y, RIGHT_EDGE - LEFT, 22).fill("#0ea5e9");
  doc.fillColor("#ffffff").fontSize(11).text(text, LEFT + 8, y + 6, {
    width: RIGHT_EDGE - LEFT - 16,
  });
  doc.y = y + 26;
}

function drawTableHeaderRow(doc: PDFKit.PDFDocument) {
  const y = doc.y;
  doc.rect(LEFT, y, RIGHT_EDGE - LEFT, 16).fill("#0f172a");
  let x = LEFT;
  doc.fontSize(8).fillColor("#ffffff");
  COLS.forEach((label, i) => {
    doc.text(label, x + 4, y + 4, { width: COL_WIDTHS[i] - 6 });
    x += COL_WIDTHS[i];
  });
  doc.y = y + 16;
}

function drawTableRow(
  doc: PDFKit.PDFDocument,
  cells: string[],
  opts?: { bold?: boolean; fill?: string; color?: string }
) {
  const y = doc.y;
  if (opts?.fill) {
    doc.rect(LEFT, y, RIGHT_EDGE - LEFT, 16).fill(opts.fill);
  }
  let x = LEFT;
  doc.fontSize(8).fillColor(opts?.color ?? "#334155");
  cells.forEach((cell, i) => {
    doc.text(cell, x + 4, y + 4, { width: COL_WIDTHS[i] - 6 });
    x += COL_WIDTHS[i];
  });
  doc.y = y + 16;
}
