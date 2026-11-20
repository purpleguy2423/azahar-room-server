import pool from "./index";

export interface UserRow { username:string; salt:string; hash:string; citra_token?:string|null; created_at:number; }

export async function findUserByUsername(username: string): Promise<UserRow|null> {
  const { rows } = await pool.query("SELECT * FROM users WHERE LOWER(username)=LOWER($1)", [username]);
  return rows.length ? rows[0] as UserRow : null;
}

export async function createUser(username: string, salt: string, hash: string, citraToken?: string) {
  await pool.query(
    "INSERT INTO users (username,salt,hash,citra_token,created_at) VALUES ($1,$2,$3,$4,$5)",
    [username,salt,hash,citraToken || null,Date.now()],
  );
}

export async function countReports(target: string): Promise<number> {
  const { rows } = await pool.query("SELECT COUNT(*) AS c FROM reports WHERE LOWER(target)=LOWER($1)", [target]);
  return Number(rows[0].c);
}

export async function addReport(target: string, reporter: string): Promise<boolean> {
  await pool.query(
    "INSERT INTO reports (target,reporter,created_at) VALUES ($1,$2,$3) ON CONFLICT (target,reporter) DO NOTHING",
    [target,reporter,Date.now()],
  );
  return true;
}

export async function deleteReports(target: string) {
  await pool.query("DELETE FROM reports WHERE LOWER(target)=LOWER($1)", [target]);
}

export async function getPlayerMinutes(username: string): Promise<number> {
  const { rows } = await pool.query("SELECT minutes FROM player_presence WHERE LOWER(nickname)=LOWER($1)", [username]);
  return rows.length ? Number(rows[0].minutes) : 0;
}

export async function listAllUsers(): Promise<{username:string;created_at:number;minutes:number}[]> {
  const { rows } = await pool.query(
    "SELECT u.username,u.created_at,COALESCE(p.minutes,0) AS minutes FROM users u LEFT JOIN player_presence p ON LOWER(u.username)=LOWER(p.nickname) ORDER BY u.created_at DESC",
  );
  return rows;
}
