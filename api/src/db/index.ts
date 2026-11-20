import { Pool } from "pg";
import { loadEnv } from "../env";

loadEnv();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool(
  connectionString
    ? {
        connectionString,
        ssl:
          process.env.PGSSLMODE === "require" || process.env.NODE_ENV === "production"
            ? { rejectUnauthorized: false }
            : undefined,
      }
    : {
        host: process.env.DB_HOST || "127.0.0.1",
        port: parseInt(process.env.DB_PORT || "5432", 10),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl:
          process.env.PGSSLMODE === "require"
            ? { rejectUnauthorized: false }
            : undefined,
      },
);

export function getPool(): Pool {
  return pool;
}

export async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(64) NOT NULL UNIQUE,
      salt VARCHAR(64) NOT NULL,
      hash VARCHAR(64) NOT NULL,
      citra_token VARCHAR(255),
      created_at BIGINT NOT NULL
    )`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reports (
      id SERIAL PRIMARY KEY,
      target VARCHAR(64) NOT NULL,
      reporter VARCHAR(64) NOT NULL,
      created_at BIGINT NOT NULL,
      UNIQUE (target, reporter)
    )`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bans (
      id SERIAL PRIMARY KEY,
      type VARCHAR(16) NOT NULL,
      value VARCHAR(255) NOT NULL,
      reason VARCHAR(255),
      banned_by VARCHAR(64),
      created_at BIGINT NOT NULL,
      expires_at BIGINT,
      UNIQUE (type, value)
    )`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS room_configs (
      id SERIAL PRIMARY KEY,
      name VARCHAR(64) NOT NULL,
      slug VARCHAR(64) NOT NULL UNIQUE,
      port INT NOT NULL,
      max_members INT NOT NULL DEFAULT 16,
      preferred_game_name VARCHAR(64) DEFAULT 'Any Game',
      preferred_game_id BIGINT NOT NULL DEFAULT 1125899906842624,
      description VARCHAR(255) DEFAULT '',
      status VARCHAR(16) NOT NULL DEFAULT 'stopped',
      auto_start BOOLEAN NOT NULL DEFAULT FALSE,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
    )`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS room_instances (
      id SERIAL PRIMARY KEY,
      config_id INT NOT NULL,
      pid INT,
      announced_room_id VARCHAR(64),
      announced_name VARCHAR(64),
      last_seen BIGINT,
      created_at BIGINT NOT NULL
    )`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id SERIAL PRIMARY KEY,
      room_id VARCHAR(36),
      room_slug VARCHAR(64),
      username VARCHAR(64) NOT NULL,
      message TEXT NOT NULL,
      timestamp BIGINT NOT NULL
    )`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS lobby_rooms (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(64) NOT NULL,
      owner VARCHAR(64),
      port INT NOT NULL,
      max_players INT NOT NULL DEFAULT 16,
      preferred_game_name VARCHAR(64),
      preferred_game_id BIGINT,
      address VARCHAR(255),
      has_password BOOLEAN NOT NULL DEFAULT FALSE,
      first_seen BIGINT NOT NULL,
      last_seen BIGINT NOT NULL,
      status VARCHAR(16) NOT NULL DEFAULT 'live',
      UNIQUE (port, name)
    )`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      admin_username VARCHAR(64) NOT NULL,
      action VARCHAR(64) NOT NULL,
      target VARCHAR(64),
      details TEXT,
      ip_address VARCHAR(45),
      created_at BIGINT NOT NULL
    )`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS activity_history (
      id SERIAL PRIMARY KEY,
      timestamp BIGINT NOT NULL,
      players INT NOT NULL
    )`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS player_presence (
      id SERIAL PRIMARY KEY,
      nickname VARCHAR(64) NOT NULL UNIQUE,
      minutes NUMERIC(10,2) NOT NULL DEFAULT 0
    )`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS game_presence (
      id SERIAL PRIMARY KEY,
      game VARCHAR(64) NOT NULL UNIQUE,
      minutes NUMERIC(10,2) NOT NOT DEFAULT 0
    )`);
  console.log("[DB] PostgreSQL tables ready");
}

export interface UserRow {
  username: string;
  salt: string;
  hash: string;
  citra_token?: string | null;
  created_at: number;
}

export async function findUserByUsername(username: string): Promise<UserRow | null> {
  const { rows } = await pool.query("SELECT * FROM users WHERE LOWER(username) = LOWER($1)", [username]);
  return rows.length ? (rows[0] as UserRow) : null;
}

export async function createUser(username: string, salt: string, hash: string, citraToken?: string | null) {
  await pool.query(
    "INSERT INTO users (username, salt, hash, citra_token, created_at) VALUES ($1,$2,$3,$4,$5)",
    [username, salt, hash, citraToken || null, Date.now()],
  );
}

export async function countReports(target: string): Promise<number> {
  const { rows } = await pool.query("SELECT COUNT(*) AS c FROM reports WHERE LOWER(target) = LOWER($1)", [target]);
  return Number(rows[0].c);
}

export async function addReport(target: string, reporter: string): Promise<boolean> {
  await pool.query(
    "INSERT INTO reports (target, reporter, created_at) VALUES ($1,$2,$3) ON CONFLICT (target, reporter) DO NOTHING",
    [target, reporter, Date.now()],
  );
  return true;
}

export async function deleteReports(target: string) {
  await pool.query("DELETE FROM reports WHERE LOWER(target) = LOWER($1)", [target]);
}

export default pool;
