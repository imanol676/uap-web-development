export const BASE = "https://www.googleapis.com/books/v1/volumes";

export type GoogleBook = {
  id: string;
  volumeInfo: {
    title?: string;
    authors?: string[];
    description?: string;
    imageLinks?: {
      smallThumbnail?: string;
      thumbnail?: string;
    };
    pageCount?: number;
    categories?: string[];
    publishedDate?: string;
    publisher?: string;
    industryIdentifiers?: { type: string; identifier: string }[];
  };
};

export async function searchBooks(query: string): Promise<GoogleBook[]> {
  const url = `${BASE}?q=${encodeURIComponent(query)}&maxResults=20`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Error fetching books");
  }
  const data = await res.json();
  return data.items || [];
}

export async function getBookById(id: string): Promise<GoogleBook | null> {
  const url = `${BASE}/${id}`;
  const res = await fetch(url);
  if (!res.ok) {
    return null;
  }
  const data = await res.json();
  return data;
}

export function pickThumb(v?: GoogleBook["volumeInfo"]) {
  return v?.imageLinks?.thumbnail || v?.imageLinks?.smallThumbnail || null;
}
