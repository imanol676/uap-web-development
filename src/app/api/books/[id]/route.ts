import { NextResponse } from "next/server";
import { getBookById, pickThumb } from "@/lib/googleBooks";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const bookId = params.id;

  if (!bookId) {
    return NextResponse.json({ error: "Book ID is required" }, { status: 400 });
  }

  try {
    const book = await getBookById(bookId);

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const mappedBook = {
      id: book.id,
      title: book.volumeInfo.title,
      authors: book.volumeInfo.authors || [],
      description: book.volumeInfo.description || "",
      thumbnail: pickThumb(book.volumeInfo),
    };

    // Save to database and fetch local reviews
    const dbBook = await prisma.book.upsert({
      where: { id: bookId },
      update: {},
      create: {
        id: bookId,
        title: mappedBook.title ?? "",
        authors: mappedBook.authors.join(", "),
        description: mappedBook.description,
        thumbnailUrl: mappedBook.thumbnail,
      },
      include: { reviews: { include: { user: true, votes: true } } },
    });

    const local = dbBook.reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      content: r.content,
      createdAt: r.createdAt,
      user: { id: r.user.id, displayName: r.user.name ?? "Guest" },
      score: r.votes.reduce((s, v) => s + v.value, 0),
    }));

    return NextResponse.json({ ...mappedBook, local: { reviews: local } });
  } catch (error) {
    console.error("Error fetching book:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
