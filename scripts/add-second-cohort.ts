/**
 * One-off: adds two new ad-account tenants and three new logins.
 *
 * Tenants:
 *   - overseas       -> Distance Education in UK    (1582987422109765)
 *   - gcc-countries  -> Educational Programmes For Working Professionals-UAE (3309162662649320)
 *
 * Logins:
 *   - gokul    -> sees overseas + gcc-countries (switchable tabs)
 *   - jayaraj  -> sees excellanz (the existing UAE leads tenant)
 *   - team admin (info@vrdigitals.net) -> sees everything via /admin
 *
 * Usage:
 *   GOKUL_PASSWORD=... JAYARAJ_PASSWORD=... ADMIN_PASSWORD=... npx tsx scripts/add-second-cohort.ts
 */
import bcrypt from "bcryptjs";
import {
  upsertClient,
  upsertUser,
  getUserByUsername,
  getClientBySlug,
  grantClientAccess,
} from "../lib/db";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required env var ${name}.`);
  }
  return v;
}

async function main() {
  const gokulPassword = requireEnv("GOKUL_PASSWORD");
  const jayarajPassword = requireEnv("JAYARAJ_PASSWORD");
  const adminPassword = requireEnv("ADMIN_PASSWORD");

  const overseas = upsertClient({
    client_slug: "overseas",
    display_name: "Overseas",
    meta_ad_account_id: "1582987422109765",
  });
  const gcc = upsertClient({
    client_slug: "gcc-countries",
    display_name: "GCC Countries",
    meta_ad_account_id: "3309162662649320",
  });

  upsertUser({
    username: "Gokul",
    password_hash: await bcrypt.hash(gokulPassword, 12),
    role: "client",
    client_id: overseas.id, // legacy pointer; real access is via user_clients below
  });
  const gokul = getUserByUsername("Gokul")!;
  grantClientAccess(gokul.id, overseas.id);
  grantClientAccess(gokul.id, gcc.id);

  upsertUser({
    username: "jayaraj",
    password_hash: await bcrypt.hash(jayarajPassword, 12),
    role: "client",
    client_id: getClientBySlug("excellanz")!.id,
  });
  const jayaraj = getUserByUsername("jayaraj")!;
  grantClientAccess(jayaraj.id, getClientBySlug("excellanz")!.id);

  upsertUser({
    username: "info@vrdigitals.net",
    password_hash: await bcrypt.hash(adminPassword, 12),
    role: "team",
    client_id: null,
  });

  console.log("Seeded tenants: overseas, gcc-countries");
  console.log("Seeded logins: Gokul (overseas + gcc-countries), jayaraj (excellanz), info@vrdigitals.net (team admin)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
