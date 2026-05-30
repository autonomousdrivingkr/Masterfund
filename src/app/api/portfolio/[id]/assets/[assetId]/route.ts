import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  shares: z.number().positive(),
  avgCost: z.number().positive(),
  currency: z.string().min(1),
});

type Ctx = { params: Promise<{ id: string; assetId: string }> };

export async function PUT(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, assetId } = await params;

  const asset = await prisma.asset.findFirst({
    where: { id: assetId, portfolioId: id, portfolio: { userId: session.user.id } },
  });
  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const updated = await prisma.asset.update({ where: { id: assetId }, data: parsed.data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, assetId } = await params;

  const asset = await prisma.asset.findFirst({
    where: { id: assetId, portfolioId: id, portfolio: { userId: session.user.id } },
  });
  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.asset.delete({ where: { id: assetId } });
  return new NextResponse(null, { status: 204 });
}
