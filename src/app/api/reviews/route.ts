import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/user";
import { z } from "zod";

const reviewBodySchema = z.object({
  googleId: z.string(),
  title: z.string().min(1),
  authors: z.string().optional().default(""),
  thumbnail: z.string().url().optional().nullable(),
  rating: z.number().int().min(1).max(5),
  content: z.string().min(3).max(5000),
});

export async function POST(request: Request) {
  const user = await ensureUser();
  const body = await request.json();
  const parsedBody = reviewBodySchema.parse(body);

  const book = await prisma.book.upsert({
    where: { id: parsedBody.googleId },
    update: {
      title: parsedBody.title,
      authors: parsedBody.authors ?? "",
      thumbnailUrl: parsedBody.thumbnail ?? undefined,
    },
    create: {
      id: parsedBody.googleId,
      title: parsedBody.title,
      authors: parsedBody.authors ?? "",
      thumbnailUrl: parsedBody.thumbnail ?? undefined,
    },
  });

  const review = await prisma.review.create({
    data: {
      bookId: book.id,
      userId: user.id,
      rating: parsedBody.rating,
      content: parsedBody.content,
    },
  });

  return NextResponse.json({
    message: "Review created successfully",
    review: {
      ...review,
      book: {
        id: book.id,
        title: book.title,
        authors: book.authors,
        thumbnailUrl: book.thumbnailUrl,
      },
    },
  });
}
