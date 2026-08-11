"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { getUserByUsername, getAccessibleClients } from "@/lib/db";
import { getSession } from "@/lib/session";

export interface LoginState {
  error?: string;
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "Username and password are required." };
  }

  const user = getUserByUsername(username);
  if (!user) {
    return { error: "Invalid username or password." };
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return { error: "Invalid username or password." };
  }

  const session = await getSession();
  session.userId = user.id;
  session.username = user.username;
  session.role = user.role;

  let destination = "/admin";
  if (user.role === "client") {
    const accessibleClients = getAccessibleClients(user.id);
    if (accessibleClients.length === 0) {
      return { error: "This account has no ad accounts linked. Contact VR Digitals." };
    }
    destination = `/${accessibleClients[0].client_slug}/dashboard`;
  }

  await session.save();
  redirect(destination);
}

export async function logoutAction() {
  const session = await getSession();
  session.destroy();
  redirect("/login");
}
