"use client";
import { useEffect, useState } from "react";

type Review = {
  id: string;
  rating: number;
  content: string;
  createdAt: string;
  user: { id: string; displayName: string };
  score: number;
};

export default function ReviewClient(props: {
  googleId: string;
  title: string;
  authors: string;
  thumbnail?: string | null;
}) {
  const { googleId, title, authors, thumbnail } = props;
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/books/${encodeURIComponent(googleId)}`);
      const json = await res.json();
      if (!res.ok) {
        const msg = json?.error ?? JSON.stringify(json);
        setError(String(msg));
        setReviews([]);
      } else {
        setReviews(json?.local?.reviews ?? []);
      }
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setReviews([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [googleId]);

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        googleId,
        title,
        authors,
        thumbnail,
        rating,
        content,
      }),
    });
    setContent("");
    setRating(5);
    await load();
    setSubmitting(false);
  }

  async function vote(reviewId: string, value: 1 | -1) {
    const res = await fetch(`/api/reviews/${reviewId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    const json = await res.json();

    await load();
    return json;
  }

  return (
    <section className="mt-8">
      <h2 className="text-xl font-medium">Reseñas</h2>

      <form
        onSubmit={submitReview}
        className="mt-4 border rounded-xl p-4 space-y-3"
      >
        <div className="flex items-center gap-2">
          <label className="text-sm">Calificación:</label>
          <select
            className="border rounded px-2 py-1"
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
          >
            {[5, 4, 3, 2, 1]
              .reverse()
              .reverse()
              .map((n) => (
                <option key={n} value={n}>
                  {n} ⭐
                </option>
              ))}
          </select>
        </div>
        <textarea
          className="w-full border rounded-lg p-2"
          placeholder="Escribe tu reseña..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          required
          minLength={3}
        />
        <button className="border rounded-lg px-4 py-2" disabled={submitting}>
          {submitting ? "Publicando…" : "Publicar reseña"}
        </button>
      </form>

      {loading ? (
        <p className="mt-4">Cargando reseñas…</p>
      ) : error ? (
        <p className="mt-4 text-red-600">Error cargando reseñas: {error}</p>
      ) : reviews.length === 0 ? (
        <p className="mt-4 opacity-70">Sé el primero en reseñar este libro.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="border rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="font-medium">{"⭐".repeat(r.rating)}</div>
                <div className="text-sm opacity-70">
                  por {r.user.displayName}
                </div>
              </div>
              <p className="mt-2 whitespace-pre-wrap">{r.content}</p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => vote(r.id, 1)}
                  className="border rounded px-2 py-1"
                  aria-label="Votar a favor"
                >
                  ▲
                </button>
                <span className="min-w-6 text-center">{r.score}</span>
                <button
                  onClick={() => vote(r.id, -1)}
                  className="border rounded px-2 py-1"
                  aria-label="Votar en contra"
                >
                  ▼
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
