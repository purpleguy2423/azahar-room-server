import pool from "./index";

export async function addChatMessage(roomId: string | null, roomSlug: string | null, username: string, message: string, timestamp?: number) {
  await pool.query(
    "INSERT INTO chat_messages (room_id, room_slug, username, message, timestamp) VALUES ($1,$2,$3,$4,$5)",
    [roomId, roomSlug, username, message, timestamp || Date.now()],
  );
}

export async function listChatMessages(limit: number = 500): Promise<{ id:number; room_id:string|null; room_slug:string|null; username:string; message:string; timestamp:number }[]> {
  const { rows } = await pool.query("SELECT * FROM chat_messages ORDER BY timestamp DESC LIMIT $1", [Math.min(limit, 5000)]);
  return rows;
}

export async function listChatMessagesByRoom(roomSlug: string, limit: number = 200): Promise<{ id:number; room_id:string|null; room_slug:string|null; username:string; message:string; timestamp:number }[]> {
  const { rows } = await pool.query(
    "SELECT * FROM chat_messages WHERE room_slug = $1 ORDER BY timestamp DESC LIMIT $2",
    [roomSlug, Math.min(limit, 2000)],
  );
  return rows;
}
