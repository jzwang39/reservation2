import Database from "better-sqlite3";
import { join } from "path";

const schema = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'client', 'operator')),
  display_name TEXT NOT NULL,
  company_name TEXT,
  phone TEXT,
  email TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reservations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reservation_no TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('booked', 'cancelled')),
  container_no TEXT NOT NULL,
  packing_list_path TEXT NOT NULL,
  cancel_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  cancelled_at TEXT,
  UNIQUE (date, start_time, end_time),
  FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS time_slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('available', 'booked', 'closed', 'cancelled', 'unavailable')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (date, start_time, end_time)
);

CREATE TABLE IF NOT EXISTS closed_slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  reason TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('closed', 'opened')),
  created_by INTEGER NOT NULL,
  opened_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  opened_at TEXT,
  FOREIGN KEY (created_by) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS operation_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  operation_type TEXT NOT NULL,
  detail TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS cancel_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reservation_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  reason TEXT,
  cancelled_date TEXT NOT NULL,
  cancelled_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (reservation_id) REFERENCES reservations (id),
  FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS idx_reservations_user_date ON reservations (user_id, date);
CREATE INDEX IF NOT EXISTS idx_time_slots_date ON time_slots (date);
CREATE INDEX IF NOT EXISTS idx_closed_slots_date ON closed_slots (date);

INSERT OR IGNORE INTO users (username, password_hash, role, display_name, company_name, phone, email)
VALUES
  ('admin', '$2b$10$F0bq3eHnY/Tt2sz8qP4f.uNV4HJQkQIhwWdCl3LdU16u7D6SvLUwK', 'admin', '管理员', NULL, NULL, NULL),
  ('client1', '$2b$10$F0bq3eHnY/Tt2sz8qP4f.uNV4HJQkQIhwWdCl3LdU16u7D6SvLUwK', 'client', '客户一', NULL, NULL, NULL),
  ('client2', '$2b$10$F0bq3eHnY/Tt2sz8qP4f.uNV4HJQkQIhwWdCl3LdU16u7D6SvLUwK', 'client', '客户二', NULL, NULL, NULL),
  ('operator', '$2b$10$F0bq3eHnY/Tt2sz8qP4f.uNV4HJQkQIhwWdCl3LdU16u7D6SvLUwK', 'operator', '运营人员', NULL, NULL, NULL);
`;

let db: any | null = null;

export function getDb() {
  if (!db) {
    const isServerless = !!process.env.VERCEL;
    const dbPath = isServerless
      ? ":memory:"
      : join(process.cwd(), "db", "reservation.db");
    db = new Database(dbPath);
    if (!isServerless) {
      db.pragma("journal_mode = WAL");
    }
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
