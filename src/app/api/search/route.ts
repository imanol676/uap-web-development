import { NextResponse } from "next/server";
import { searchBooks, pickThumb } from "@/lib/googleBooks";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";

  if (!query) {
    return NextResponse.json({ results: [], total: 0 });
  }

  const items = await searchBooks(query);
  const mapped = items.map((item) => ({
    id: item.id,
    title: item.volumeInfo.title,
    authors: item.volumeInfo.authors || [],
    description: item.volumeInfo.description || "",
    thumbnail: pickThumb(item.volumeInfo),
  }));

  return NextResponse.json({
    results: mapped,
    total: items.length,
  });
}
