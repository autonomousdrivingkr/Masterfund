import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

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
