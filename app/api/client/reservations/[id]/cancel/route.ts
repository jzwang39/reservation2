import { auth } from "@/lib/auth";
import { getDb, ReservationRow } from "@/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const session = await auth();
  if (!session || session.user?.role !== "client") {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const id = Number(context.params.id);
  if (!Number.isFinite(id)) {
    return new NextResponse("Invalid id", { status: 400 });
  }
  const db = getDb();
  const rowStmt = db.prepare("SELECT * FROM reservations WHERE id = ?");
  const row = rowStmt.get(id) as ReservationRow | undefined;
  if (!row || row.user_id !== session.user.id) {
    return new NextResponse("Not found", { status: 404 });
  }
  const date = new Date(`${row.date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = (date.getTime() - today.getTime()) / 86400000;
  if (diff < 1) {
    return new NextResponse("Cannot cancel same day", { status: 400 });
  }
  const body = (await request.json()) as { reason?: string };
  const reason = body.reason || null;
  const updateStmt = db.prepare(
    "UPDATE reservations SET status = 'cancelled', cancel_reason = ?, cancelled_at = datetime('now') WHERE id = ?"
  );
  updateStmt.run(reason, id);
  const cancelStmt = db.prepare(
    "INSERT INTO cancel_logs (reservation_id, user_id, reason, cancelled_date) VALUES (?, ?, ?, ?)"
  );
  cancelStmt.run(id, session.user.id, reason, row.date);
  return new NextResponse(null, { status: 204 });
}

