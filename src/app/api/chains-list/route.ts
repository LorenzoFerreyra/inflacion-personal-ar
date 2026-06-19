import { NextResponse } from "next/server";
import { getChainList } from "@/lib/database";

export async function GET() {
  return NextResponse.json(getChainList());
}
