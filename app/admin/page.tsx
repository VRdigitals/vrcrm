import { redirect } from "next/navigation";
import { requireTeamSession } from "@/lib/session";
import { getAllClients, getAllDailyData } from "@/lib/db";
import { computeSummary, currentMonthRange, formatCurrency, formatNumber } from "@/lib/metrics";
import { logoutAction } from "@/app/actions/auth";

export default async function AdminPage() {
  const session = await requireTeamSession();
  if (!session) {
    redirect("/login");
  }

  const clients = getAllClients();
  const { fromDate, toDate } = currentMonthRange();
  const allRows = getAllDailyData({ fromDate, toDate });

  const rowsByClient = new Map<number, typeof allRows>();
  for (const row of allRows) {
    const arr = rowsByClient.get(row.client_id) ?? [];
    arr.push(row);
    rowsByClient.set(row.client_id, arr);
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-base font-semibold text-slate-900">VR Digitals — Admin</h1>
            <p className="text-xs text-slate-500">All clients, current month</p>
          </div>
          <form action={logoutAction}>
            <button type="submit" className="text-sm text-slate-500 hover:text-slate-900">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {clients.length === 0 ? (
          <p className="text-sm text-slate-500">No clients configured yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Ad Account</th>
                  <th className="px-4 py-3 font-medium">Spend</th>
                  <th className="px-4 py-3 font-medium">Leads</th>
                  <th className="px-4 py-3 font-medium">Cost / Lead</th>
                  <th className="px-4 py-3 font-medium">Avg. CPC</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => {
                  const rows = rowsByClient.get(c.id) ?? [];
                  const summary = computeSummary(rows);
                  return (
                    <tr key={c.id} className="border-b border-slate-100">
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {c.display_name}
                        <span className="ml-2 text-xs text-slate-400">
                          /{c.client_slug}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {c.meta_ad_account_id ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatCurrency(summary.totalSpend)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatNumber(summary.totalLeads)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatCurrency(summary.avgCostPerLead)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatCurrency(summary.avgCpc)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
