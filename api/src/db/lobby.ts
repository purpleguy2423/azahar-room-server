import pool from "./index";

export interface LobbyRoomRow {
  id: string;
  name: string;
  owner: string | null;
  port: number;
  max_players: number;
  preferred_game_name: string | null;
  preferred_game_id: number | null;
  address: string | null;
  has_password: boolean;
  first_seen: number;
  last_seen: number;
  status: string;
}

export async function upsertLobbyRoom(room: { id:string; name:string; owner?:string; port:number; maxPlayers:number; preferredGameName?:string; preferredGameId?:number; address?:string; hasPassword?:boolean }) {
  const now = Date.now();
  await pool.query(
    `INSERT INTO lobby_rooms (id,name,owner,port,max_players,preferred_game_name,preferred_game_id,address,has_password,first_seen,last_seen,status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'live')
     ON CONFLICT (id) DO UPDATE SET
       name=EXCLUDED.name, owner=EXCLUDED.owner, max_players=EXCLUDED.max_players,
       preferred_game_name=EXCLUDED.preferred_game_name, preferred_game_id=EXCLUDED.preferred_game_id,
       address=EXCLUDED.address, has_password=EXCLUDED.has_password,
       last_seen=EXCLUDED.last_seen, status='live'`,
    [room.id, room.name, room.owner || null, room.port, room.maxPlayers, room.preferredGameName || null,
     room.preferredGameId ?? null, room.address || null, room.hasPassword ? true : false, now, now],
  );
}

export async function markLobbyRoomGone(id: string) {
  await pool.query("UPDATE lobby_rooms SET status='gone' WHERE id=$1 AND status='live'", [id]);
}

export async function touchLobbyRoom(id: string) {
  await pool.query("UPDATE lobby_rooms SET last_seen=$1 WHERE id=$2", [Date.now(), id]);
}

export async function expireLobbyRooms(maxAgeMs: number) {
  const cutoff = Date.now() - maxAgeMs;
  const { rows } = await pool.query("SELECT id FROM lobby_rooms WHERE status='live' AND last_seen < $1", [cutoff]);
  const ids = rows.map((row: { id: string }) => row.id);
  if (ids.length) await pool.query("UPDATE lobby_rooms SET status='gone' WHERE id = ANY($1::text[]) AND status='live'", [ids]);
  return ids;
}

export async function listLobbyRooms(status?: "live" | "gone") {
  const { rows } = status
    ? await pool.query("SELECT * FROM lobby_rooms WHERE status=$1 ORDER BY last_seen DESC", [status])
    : await pool.query("SELECT * FROM lobby_rooms ORDER BY last_seen DESC");
  return rows as LobbyRoomRow[];
}
