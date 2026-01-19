import { auth } from "@/lib/auth";
import { getClosedSlotsList } from "@/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session || session.user?.role !== "operator") {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const items = getClosedSlotsList();
  return NextResponse.json({ items });
}

