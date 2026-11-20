import pool from "./index";

export interface RoomConfigRow {
  id: number;
  name: string;
  slug: string;
  port: number;
  max_members: number;
  preferred_game_name: string;
  preferred_game_id: number;
  description: string;
  status: string;
  auto_start: number;
  created_at: number;
  updated_at: number;
}

export async function listRoomConfigs(): Promise<RoomConfigRow[]> {
  const { rows } = await pool.query("SELECT * FROM room_configs ORDER BY id ASC");
  return rows;
}
export async function getRoomConfig(id: number): Promise<RoomConfigRow | null> {
  const { rows } = await pool.query("SELECT * FROM room_configs WHERE id=$1", [id]);
  return rows[0] || null;
}
export async function getRoomConfigBySlug(slug: string): Promise<RoomConfigRow | null> {
  const { rows } = await pool.query("SELECT * FROM room_configs WHERE slug=$1", [slug]);
  return rows[0] || null;
}
export async function createRoomConfig(cfg: { name:string; slug:string; port:number; max_members:number; preferred_game_name:string; preferred_game_id:number; description:string; auto_start:number }): Promise<number> {
  const now = Date.now();
  const { rows } = await pool.query(
    `INSERT INTO room_configs (name,slug,port,max_members,preferred_game_name,preferred_game_id,description,auto_start,created_at,updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
    [cfg.name,cfg.slug,cfg.port,cfg.max_members,cfg.preferred_game_name,cfg.preferred_game_id,cfg.description,cfg.auto_start ? true : false,now,now],
  );
  return Number(rows[0].id);
}
export async function updateRoomConfig(id: number, patch: Partial<RoomConfigRow>) {
  const allowed = ["name","slug","port","max_members","preferred_game_name","preferred_game_id","description","auto_start"];
  const set: string[] = [];
  const vals: any[] = [];
  for (const k of allowed) {
    if ((patch as any)[k] !== undefined) {
      vals.push(k === "auto_start" ? Boolean((patch as any)[k]) : (patch as any)[k]);
      set.push(`${k}=$${vals.length}`);
    }
  }
  if (set.length) {
    vals.push(Date.now());
    set.push(`updated_at=$${vals.length}`);
    vals.push(id);
    await pool.query(`UPDATE room_configs SET ${set.join(", ")} WHERE id=$${vals.length}`, vals);
  }
}
export async function setRoomConfigStatus(id: number, status: string) {
  await pool.query("UPDATE room_configs SET status=$1,updated_at=$2 WHERE id=$3", [status,Date.now(),id]);
}
export async function deleteRoomConfig(id: number) {
  await pool.query("DELETE FROM room_configs WHERE id=$1", [id]);
}

export interface RoomInstanceRow { id:number; config_id:number; pid:number|null; announced_room_id:string|null; announced_name:string|null; last_seen:number|null; created_at:number; }
export async function listRoomInstances(): Promise<RoomInstanceRow[]> {
  const { rows } = await pool.query("SELECT * FROM room_instances ORDER BY config_id ASC");
  return rows;
}
export async function getRoomInstanceByConfig(configId: number): Promise<RoomInstanceRow | null> {
  const { rows } = await pool.query("SELECT * FROM room_instances WHERE config_id=$1 LIMIT 1", [configId]);
  return rows[0] || null;
}
export async function createRoomInstance(configId: number, pid: number|null): Promise<number> {
  const { rows } = await pool.query("INSERT INTO room_instances (config_id,pid,created_at) VALUES ($1,$2,$3) RETURNING id", [configId,pid,Date.now()]);
  return Number(rows[0].id);
}
export async function updateRoomInstance(id: number, patch: Partial<RoomInstanceRow>) {
  const set: string[] = [];
  const vals: any[] = [];
  for (const k of ["pid","announced_room_id","announced_name","last_seen"] as const) {
    if (patch[k] !== undefined) {
      vals.push(patch[k]);
      set.push(`${k}=$${vals.length}`);
    }
  }
  if (set.length) {
    vals.push(id);
    await pool.query(`UPDATE room_instances SET ${set.join(", ")} WHERE id=$${vals.length}`, vals);
  }
}
export async function deleteRoomInstance(configId: number) {
  await pool.query("DELETE FROM room_instances WHERE config_id=$1", [configId]);
}
