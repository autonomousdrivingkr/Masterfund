import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const bulkSchema = z.object({
  assets: z
    .array(
      z.object({
        symbol: z.string().min(1),
        name: z.string().min(1),
        assetType: z.enum(["STOCK", "ETF", "BOND", "CRYPTO", "OTHER"]),
        exchange: z.string().optional().default(""),
        currency: z.string().default("USD"),
        shares: z.number().positive(),
        avgCost: z.number().positive(),
      })
    )
    .min(1)
    .max(200),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const portfolio = await prisma.portfolio.findFirst({ where: { id, userId: session.user.id } });
  if (!portfolio) return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });

  const body = await req.json();
  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const result = await prisma.asset.createMany({
    data: parsed.data.assets.map((a) => ({ ...a, portfolioId: id })),
  });

  return NextResponse.json({ created: result.count }, { status: 201 });
}
