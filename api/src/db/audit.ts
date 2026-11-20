import pool from "./index";

export interface AuditLogRow {
  id: number;
  admin_username: string;
  action: string;
  target: string | null;
  details: string | null;
  ip_address: string | null;
  created_at: number;
}

export async function logAdminAction(adminUsername: string, action: string, target?: string | null, details?: string | null, ipAddress?: string | null): Promise<void> {
  await pool.query(
    "INSERT INTO audit_logs (admin_username, action, target, details, ip_address, created_at) VALUES ($1,$2,$3,$4,$5,$6)",
    [adminUsername, action, target || null, details || null, ipAddress || null, Date.now()],
  );
}

export async function listAuditLogs(limit: number = 100): Promise<AuditLogRow[]> {
  const safeLimit = Math.max(1, Math.min(500, limit));
  const { rows } = await pool.query("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1", [safeLimit]);
  return rows as AuditLogRow[];
}
