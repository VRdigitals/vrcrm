import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "app.db");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Reuse a single connection across hot reloads in dev.
const globalForDb = globalThis as unknown as { __vrdDb?: Database.Database };

export const db = globalForDb.__vrdDb ?? new Database(DB_PATH);
if (process.env.NODE_ENV !== "production") globalForDb.__vrdDb = db;

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_slug TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    meta_ad_account_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('client', 'team')),
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS daily_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    campaign_name TEXT NOT NULL,
    spend REAL NOT NULL DEFAULT 0,
    leads INTEGER NOT NULL DEFAULT 0,
    clicks INTEGER NOT NULL DEFAULT 0,
    impressions INTEGER NOT NULL DEFAULT 0,
    reach INTEGER NOT NULL DEFAULT 0,
    cost_per_lead REAL NOT NULL DEFAULT 0,
    UNIQUE(client_id, date, campaign_name)
  );

  CREATE INDEX IF NOT EXISTS idx_daily_data_client_date ON daily_data(client_id, date);

  -- Full campaign roster per client, independent of whether a campaign had
  -- any spend on a given day. Needed to report "no delivery this month"
  -- campaigns, since daily_data only ever gets rows for active delivery.
  CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    campaign_name TEXT NOT NULL,
    UNIQUE(client_id, campaign_name)
  );

  -- Raw lead records (contains personal data — name, email, phone). Grouped
  -- by "tab" to mirror the per-campaign sheet tabs in the daily lead-tracking
  -- spreadsheet clients are used to. The two question columns vary by tab
  -- (e.g. "when are you planning to join?" vs "current situation in the
  -- UAE?"), so they're stored generically as label+answer pairs.
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    tab_name TEXT NOT NULL,
    created_time TEXT NOT NULL,
    platform TEXT,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    whatsapp_number TEXT,
    city TEXT,
    question1_label TEXT,
    question1_answer TEXT,
    question2_label TEXT,
    question2_answer TEXT,
    UNIQUE(client_id, tab_name, created_time, email, phone)
  );

  CREATE INDEX IF NOT EXISTS idx_leads_client_tab ON leads(client_id, tab_name, created_time);
