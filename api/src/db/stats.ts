import pool from "./index";

export async function recordActivityDB(timestamp: number, players: number) {
  await pool.query("INSERT INTO activity_history (timestamp,players) VALUES ($1,$2)", [timestamp,players]);
  await pool.query("DELETE FROM activity_history WHERE id NOT IN (SELECT id FROM activity_history ORDER BY id DESC LIMIT 5000)");
}

export async function listActivityDB(): Promise<{timestamp:number; players:number}[]> {
  const { rows } = await pool.query("SELECT timestamp,players FROM activity_history ORDER BY timestamp ASC");
  return rows;
}

export async function addPlayerPresence(nickname: string, minutes: number) {
  await pool.query(
    "INSERT INTO player_presence (nickname,minutes) VALUES ($1,$2) ON CONFLICT (nickname) DO UPDATE SET minutes = player_presence.minutes + EXCLUDED.minutes",
    [nickname,minutes],
  );
}

export async function listPlayerPresence(limit: number = 10): Promise<{nickname:string; minutes:number}[]> {
  const { rows } = await pool.query("SELECT nickname,minutes FROM player_presence ORDER BY minutes DESC LIMIT $1", [limit]);
  return rows;
}

export async function addGamePresence(game: string, minutes: number) {
  await pool.query(
    "INSERT INTO game_presence (game,minutes) VALUES ($1,$2) ON CONFLICT (game) DO UPDATE SET minutes = game_presence.minutes + EXCLUDED.minutes",
    [game,minutes],
  );
}

export async function listGamePresence(limit: number = 10): Promise<{game:string; minutes:number}[]> {
  const { rows } = await pool.query("SELECT game,minutes FROM game_presence ORDER BY minutes DESC LIMIT $1", [limit]);
  return rows;
}
