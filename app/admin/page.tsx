import { redirect } from "next/navigation";
import { requireTeamSession } from "@/lib/session";
import { getAllClients, getAllDailyData } from "@/lib/db";
import { computeSummary, currentMonthRange, formatCurrency, formatNumber } from "@/lib/metrics";
import { logoutAction } from "@/app/actions/auth";
import Logo from "@/app/components/Logo";

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

  const totalSpend = allRows.reduce((s, r) => s + r.spend, 0);
  const totalLeads = allRows.reduce((s, r) => s + r.leads, 0);

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Logo />
            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-slate-900">
                VR Digitals — Admin
              </h1>
              <p className="text-xs font-medium text-slate-400">
                All clients · current month
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
        <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Active Clients
            </p>
            <p className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">
              {clients.length}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Total Spend
            </p>
            <p className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">
              {formatCurrency(totalSpend)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Total Leads
            </p>
            <p className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">
              {formatNumber(totalLeads)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Blended Cost / Lead
            </p>
            <p className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">
              {formatCurrency(totalLeads > 0 ? totalSpend / totalLeads : 0)}
            </p>
          </div>
        </section>

        {clients.length === 0 ? (
          <p className="text-sm text-slate-500">No clients configured yet.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    <th className="px-4 py-3">Client</th>
                    <th className="px-4 py-3">Ad Account</th>
                    <th className="px-4 py-3">Spend</th>
                    <th className="px-4 py-3">Leads</th>
                    <th className="px-4 py-3">Cost / Lead</th>
                    <th className="px-4 py-3">Avg. CPC</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) => {
                    const rows = rowsByClient.get(c.id) ?? [];
                    const summary = computeSummary(rows);
                    const initials = c.display_name
                      .split(" ")
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();
                    return (
                      <tr key={c.id} className="border-b border-slate-100">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                              style={{ background: "var(--brand-gradient)" }}
                            >
                              {initials}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-800">
                                {c.display_name}
                              </div>
                              <div className="text-xs text-slate-400">
                                /{c.client_slug}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {c.meta_ad_account_id ?? "—"}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700">
                          {formatCurrency(summary.totalSpend)}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {formatNumber(summary.totalLeads)}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700">
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
          </div>
        )}
      </div>
    </main>
  );
}
