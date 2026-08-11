import Link from "next/link";
import type { LeadRecord } from "@/lib/db";

/**
 * The full per-account leads view: tab pills (per campaign-tab) and a
 * table. Shared between a client's own leads page and the team admin
 * view so both show exactly the same thing.
 */
export default function LeadsBody({
  basePath,
  tabNames,
  counts,
  activeTab,
  leads,
}: {
  /** e.g. "/excellanz/leads" or "/admin/excellanz/leads" */
  basePath: string;
  tabNames: string[];
  counts: Record<string, number>;
  activeTab: string | undefined;
  leads: LeadRecord[];
}) {
  const q1Label = leads.find((l) => l.question1_label)?.question1_label;
  const q2Label = leads.find((l) => l.question2_label)?.question2_label;
  const totalLeads = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-extrabold tracking-tight text-slate-900">Leads</h2>
        <span className="text-sm font-medium text-slate-400">
          {totalLeads.toLocaleString()} total
        </span>
      </div>

      {tabNames.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400 shadow-sm">
          No leads recorded yet.
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {tabNames.map((name) => {
              const isActive = name === activeTab;
              return (
                <Link
                  key={name}
                  href={`${basePath}?tab=${encodeURIComponent(name)}`}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-150 ${
                    isActive
                      ? "text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                  style={isActive ? { background: "var(--brand-gradient)" } : undefined}
                >
                  {name}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-xs ${
                      isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {counts[name] ?? 0}
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="max-h-[70vh] overflow-auto">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="sticky top-0 z-[1]">
                  <tr className="bg-slate-900 text-xs font-semibold uppercase tracking-wide text-white">
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5">Platform</th>
                    <th className="px-4 py-2.5">Name</th>
                    <th className="px-4 py-2.5">Phone</th>
                    <th className="px-4 py-2.5">WhatsApp</th>
                    <th className="px-4 py-2.5">Email</th>
                    <th className="px-4 py-2.5">City</th>
                    {q1Label && <th className="px-4 py-2.5">{formatLabel(q1Label)}</th>}
                    {q2Label && <th className="px-4 py-2.5">{formatLabel(q2Label)}</th>}
                  </tr>
                </thead>
                <tbody>
                  {leads.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-slate-400">
                        No leads in this tab yet.
                      </td>
                    </tr>
                  ) : (
                    leads.map((lead) => (
                      <tr key={lead.id} className="border-b border-slate-100">
                        <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                          {lead.created_time}
                        </td>
                        <td className="px-4 py-2.5">
                          <PlatformBadge platform={lead.platform} />
                        </td>
                        <td className="px-4 py-2.5 font-medium text-slate-800">
                          {lead.full_name ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                          {lead.phone ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                          {lead.whatsapp_number ?? "—"}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">{lead.email ?? "—"}</td>
                        <td className="px-4 py-2.5 text-slate-600">{lead.city ?? "—"}</td>
                        {q1Label && (
                          <td className="px-4 py-2.5 text-slate-600">
                            {formatLabel(lead.question1_answer)}
                          </td>
                        )}
                        {q2Label && (
                          <td className="px-4 py-2.5 text-slate-600">
                            {formatLabel(lead.question2_answer)}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function formatLabel(s: string | null | undefined): string {
  if (!s) return "—";
  return s
    .replace(/_/g, " ")
    .replace(/\?+$/, "")
    .replace(/^./, (c) => c.toUpperCase());
}

function PlatformBadge({ platform }: { platform: string | null }) {
  if (!platform) return <span className="text-slate-400">—</span>;
  const p = platform.toLowerCase();
  const styles: Record<string, string> = {
    ig: "bg-pink-50 text-pink-600",
    fb: "bg-blue-50 text-blue-600",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${
        styles[p] ?? "bg-slate-100 text-slate-600"
      }`}
    >
      {platform}
    </span>
  );
}
