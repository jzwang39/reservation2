import { auth } from "@/lib/auth";
import {
  getDb,
  getClosedSlotsInRange,
  ReservationRow,
  ClosedSlotRow
} from "@/db";
import { NextRequest, NextResponse } from "next/server";

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

function isWeekendOrMonday(weekday: number) {
  return weekday === 0 || weekday === 1;
}

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
      let exactMatchStatus: SlotStatus | null = null;
      let hasOverlapBooked = false;
      for (const r of dayReservations) {
        const exactMatch =
          r.start_time === startTime && r.end_time === endTime;
        const overlap =
          !(endTime <= r.start_time || startTime >= r.end_time);
        if (exactMatch) {
          if (r.status === "booked") {
            exactMatchStatus = "booked";
          } else if (r.status === "cancelled") {
            exactMatchStatus = "cancelled";
          }
        } else if (overlap && r.status === "booked") {
          hasOverlapBooked = true;
        }
      }
      if (exactMatchStatus) {
        status = exactMatchStatus;
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

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session || session.user?.role !== "admin") {
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
  const reservations = stmt.all(start, end) as (ReservationRow & {
    display_name: string;
    company_name: string | null;
    phone: string | null;
  })[];
  const closedSlots = getClosedSlotsInRange(start, end);
  const days = buildRange(start, end);
  const overview = buildDayOverview(days, reservations, closedSlots);
  return NextResponse.json({
    overview,
    reservations
  });
}
