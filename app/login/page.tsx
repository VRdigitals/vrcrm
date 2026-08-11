import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getAccessibleClients } from "@/lib/db";
import Logo from "@/app/components/Logo";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const session = await getSession();
  if (session.role === "client" && session.userId != null) {
    const accessibleClients = getAccessibleClients(session.userId);
    if (accessibleClients.length > 0) {
      redirect(`/${accessibleClients[0].client_slug}/dashboard`);
    }
  }
  if (session.role === "team") {
    redirect("/admin");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo size={52} />
          <h1 className="mt-4 text-lg font-extrabold tracking-tight text-slate-900">
            VR Digitals
          </h1>
          <p className="mt-1 text-sm text-slate-400">Client Portal</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
