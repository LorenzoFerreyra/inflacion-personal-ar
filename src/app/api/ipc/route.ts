import { NextResponse } from "next/server";
import { getIpc } from "@/lib/ipc";

export async function GET() {
  const ipc = getIpc();
  return NextResponse.json(ipc);
}
