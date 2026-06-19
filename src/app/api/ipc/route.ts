import { NextResponse } from "next/server";
import { getIpc } from "@/lib/ipc";

export async function GET() {
  try {
    const ipc = getIpc();
    return NextResponse.json(ipc);
  } catch {
    return NextResponse.json(
      { error: "Error al obtener datos de IPC" },
      { status: 500 },
    );
  }
}
