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

