import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/user";

type Body = { value: number };

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await ensureUser();
  const body = (await request.json()) as Body;
  const { value } = body;

  if (value !== 1 && value !== -1) {
    return NextResponse.json({ error: "Invalid vote value" }, { status: 400 });
  }

  const reviewId = params.id;

  // buscar voto existente
  const existing = await prisma.vote.findUnique({
    where: { reviewId_userId: { reviewId, userId: user.id } },
  });

  if (!existing) {
    await prisma.vote.create({
      data: { reviewId, userId: user.id, value },
    });
  } else if (existing.value === value) {
    await prisma.vote.delete({
      where: { reviewId_userId: { reviewId, userId: user.id } },
    });
  } else {
    await prisma.vote.update({
      where: { reviewId_userId: { reviewId, userId: user.id } },
      data: { value },
    });
  }

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: { votes: true, user: true, _count: { select: { votes: true } } },
  });

  if (!review) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  const score = review.votes.reduce((s, v) => s + v.value, 0);

  return NextResponse.json({
    success: true,
    review: { id: review.id, score, votesCount: review._count.votes },
  });
}
