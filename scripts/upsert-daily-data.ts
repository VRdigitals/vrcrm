/**
 * Writes one day's (or more) Meta Ads insights into the SQLite data layer.
 *
 * Intended to be run by the daily scheduled task AFTER it has pulled the
 * previous day's data via the connected Meta Ads MCP tools and written it
 * to a JSON file in this shape:
 *
 * {
 *   "client_slug": "excellanz",
 *   "rows": [
 *     {
 *       "date": "2026-08-06",
 *       "campaign_name": "Lead Gen - Aug",
 *       "spend": 123.45,
 *       "leads": 5,
 *       "clicks": 40,
 *       "impressions": 5000,
 *       "reach": 4200,
 *       "cost_per_lead": 24.69   // optional — computed from spend/leads if omitted
 *     }
 *   ]
 * }
 *
 * Usage:
 *   npx tsx scripts/upsert-daily-data.ts path/to/data.json
 *   cat data.json | npx tsx scripts/upsert-daily-data.ts -
 */
import fs from "fs";
import { z } from "zod";
import { getClientBySlug, upsertDailyDataRow } from "../lib/db";

const RowSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  campaign_name: z.string().min(1),
  spend: z.number().nonnegative(),
  leads: z.number().int().nonnegative(),
  clicks: z.number().int().nonnegative(),
  impressions: z.number().int().nonnegative(),
  reach: z.number().int().nonnegative().default(0),
  cost_per_lead: z.number().nonnegative().optional(),
});

const PayloadSchema = z.object({
  client_slug: z.string().min(1),
  rows: z.array(RowSchema).min(1),
});

function readInput(): string {
  const arg = process.argv[2];
  if (!arg) {
    console.error(
      "Usage: tsx scripts/upsert-daily-data.ts <path-to-json|-> (pass '-' to read stdin)"
    );
    process.exit(1);
  }
  if (arg === "-") {
    return fs.readFileSync(0, "utf-8");
  }
  return fs.readFileSync(arg, "utf-8");
}

function main() {
  const raw = readInput();
  const parsed = PayloadSchema.parse(JSON.parse(raw));

  const client = getClientBySlug(parsed.client_slug);
  if (!client) {
    throw new Error(
      `No client found for slug "${parsed.client_slug}". Add the tenant first (see scripts/seed.ts).`
    );
  }

  let count = 0;
  for (const row of parsed.rows) {
    const costPerLead = row.cost_per_lead ?? (row.leads > 0 ? row.spend / row.leads : 0);
    upsertDailyDataRow({
      client_id: client.id,
      date: row.date,
      campaign_name: row.campaign_name,
      spend: row.spend,
      leads: row.leads,
      clicks: row.clicks,
      impressions: row.impressions,
      reach: row.reach,
      cost_per_lead: costPerLead,
    });
    count++;
  }

  console.log(`Upserted ${count} row(s) for ${parsed.client_slug}.`);
}

main();
