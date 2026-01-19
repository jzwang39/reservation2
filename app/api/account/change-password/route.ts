import { auth } from "@/lib/auth";
import { getDb } from "@/db";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || !session.user) {
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
    !("currentPassword" in payload) ||
    !("newPassword" in payload)
  ) {
    return new NextResponse("Invalid payload", { status: 400 });
  }
  const { currentPassword, newPassword } = payload as {
    currentPassword: string;
    newPassword: string;
  };
  if (
    typeof currentPassword !== "string" ||
    typeof newPassword !== "string"
  ) {
    return new NextResponse("Invalid payload", { status: 400 });
  }
  if (newPassword.length < 8) {
    return new NextResponse("Password too short", { status: 400 });
  }
  const db = getDb();
  const row = db
    .prepare("SELECT password_hash FROM users WHERE id = ?")
    .get(session.user.id) as { password_hash: string } | undefined;
  if (!row) {
    return new NextResponse("User not found", { status: 404 });
  }
  const ok = await bcrypt.compare(currentPassword, row.password_hash);
  if (!ok) {
    return new NextResponse("Current password incorrect", { status: 400 });
  }
  const same = await bcrypt.compare(newPassword, row.password_hash);
  if (same) {
    return new NextResponse("New password must be different", {
      status: 400
    });
  }
  const hash = await bcrypt.hash(newPassword, 10);
  db.prepare(
    "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(hash, session.user.id);
  return new NextResponse(null, { status: 204 });
}

