import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const patchSchema = z.object({ name: z.string().min(1).max(100) });

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const portfolio = await prisma.portfolio.findUnique({ where: { id } });
  if (!portfolio) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (portfolio.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const updated = await prisma.portfolio.update({ where: { id }, data: { name: parsed.data.name } });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const portfolio = await prisma.portfolio.findUnique({ where: { id } });
  if (!portfolio) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (portfolio.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.portfolio.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