`);

export type Role = "client" | "team";

export interface ClientRecord {
  id: number;
  client_slug: string;
  display_name: string;
  meta_ad_account_id: string | null;
}

export interface UserRecord {
  id: number;
  username: string;
  password_hash: string;
  role: Role;
  client_id: number | null;
}

export interface DailyDataRow {
  id: number;
  client_id: number;
  date: string;
  campaign_name: string;
  spend: number;
  leads: number;
  clicks: number;
  impressions: number;
  reach: number;
  cost_per_lead: number;
}

export function getUserByUsername(username: string): UserRecord | undefined {
  return db
    .prepare(`SELECT * FROM users WHERE username = ?`)
    .get(username) as UserRecord | undefined;
}

export function getClientBySlug(slug: string): ClientRecord | undefined {
  return db
    .prepare(`SELECT * FROM clients WHERE client_slug = ?`)
    .get(slug) as ClientRecord | undefined;
}

export function getClientById(id: number): ClientRecord | undefined {
  return db.prepare(`SELECT * FROM clients WHERE id = ?`).get(id) as
    | ClientRecord
    | undefined;
}

export function getAllClients(): ClientRecord[] {
  return db
    .prepare(`SELECT * FROM clients ORDER BY display_name`)
    .all() as ClientRecord[];
}

/**
 * All data-access below is scoped by client_id. Never accept a client_slug
 * or client_id from the client/browser for these — always derive it from
 * the authenticated session server-side (see lib/session.ts).
 */
export function getDailyDataForClient(
  clientId: number,
  opts?: { fromDate?: string; toDate?: string }
): DailyDataRow[] {
  let query = `SELECT * FROM daily_data WHERE client_id = ?`;
  const params: (string | number)[] = [clientId];
  if (opts?.fromDate) {
    query += ` AND date >= ?`;
    params.push(opts.fromDate);
  }
  if (opts?.toDate) {
    query += ` AND date <= ?`;
    params.push(opts.toDate);
  }
  query += ` ORDER BY date ASC, campaign_name ASC`;
  return db.prepare(query).all(...params) as DailyDataRow[];
}

export function getAllDailyData(opts?: {
  fromDate?: string;
  toDate?: string;
}): (DailyDataRow & { client_slug: string; display_name: string })[] {
  let query = `
    SELECT d.*, c.client_slug, c.display_name
    FROM daily_data d
    JOIN clients c ON c.id = d.client_id
    WHERE 1=1
  `;
  const params: (string | number)[] = [];
  if (opts?.fromDate) {
    query += ` AND date >= ?`;
    params.push(opts.fromDate);
  }
  if (opts?.toDate) {
    query += ` AND date <= ?`;
    params.push(opts.toDate);
  }
  query += ` ORDER BY c.display_name, d.date ASC`;
  return db.prepare(query).all(...params) as (DailyDataRow & {
    client_slug: string;
    display_name: string;
  })[];
}

export function getKnownCampaignNames(clientId: number): string[] {
  const rows = db
    .prepare(`SELECT campaign_name FROM campaigns WHERE client_id = ?`)
    .all(clientId) as { campaign_name: string }[];
  return rows.map((r) => r.campaign_name);
}

export function upsertKnownCampaign(clientId: number, campaignName: string): void {
  db.prepare(
    `INSERT INTO campaigns (client_id, campaign_name)
     VALUES (?, ?)
     ON CONFLICT(client_id, campaign_name) DO NOTHING`
  ).run(clientId, campaignName);
}

export interface LeadRecord {
  id: number;
  client_id: number;
  tab_name: string;
  created_time: string;
  platform: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  city: string | null;
  question1_label: string | null;
  question1_answer: string | null;
  question2_label: string | null;
  question2_answer: string | null;
}

export function getLeadTabNames(clientId: number): string[] {
  const rows = db
    .prepare(
      `SELECT DISTINCT tab_name FROM leads WHERE client_id = ? ORDER BY tab_name`
    )
    .all(clientId) as { tab_name: string }[];
  return rows.map((r) => r.tab_name);
}

export function getLeadsForClient(
  clientId: number,
  tabName: string
): LeadRecord[] {
  return db
    .prepare(
      `SELECT * FROM leads WHERE client_id = ? AND tab_name = ?
       ORDER BY created_time DESC, id DESC`
    )
    .all(clientId, tabName) as LeadRecord[];
}

export function getLeadCountsByTab(clientId: number): Record<string, number> {
  const rows = db
    .prepare(
      `SELECT tab_name, COUNT(*) as count FROM leads WHERE client_id = ? GROUP BY tab_name`
    )
    .all(clientId) as { tab_name: string; count: number }[];
  return Object.fromEntries(rows.map((r) => [r.tab_name, r.count]));
}

const upsertLeadStmt = db.prepare(
  `INSERT INTO leads
     (client_id, tab_name, created_time, platform, full_name, email, phone,
      whatsapp_number, city, question1_label, question1_answer,
      question2_label, question2_answer)
   VALUES
     (@client_id, @tab_name, @created_time, @platform, @full_name, @email, @phone,
      @whatsapp_number, @city, @question1_label, @question1_answer,
      @question2_label, @question2_answer)
   ON CONFLICT(client_id, tab_name, created_time, email, phone) DO NOTHING`
);

export function upsertLead(input: {
  client_id: number;
  tab_name: string;
  created_time: string;
  platform?: string | null;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp_number?: string | null;
  city?: string | null;
  question1_label?: string | null;
  question1_answer?: string | null;
  question2_label?: string | null;
  question2_answer?: string | null;
}): void {
  upsertLeadStmt.run({
    platform: null,
    full_name: null,
    email: null,
    phone: null,
    whatsapp_number: null,
    city: null,
    question1_label: null,
    question1_answer: null,
    question2_label: null,
    question2_answer: null,
    ...input,
  });
}

export const upsertLeadsBulk = db.transaction(
  (rows: Parameters<typeof upsertLead>[0][]) => {
    for (const row of rows) upsertLead(row);
  }
);

export function upsertClient(input: {
  client_slug: string;
  display_name: string;
  meta_ad_account_id?: string;
}): ClientRecord {
  db.prepare(
    `INSERT INTO clients (client_slug, display_name, meta_ad_account_id)
     VALUES (@client_slug, @display_name, @meta_ad_account_id)
     ON CONFLICT(client_slug) DO UPDATE SET
       display_name = excluded.display_name,
       meta_ad_account_id = excluded.meta_ad_account_id`
  ).run({
    client_slug: input.client_slug,
    display_name: input.display_name,
    meta_ad_account_id: input.meta_ad_account_id ?? null,
  });
  return getClientBySlug(input.client_slug)!;
}

export function upsertUser(input: {
  username: string;
  password_hash: string;
  role: Role;
  client_id: number | null;
}): void {
  db.prepare(
    `INSERT INTO users (username, password_hash, role, client_id)
     VALUES (@username, @password_hash, @role, @client_id)
     ON CONFLICT(username) DO UPDATE SET
       password_hash = excluded.password_hash,
       role = excluded.role,
       client_id = excluded.client_id`
  ).run(input);
}

export function upsertDailyDataRow(input: {
  client_id: number;
  date: string;
  campaign_name: string;
  spend: number;
  leads: number;
  clicks: number;
  impressions: number;
  reach: number;
  cost_per_lead: number;
}): void {
  db.prepare(
    `INSERT INTO daily_data
       (client_id, date, campaign_name, spend, leads, clicks, impressions, reach, cost_per_lead)
     VALUES
       (@client_id, @date, @campaign_name, @spend, @leads, @clicks, @impressions, @reach, @cost_per_lead)
     ON CONFLICT(client_id, date, campaign_name) DO UPDATE SET
       spend = excluded.spend,
       leads = excluded.leads,
       clicks = excluded.clicks,
       impressions = excluded.impressions,
       reach = excluded.reach,
       cost_per_lead = excluded.cost_per_lead`
  ).run(input);
}
