import { auth } from "@/lib/auth";
import { getDb } from "@/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session || session.user?.role !== "operator") {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  if (!start || !end) {
    return new NextResponse("Missing date range", { status: 400 });
  }
  const db = getDb();
  const stmt = db.prepare(
    "SELECT r.*, u.display_name, u.company_name, u.phone FROM reservations r JOIN users u ON u.id = r.user_id WHERE r.date BETWEEN ? AND ? ORDER BY r.date, r.start_time"
  );
  const list = stmt.all(start, end);
  return NextResponse.json({
    reservations: list
  });
}
