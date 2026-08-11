/**
 * Seeds the pilot tenant (Excellanz Education) and one internal team login.
 *
 * Usage:
 *   npx tsx scripts/seed.ts
 *
 * Set these env vars first (or edit the defaults below before running once,
 * then rotate the passwords via a proper admin flow later):
 *   EXCELLANZ_PASSWORD   - login password for the Excellanz client user
 *   TEAM_PASSWORD        - login password for the internal VR Digitals team user
 */
import bcrypt from "bcryptjs";
import { upsertClient, upsertUser, getUserByUsername, grantClientAccess } from "../lib/db";

function requireEnv(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (!v) {
    throw new Error(
      `Missing required env var ${name}. Set it before running the seed script.`
    );
  }
  return v;
}

async function main() {
  const excellanzPassword = requireEnv("EXCELLANZ_PASSWORD");
  const teamPassword = requireEnv("TEAM_PASSWORD");

  const client = upsertClient({
    client_slug: "excellanz",
    display_name: "Excellanz Education",
    meta_ad_account_id: "2011227639500053",
  });

  upsertUser({
    username: "excellanz",
    password_hash: await bcrypt.hash(excellanzPassword, 12),
    role: "client",
    client_id: client.id,
  });
  grantClientAccess(getUserByUsername("excellanz")!.id, client.id);

  upsertUser({
    username: "vrdigitals-team",
    password_hash: await bcrypt.hash(teamPassword, 12),
    role: "team",
    client_id: null,
  });

  console.log(`Seeded client "${client.display_name}" (${client.client_slug})`);
  console.log(`Seeded client login: excellanz`);
  console.log(`Seeded team login: vrdigitals-team`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
