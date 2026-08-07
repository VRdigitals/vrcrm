/**
 * One-time / occasional bulk import of lead records from a pre-extracted
 * JSON file (see the Python extraction step used to produce it from an
 * .xlsx lead-tracking sheet — the sheet itself never gets committed or
 * touched by the app, only the extracted JSON).
 *
 * Usage:
 *   npx tsx scripts/import-leads.ts <client-slug> path/to/leads.json
 */
import fs from "fs";
import { z } from "zod";
import { db, getClientBySlug, upsertLeadsBulk } from "../lib/db";

const LeadSchema = z.object({
  tab_name: z.string().min(1),
  created_time: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  platform: z.string().nullable().optional(),
  question1_label: z.string().nullable().optional(),
  question1_answer: z.string().nullable().optional(),
  question2_label: z.string().nullable().optional(),
  question2_answer: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  full_name: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  whatsapp_number: z.string().nullable().optional(),
});

function titleCase(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function main() {
  const [slug, jsonPath] = process.argv.slice(2);
  if (!slug || !jsonPath) {
    console.error("Usage: tsx scripts/import-leads.ts <client-slug> <path-to-json>");
    process.exit(1);
  }

  const client = getClientBySlug(slug);
  if (!client) {
    throw new Error(`No client found for slug "${slug}".`);
  }

  const raw = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  const leads = z.array(LeadSchema).parse(raw);

  const rows = leads.map((l) => ({
    client_id: client.id,
    tab_name: titleCase(l.tab_name),
    created_time: l.created_time,
    platform: l.platform ?? null,
    full_name: l.full_name ?? null,
    email: l.email ?? null,
    phone: l.phone ?? null,
    whatsapp_number: l.whatsapp_number ?? null,
    city: l.city ?? null,
    question1_label: l.question1_label ?? null,
    question1_answer: l.question1_answer ?? null,
    question2_label: l.question2_label ?? null,
    question2_answer: l.question2_answer ?? null,
  }));

  upsertLeadsBulk(rows);
  db.pragma("wal_checkpoint(TRUNCATE)");

  console.log(`Imported ${rows.length} lead rows for ${slug}.`);
}

main();
