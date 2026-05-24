import { NextRequest, NextResponse } from "next/server";
import { getMultipleQuotes } from "@/lib/market";

export async function GET(req: NextRequest) {
  const symbols = req.nextUrl.searchParams.get("symbols");
  if (!symbols) return NextResponse.json({});

  const list = symbols.split(",").map((s) => s.trim()).filter(Boolean);
  const quotes = await getMultipleQuotes(list);
  return NextResponse.json(quotes);
}
