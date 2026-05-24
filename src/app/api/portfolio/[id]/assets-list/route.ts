import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const portfolio = await prisma.portfolio.findFirst({
    where: { id, userId: session.user.id },
    include: { assets: { orderBy: { createdAt: "desc" } } },
  });

  if (!portfolio) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(portfolio.assets);
}
