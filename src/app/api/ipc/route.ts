import { NextResponse } from "next/server";
import { getIpc } from "@/lib/ipc";

// Rate limiting is handled by middleware.ts (10 req/min on /api/ipc)

export async function GET() {
  const ipc = getIpc();
  return NextResponse.json(ipc);
}
