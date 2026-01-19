import { auth } from "@/lib/auth";
import { getDb } from "@/db";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

type ClientRow = {
  id: number;
  username: string;
  display_name: string;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
};

export async function GET() {
  const session = await auth();
  if (!session || session.user?.role !== "operator") {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const db = getDb();
  const stmt = db.prepare(
    "SELECT id, username, display_name, company_name, phone, email, created_at FROM users WHERE role = 'client' ORDER BY created_at DESC"
  );
  const list = stmt.all() as ClientRow[];
  return NextResponse.json({
    clients: list
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || session.user?.role !== "operator") {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return new NextResponse("Invalid payload", { status: 400 });
  }
  if (
    !payload ||
    typeof payload !== "object" ||
    !("username" in payload) ||
    !("display_name" in payload) ||
    !("password" in payload)
  ) {
    return new NextResponse("Invalid payload", { status: 400 });
  }
  const { username, display_name, company_name, phone, email, password } =
    payload as {
      username: string;
      display_name: string;
      company_name?: string | null;
      phone?: string | null;
      email?: string | null;
      password: string;
    };
  if (!username || !display_name || !password) {
    return new NextResponse("Missing required fields", { status: 400 });
  }
  if (password.length < 8) {
    return new NextResponse("Password too short", { status: 400 });
  }
  const db = getDb();
  const exists = db
    .prepare("SELECT 1 FROM users WHERE username = ?")
    .get(username) as { 1: number } | undefined;
  if (exists) {
    return new NextResponse("Username already exists", { status: 400 });
  }
  const hash = await bcrypt.hash(password, 10);
  const insertStmt = db.prepare(
    "INSERT INTO users (username, password_hash, role, display_name, company_name, phone, email) VALUES (?, ?, 'client', ?, ?, ?, ?)"
  );
  const result = insertStmt.run(
    username,
    hash,
    display_name,
    company_name || null,
    phone || null,
    email || null
  );
  const id = result.lastInsertRowid as number;
  const rowStmt = db.prepare(
    "SELECT id, username, display_name, company_name, phone, email, created_at FROM users WHERE id = ?"
  );
  const row = rowStmt.get(id) as ClientRow;
  return NextResponse.json(row, { status: 201 });
}
