import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  currency: z.string().default("USD"),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const portfolios = await prisma.portfolio.findMany({
    where: { userId: session.user.id },
    include: { assets: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(portfolios);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const portfolio = await prisma.portfolio.create({
    data: { ...parsed.data, userId: session.user.id },
  });

  return NextResponse.json(portfolio, { status: 201 });
}
