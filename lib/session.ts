import "server-only";
import { cookies } from "next/headers";
import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import type { Role } from "./db";
import { getAccessibleClients } from "./db";

export interface SessionData {
  userId?: number;
  username?: string;
  role?: Role;
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET env var must be set to a random string of at least 32 characters."
    );
  }
  return secret;
}

const sessionOptions: SessionOptions = {
  cookieName: "vrd_portal_session",
  password: "", // set at call-time, see getSession()
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, {
    ...sessionOptions,
    password: getSecret(),
  });
}

/**
 * Returns the session plus the requested client + the full list of clients
 * this user can switch between (for the account-tab UI), but ONLY if the
 * session's user actually has access to `slug`. A client-role login may
 * have access to more than one ad-account tenant (agency staff covering
 * several accounts) — access is always checked against the user_clients
 * join table server-side, never trusted from the URL.
 */
export async function requireClientAccess(slug: string) {
  const session = await getSession();
  if (session.role !== "client" || session.userId == null) {
    return null;
  }
  const accessibleClients = getAccessibleClients(session.userId);
  const client = accessibleClients.find((c) => c.client_slug === slug);
  if (!client) {
    return null;
  }
  return { session, client, accessibleClients };
}

/** Returns the session only if it belongs to an internal team user. */
export async function requireTeamSession() {
  const session = await getSession();
  if (session.role === "team") {
    return session;
  }
  return null;
}
