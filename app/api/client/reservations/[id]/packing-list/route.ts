import { auth } from "@/lib/auth";
import { getDb, ReservationRow } from "@/db";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function getUploadBaseDir() {
  if (process.env.VERCEL) {
    return "/tmp";
  }
  return process.cwd();
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session || session.user?.role !== "client") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return new NextResponse("Invalid id", { status: 400 });
  }

  const db = getDb();
  const rowStmt = db.prepare("SELECT * FROM reservations WHERE id = ?");
  const row = rowStmt.get(id) as ReservationRow | undefined;
  if (!row || row.user_id !== session.user.id) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (!row.packing_list_path) {
    return new NextResponse("No packing list", { status: 404 });
  }

  const safePrefix = "uploads/packing-lists/";
  if (!row.packing_list_path.startsWith(safePrefix)) {
    return new NextResponse("Invalid file path", { status: 400 });
  }

  const baseDir = getUploadBaseDir();
  const filePath = path.join(baseDir, row.packing_list_path);
  if (!fs.existsSync(filePath)) {
    return new NextResponse("File not found", { status: 404 });
  }

  const ext = path.extname(filePath).toLowerCase();
  let contentType = "application/octet-stream";
  if (ext === ".pdf") {
    contentType = "application/pdf";
  } else if (ext === ".doc") {
    contentType = "application/msword";
  } else if (ext === ".docx") {
    contentType =
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }

  const buffer = fs.readFileSync(filePath);
  const filename = path.basename(filePath);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(
        filename
      )}"`
    }
  });
}
