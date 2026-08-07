"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { getUserByUsername, getClientById } from "@/lib/db";
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
    if (user.client_id == null) {
      return { error: "This account is not linked to a client. Contact VR Digitals." };
    }
    const client = getClientById(user.client_id);
    if (!client) {
      return { error: "Client record not found. Contact VR Digitals." };
    }
    session.clientId = client.id;
    session.clientSlug = client.client_slug;
    destination = `/${client.client_slug}/dashboard`;
  } else {
    session.clientId = null;
    session.clientSlug = null;
  }

  await session.save();
  redirect(destination);
}

export async function logoutAction() {
  const session = await getSession();
  session.destroy();
  redirect("/login");
}
