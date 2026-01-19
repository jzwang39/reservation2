import { auth } from "@/lib/auth";
import {
  ClosedSlotRow,
  createClosedSlot,
  getClosedSlotsList,
  openClosedSlot,
  getDb,
  createOperationLog
} from "@/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session || session.user?.role !== "admin") {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const rows = getClosedSlotsList();
  return NextResponse.json({ items: rows });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || session.user?.role !== "admin") {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const body = (await request.json()) as {
    date: string;
    mode: "full" | "partial";
    startTime?: string;
    endTime?: string;
    reason: string;
  };
  if (!body.date || !body.reason) {
    return new NextResponse("Invalid payload", { status: 400 });
  }
  let startTime: string | null = null;
  let endTime: string | null = null;
  if (body.mode === "partial") {
    if (!body.startTime || !body.endTime) {
      return new NextResponse("Invalid time range", { status: 400 });
    }
    startTime = body.startTime;
    endTime = body.endTime;
  }
  const db = getDb();
  if (!startTime && !endTime) {
    const stmt = db.prepare(
      "SELECT COUNT(*) as count FROM reservations WHERE date = ? AND status = 'booked'"
    );
    const row = stmt.get(body.date) as { count: number };
    if (row.count > 0) {
      return new NextResponse("该日期已有预约，不能关闭。", { status: 400 });
    }
  } else if (startTime && endTime) {
    const stmt = db.prepare(
      "SELECT COUNT(*) as count FROM reservations WHERE date = ? AND status = 'booked' AND NOT (end_time <= ? OR start_time >= ?)"
    );
    const row = stmt.get(body.date, startTime, endTime) as { count: number };
    if (row.count > 0) {
      return new NextResponse("所选时间段与已有预约重叠，不能关闭。", {
        status: 400
      });
    }
  }
  const id = createClosedSlot(
    body.date,
    startTime,
    endTime,
    body.reason,
    session.user.id
  );
  const rows = getClosedSlotsList();
  const item = rows.find(row => row.id === id) as ClosedSlotRow;
  return NextResponse.json({ item });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session || session.user?.role !== "admin") {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const body = (await request.json()) as {
    id: number;
    openedReason?: string;
  };
  if (!body.id) {
    return new NextResponse("Missing id", { status: 400 });
  }
  const db = getDb();
  const rowStmt = db.prepare("SELECT * FROM closed_slots WHERE id = ?");
  const row = rowStmt.get(body.id) as ClosedSlotRow | undefined;
  if (!row) {
    return new NextResponse("Not found", { status: 404 });
  }
  openClosedSlot(body.id, body.openedReason || null);
  createOperationLog(
    session.user.id,
    "open_closed_slot",
    JSON.stringify({
      id: row.id,
      date: row.date,
      start_time: row.start_time,
      end_time: row.end_time,
      reason: row.reason,
      status_before: row.status,
      created_at: row.created_at,
      opened_reason: body.openedReason || null
    })
  );
  const rows = getClosedSlotsList();
  return NextResponse.json({ items: rows });
}
