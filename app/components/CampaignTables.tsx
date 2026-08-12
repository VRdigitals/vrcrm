import type { CampaignTable } from "@/lib/metrics";
import { formatCurrency, formatNumber, formatDateDMY } from "@/lib/metrics";

/**
 * Per-campaign day-by-day tables, stacked vertically (the page scrolls
 * through them) — mirrors the manual tracking spreadsheet format: a
 * colored campaign header bar, a dark column-header row, one row per day,
 * then a highlighted totals row.
 */
export default function CampaignTables({ tables }: { tables: CampaignTable[] }) {
  if (tables.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400 shadow-sm">
        No campaign data yet for this month.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {tables.map((table) => (
        <div
          key={table.campaign_name}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div
            className="px-5 py-3"
            style={{ background: "var(--brand-gradient)" }}
          >
            <h3 className="text-sm font-bold text-white">{table.campaign_name}</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="bg-slate-900 text-xs font-semibold uppercase tracking-wide text-white">
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Day</th>
                  <th className="px-4 py-2.5">Spend</th>
                  <th className="px-4 py-2.5">Leads</th>
                  <th className="px-4 py-2.5">Clicks</th>
                  <th className="px-4 py-2.5">Reach</th>
                  <th className="px-4 py-2.5">Impressions</th>
                  <th className="px-4 py-2.5">Cost / Lead</th>
                </tr>
              </thead>
              <tbody>
                {table.days.map((d) => (
                  <tr key={d.date} className="border-b border-slate-100">
                    <td className="px-4 py-2.5 text-slate-600">
                      {formatDateDMY(d.date)}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{d.dayName}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-800">
                      {formatCurrency(d.spend)}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {d.leads > 0 ? formatNumber(d.leads) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {formatNumber(d.clicks)}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {formatNumber(d.reach)}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {formatNumber(d.impressions)}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {d.leads > 0 ? formatCurrency(d.cost_per_lead) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-emerald-600 text-sm font-bold text-white">
                  <td className="px-4 py-3" colSpan={2}>
                    Total
                  </td>
                  <td className="px-4 py-3">{formatCurrency(table.totals.spend)}</td>
                  <td className="px-4 py-3">{formatNumber(table.totals.leads)}</td>
                  <td className="px-4 py-3">{formatNumber(table.totals.clicks)}</td>
                  <td className="px-4 py-3">{formatNumber(table.totals.reach)}</td>
                  <td className="px-4 py-3">
                    {formatNumber(table.totals.impressions)}
                  </td>
                  <td className="px-4 py-3">
                    {table.totals.leads > 0
                      ? formatCurrency(table.totals.cost_per_lead)
                      : "—"}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
