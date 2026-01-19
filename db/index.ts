import Database from "better-sqlite3";
import { readFileSync } from "fs";
import { join } from "path";

let db: any | null = null;

export function getDb() {
  if (!db) {
    const dbPath = join(process.cwd(), "db", "reservation.db");
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    const schemaPath = join(process.cwd(), "db", "schema.sql");
    const schema = readFileSync(schemaPath, "utf8");
    db.exec(schema);
  }
  return db;
}

export function findUserByUsername(username: string) {
  const database = getDb();
  const stmt = database.prepare(
    "SELECT id, username, password_hash, role, display_name FROM users WHERE username = ?"
  );
  return stmt.get(username) as
    | {
        id: number;
        username: string;
        password_hash: string;
        role: "admin" | "client" | "operator";
        display_name: string;
      }
    | undefined;
}

export type ReservationRow = {
  id: number;
  reservation_no: string;
  user_id: number;
  date: string;
  start_time: string;
  end_time: string;
  status: "booked" | "cancelled";
  container_no: string;
  packing_list_path: string;
  cancel_reason: string | null;
  created_at: string;
};

export type ClosedSlotRow = {
  id: number;
  date: string;
  start_time: string | null;
  end_time: string | null;
  reason: string;
  status: "closed" | "opened";
  created_by: number;
  opened_reason: string | null;
  created_at: string;
  opened_at: string | null;
};

export function getReservationsInRange(startDate: string, endDate: string) {
  const database = getDb();
  const stmt = database.prepare(
    "SELECT * FROM reservations WHERE date BETWEEN ? AND ? ORDER BY date, start_time"
  );
  return stmt.all(startDate, endDate) as ReservationRow[];
}

export function getClosedSlotsInRange(startDate: string, endDate: string) {
  const database = getDb();
  const stmt = database.prepare(
    "SELECT * FROM closed_slots WHERE date BETWEEN ? AND ? ORDER BY date"
  );
  return stmt.all(startDate, endDate) as ClosedSlotRow[];
}

export function getUserReservations(userId: number) {
  const database = getDb();
  const stmt = database.prepare(
    "SELECT * FROM reservations WHERE user_id = ? ORDER BY date DESC, start_time"
  );
  return stmt.all(userId) as ReservationRow[];
}

export function getClosedSlotsList() {
  const database = getDb();
  const stmt = database.prepare(
    "SELECT * FROM closed_slots ORDER BY date DESC, created_at DESC"
  );
  return stmt.all() as ClosedSlotRow[];
}

export function createClosedSlot(
  date: string,
  startTime: string | null,
  endTime: string | null,
  reason: string,
  createdBy: number
) {
  const database = getDb();
  const stmt = database.prepare(
    "INSERT INTO closed_slots (date, start_time, end_time, reason, status, created_by) VALUES (?, ?, ?, ?, 'closed', ?)"
  );
  const result = stmt.run(date, startTime, endTime, reason, createdBy);
  return result.lastInsertRowid as number;
}

export function openClosedSlot(
  id: number,
  openedReason: string | null
) {
  const database = getDb();
  const stmt = database.prepare(
    "UPDATE closed_slots SET status = 'opened', opened_reason = ?, opened_at = datetime('now') WHERE id = ?"
  );
  stmt.run(openedReason, id);
}

export function createOperationLog(
  userId: number | null,
  operationType: string,
  detail: string
) {
  const database = getDb();
  const stmt = database.prepare(
    "INSERT INTO operation_logs (user_id, operation_type, detail) VALUES (?, ?, ?)"
  );
  stmt.run(userId, operationType, detail);
}
