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

  // 입력 내 중복 심볼 병합 (가중 평균 매입가)
  const incomingMap = new Map<string, typeof parsed.data.assets[0]>();
  for (const asset of parsed.data.assets) {
    const existing = incomingMap.get(asset.symbol);
    if (existing) {
      const totalShares = existing.shares + asset.shares;
      const weightedAvg =
        (existing.shares * existing.avgCost + asset.shares * asset.avgCost) / totalShares;
      incomingMap.set(asset.symbol, { ...existing, shares: totalShares, avgCost: weightedAvg });
    } else {
      incomingMap.set(asset.symbol, asset);
    }
  }

  // 포트폴리오에 이미 존재하는 심볼은 upsert (합산)
  let created = 0;
  let merged = 0;

  for (const asset of incomingMap.values()) {
    const existing = await prisma.asset.findFirst({
      where: { portfolioId: id, symbol: asset.symbol },
    });

    if (existing) {
      const totalShares = existing.shares + asset.shares;
      const weightedAvg =
        (existing.shares * existing.avgCost + asset.shares * asset.avgCost) / totalShares;
      await prisma.asset.update({
        where: { id: existing.id },
        data: { shares: totalShares, avgCost: weightedAvg, currency: asset.currency },
      });
      merged++;
    } else {
      await prisma.asset.create({
        data: { ...asset, portfolioId: id },
      });
      created++;
    }
  }

  return NextResponse.json({ created, merged }, { status: 201 });
}
