import fs from "fs";
import path from "path";
import pool from "./index";

const PROJECT_ROOT = process.env.PROJECT_ROOT || path.resolve(__dirname, "../../..");

function getBanFilePath(): string {
  if (process.env.BANLIST_PATH) return process.env.BANLIST_PATH;
  const localBan = path.join(PROJECT_ROOT, "banlist.txt");
  if (fs.existsSync(localBan)) return localBan;
  return path.join(process.cwd(), "banlist.txt");
}

export interface BanRow {
  type: "username" | "ip" | string;
  value: string;
  reason?: string | null;
  banned_by?: string | null;
  created_at: number;
  expires_at?: number | null;
}

export async function syncBanlistFile(): Promise<void> {
  try {
    const bans = await listBans();
    const filePath = getBanFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const lines = bans.map((b) => b.value.trim()).filter(Boolean);
    fs.writeFileSync(filePath, lines.length ? lines.join("\n") + "\n" : "", "utf8");
  } catch (err: any) {
    console.error(`[Bans] Failed to write banlist file: ${err.message}`);
  }
}

export async function listBans(): Promise<BanRow[]> {
  const { rows } = await pool.query(
    "SELECT type, value, reason, banned_by, created_at, expires_at FROM bans WHERE expires_at IS NULL OR expires_at > $1 ORDER BY created_at DESC",
    [Date.now()],
  );
  return rows as BanRow[];
}

export async function isBanned(type: string, value: string): Promise<boolean> {
  if (!value) return false;
  const { rows } = await pool.query(
    "SELECT 1 FROM bans WHERE type = $1 AND LOWER(value) = LOWER($2) AND (expires_at IS NULL OR expires_at > $3) LIMIT 1",
    [type, value.trim(), Date.now()],
  );
  return rows.length > 0;
}

export async function isUserBanned(username?: string, ip?: string): Promise<boolean> {
  const checks: Promise<boolean>[] = [];
  if (username) checks.push(isBanned("username", username));
  if (ip) {
    const cleanIp = ip.replace(/^.*:/, "");
    checks.push(isBanned("ip", ip));
    if (cleanIp !== ip) checks.push(isBanned("ip", cleanIp));
  }
  const results = await Promise.all(checks);
  return results.some((b) => b === true);
}

export async function addBan(type: string, value: string, reason?: string, banned_by?: string, durationMinutes?: number): Promise<void> {
  const now = Date.now();
  const expiresAt = durationMinutes && durationMinutes > 0 ? now + durationMinutes * 60 * 1000 : null;
  await pool.query(
    `INSERT INTO bans (type, value, reason, banned_by, created_at, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (type, value) DO UPDATE SET
       reason = EXCLUDED.reason,
       banned_by = EXCLUDED.banned_by,
       created_at = EXCLUDED.created_at,
       expires_at = EXCLUDED.expires_at`,
    [type, value.trim(), reason || null, banned_by || null, now, expiresAt],
  );
  await syncBanlistFile();
}

export async function removeBan(type: string, value: string): Promise<void> {
  await pool.query("DELETE FROM bans WHERE type = $1 AND LOWER(value) = LOWER($2)", [type, value.trim()]);
  await syncBanlistFile();
}
