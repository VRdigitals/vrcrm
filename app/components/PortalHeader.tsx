import Link from "next/link";
import Logo from "./Logo";
import { logoutAction } from "@/app/actions/auth";

export default function PortalHeader({
  title,
  subtitle,
  nav,
  accounts,
}: {
  title: string;
  subtitle: string;
  nav?: { href: string; label: string; active: boolean }[];
  /** Ad-account tabs, shown only when a login has access to more than one. */
  accounts?: { href: string; label: string; active: boolean }[];
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <Logo />
            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-slate-900">
                {title}
              </h1>
              <p className="text-xs font-medium text-slate-400">{subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {nav?.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                  item.active
                    ? "bg-slate-900 text-white"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <form action={logoutAction}>
              <button
                type="submit"
                className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        {accounts && accounts.length > 1 && (
          <div className="flex gap-1 overflow-x-auto pb-3">
            {accounts.map((account) => (
              <Link
                key={account.href}
                href={account.href}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold transition-colors duration-150 ${
                  account.active
                    ? "text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
                style={account.active ? { background: "var(--brand-gradient)" } : undefined}
              >
                {account.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
