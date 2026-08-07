import "server-only";
import { cookies } from "next/headers";
import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import type { Role } from "./db";

export interface SessionData {
  userId?: number;
  username?: string;
  role?: Role;
  /** null for team users, the owning client's id for client users */
  clientId?: number | null;
  clientSlug?: string | null;
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

/** Returns the session only if it belongs to a client user scoped to `slug`. */
export async function requireClientSession(slug: string) {
  const session = await getSession();
  if (
    session.role === "client" &&
    session.clientSlug === slug &&
    session.clientId != null
  ) {
    return session;
  }
  return null;
}

/** Returns the session only if it belongs to an internal team user. */
export async function requireTeamSession() {
  const session = await getSession();
  if (session.role === "team") {
    return session;
  }
  return null;
}
