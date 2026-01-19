const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const path = require("path");

const dbPath = path.join(__dirname, "..", "db", "reservation.db");
const db = new Database(dbPath);

const password = "Admin123!";
const hash = bcrypt.hashSync(password, 10);

const stmt = db.prepare(
  "UPDATE users SET password_hash = ? WHERE username IN ('admin','client1','client2','operator')"
);
const info = stmt.run(hash);

console.log("Updated users password_hash, changes =", info.changes);

