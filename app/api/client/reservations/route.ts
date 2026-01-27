import { auth } from "@/lib/auth";
import {
  ClosedSlotRow,
  ReservationRow,
  getClosedSlotsInRange,
  getReservationsInRange,
  getUserReservations,
  getDb
} from "@/db";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

type SlotStatus =
  | "available"
  | "booked"
  | "closed"
  | "cancelled"
  | "unavailable";

type Slot = {
  date: string;
  startTime: string;
  endTime: string;
  status: SlotStatus;
};

type DayOverview = {
  date: string;
  weekday: number;
  slots: Slot[];
};

function buildRange(startDate: string, endDate: string) {
  const result: { date: string; weekday: number }[] = [];
  const cursor = new Date(startDate);
  const end = new Date(endDate);
  while (cursor <= end) {
    const year = cursor.getFullYear();
    const month = `${cursor.getMonth() + 1}`.padStart(2, "0");
    const day = `${cursor.getDate()}`.padStart(2, "0");
    result.push({
      date: `${year}-${month}-${day}`,
      weekday: cursor.getDay()
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

function isWeekendOrMonday(weekday: number) {
  return weekday === 0 || weekday === 1;
}

function buildDayOverview(
  days: { date: string; weekday: number }[],
  reservations: ReservationRow[],
  closedSlots: ClosedSlotRow[]
): DayOverview[] {
  const map = new Map<string, ReservationRow[]>();
  for (const r of reservations) {
    const list = map.get(r.date) || [];
    list.push(r);
    map.set(r.date, list);
  }
  const closedMap = new Map<string, ClosedSlotRow[]>();
  for (const c of closedSlots) {
    const list = closedMap.get(c.date) || [];
    list.push(c);
    closedMap.set(c.date, list);
  }
  const hours = ["10:00", "11:00", "12:00"];
  const result: DayOverview[] = [];
  for (const day of days) {
    const slots: Slot[] = [];
    const dayReservations = map.get(day.date) || [];
    const dayClosed = closedMap.get(day.date) || [];
    const unavailable = isWeekendOrMonday(day.weekday);
    for (const startTime of hours) {
      const startHour = parseInt(startTime.slice(0, 2), 10);
      const endTime = `${String(startHour + 3).padStart(2, "0")}:00`;
      let status: SlotStatus = "available";
      if (unavailable) {
        status = "unavailable";
      }
      for (const c of dayClosed) {
        if (c.status !== "closed") {
          continue;
        }
        if (!c.start_time && !c.end_time) {
          status = "closed";
        } else if (c.start_time && c.end_time) {
          if (startTime >= c.start_time && endTime <= c.end_time) {
            status = "closed";
          }
        }
      }
      let exactMatchBooked = false;
      let hasOverlapBooked = false;
      for (const r of dayReservations) {
        if (r.status !== "booked") {
          continue;
        }
        const exactMatch =
          r.start_time === startTime && r.end_time === endTime;
        const overlap =
          !(endTime <= r.start_time || startTime >= r.end_time);
        if (exactMatch) {
          exactMatchBooked = true;
        } else if (overlap) {
          hasOverlapBooked = true;
        }
      }
      if (exactMatchBooked) {
        status = "booked";
      } else if (hasOverlapBooked && status === "available") {
        status = "unavailable";
      }
      slots.push({
        date: day.date,
        startTime,
        endTime,
        status
      });
    }
    result.push({
      date: day.date,
      weekday: day.weekday,
      slots
    });
  }
  return result;
}

function getUploadBaseDir() {
  if (process.env.VERCEL) {
    return "/tmp";
  }
  return process.cwd();
}

function ensureUploadDir() {
  const dir = path.join(getUploadBaseDir(), "uploads", "packing-lists");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function checkDateRange(date: string) {
  const target = new Date(`${date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = (target.getTime() - today.getTime()) / 86400000;
  if (Number.isNaN(diff)) {
    return false;
  }
  if (diff < 1 || diff > 14) {
    return false;
  }
  const weekday = target.getDay();
  if (weekday === 0 || weekday === 1) {
    return false;
  }
  return true;
}

function buildReservationNo(database: ReturnType<typeof getDb>, date: string) {
  const stmt = database.prepare(
    "SELECT COUNT(*) as count FROM reservations WHERE date = ?"
  );
  const row = stmt.get(date) as { count: number };
  const n = row.count + 1;
  const compact = date.replace(/-/g, "");
  const seq = `${n}`.padStart(3, "0");
  return `${compact}-${seq}`;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session || session.user?.role !== "client") {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  if (!start || !end) {
    return new NextResponse("Missing date range", { status: 400 });
  }
  const reservations = getReservationsInRange(start, end);
  const closedSlots = getClosedSlotsInRange(start, end);
  const days = buildRange(start, end);
  const overview = buildDayOverview(days, reservations, closedSlots);
  const myReservations = getUserReservations(session.user.id);
  return NextResponse.json({
    overview,
    myReservations
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || session.user?.role !== "client") {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const formData = await request.formData();
  const date = formData.get("date");
  const startTime = formData.get("startTime");
  const containerNo = formData.get("containerNo");
  const file = formData.get("packingList");
  if (
    typeof date !== "string" ||
    typeof startTime !== "string" ||
    typeof containerNo !== "string" ||
    !(file instanceof File)
  ) {
    return new NextResponse("Invalid payload", { status: 400 });
  }
  if (!checkDateRange(date)) {
    return new NextResponse("Invalid date", { status: 400 });
  }
  const allowedStarts = ["10:00", "11:00", "12:00"];
  if (!allowedStarts.includes(startTime)) {
    return new NextResponse("Invalid start time", { status: 400 });
  }
  const startHour = parseInt(startTime.slice(0, 2), 10);
  const endTime = `${String(startHour + 3).padStart(2, "0")}:00`;
  const sizeLimit = 10 * 1024 * 1024;
  if (file.size > sizeLimit) {
    return new NextResponse("File too large", { status: 400 });
  }
  const name = file.name.toLowerCase();
  if (
    !(
      name.endsWith(".pdf") ||
      name.endsWith(".doc") ||
      name.endsWith(".docx")
    )
  ) {
    return new NextResponse("Invalid file type", { status: 400 });
  }
  const db = getDb();
  const targetDate = new Date(`${date}T00:00:00`);
  const weekday = targetDate.getDay();
  if (weekday === 0 || weekday === 1) {
    return new NextResponse("Date not bookable", { status: 400 });
  }
  const closedStmt = db.prepare(
    "SELECT * FROM closed_slots WHERE date = ? AND status = 'closed'"
  );
  const closed = closedStmt.all(date) as ClosedSlotRow[];
  for (const c of closed) {
    if (!c.start_time && !c.end_time) {
      return new NextResponse("Date closed", { status: 400 });
    }
    if (c.start_time && c.end_time) {
      if (startTime >= c.start_time && endTime <= c.end_time) {
        return new NextResponse("Time closed", { status: 400 });
      }
    }
  }
  const conflictStmt = db.prepare(
    "SELECT COUNT(*) as count FROM reservations WHERE date = ? AND status = 'booked' AND NOT (end_time <= ? OR start_time >= ?)"
  );
  const conflictRow = conflictStmt.get(date, startTime, endTime) as {
    count: number;
  };
  if (conflictRow.count > 0) {
    return new NextResponse("Time slot already booked", { status: 400 });
  }
  const uploadDir = ensureUploadDir();
  const ext = path.extname(name);
  const timestamp = Date.now();
  const safeName = `packing_${session.user.id}_${timestamp}${ext}`;
  const fullPath = path.join(uploadDir, safeName);
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(fullPath, buffer);
  const dbPath = path.join("uploads", "packing-lists", safeName);
  const reservationNo = buildReservationNo(db, date);
  const insertStmt = db.prepare(
    "INSERT INTO reservations (reservation_no, user_id, date, start_time, end_time, status, container_no, packing_list_path) VALUES (?, ?, ?, ?, ?, 'booked', ?, ?)"
  );
  const result = insertStmt.run(
    reservationNo,
    session.user.id,
    date,
    startTime,
    endTime,
    containerNo,
    dbPath
  );
  const id = result.lastInsertRowid as number;
  const rowStmt = db.prepare("SELECT * FROM reservations WHERE id = ?");
  const row = rowStmt.get(id) as ReservationRow;

  const userStmt = db.prepare(
    "SELECT display_name, company_name, phone FROM users WHERE id = ?"
  );
  const user = userStmt.get(session.user.id) as
    | {
        display_name: string;
        company_name: string | null;
        phone: string | null;
      }
    | undefined;

  if (user) {
    const message =
      `客户：${user.display_name}\n` +
      `联系方式：${user.phone || ""}\n` +
      `公司：${user.company_name || ""}\n` +
      `预约时间：${date} ${startTime}–${endTime}`;
    try {
      const webhookUrl = process.env.WECOM_WEBHOOK_URL;
      if (webhookUrl) {
        await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            msgtype: "text",
            text: {
              content: message
            }
          })
        });
      }
    } catch {
    }
  }

  return NextResponse.json(row, { status: 201 });
}
