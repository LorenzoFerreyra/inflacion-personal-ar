import { NextResponse } from "next/server";
import { getIpc } from "@/lib/ipc";

export async function GET() {
  try {
    const ipc = await getIpc();
    return NextResponse.json(ipc);
  } catch (err) {
    console.error("Error al obtener el IPC del INDEC:", err);
    return NextResponse.json(
      { error: "Error al obtener datos de IPC" },
      { status: 500 },
    );
  }
}
