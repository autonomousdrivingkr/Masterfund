import { NextRequest, NextResponse } from "next/server";
import { searchAssets } from "@/lib/market";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q || q.length < 1) {
    return NextResponse.json([]);
  }

  const results = await searchAssets(q);
  return NextResponse.json(results);
}
