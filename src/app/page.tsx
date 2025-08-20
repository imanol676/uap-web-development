"use client";
import { useState } from "react";
import Link from "next/link";

type Item = {
  id: string;
  title: string;
  authors: string[];
  thumbnail?: string | null;
};

export default function Home() {
  const [query, setQuery] = useState("");
  const [loading, Setloading] = useState(false);
  const [items, setItems] = useState<Item[]>([]);

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length < 2) return;
    Setloading(true);
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const json = await res.json();
    console.log(json);
    setItems(json.results ?? []);
    Setloading(false);
  }

  return (
    <main className="max-w-4xl mx-auto p-4 bg-[#333] text-white">
      <h1 className="text-3xl font-semibold">
        ElPapu<span className="font-semibold text-violet-600">Lector</span>
      </h1>
      <form onSubmit={onSearch} className="mt-4 flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Título, autor o ISBN..."
          className="border rounded-lg px-3 py-2 w-full bg-white text-black"
        />
        <button className="bg-violet-700 hover:bg-violet-500 rounded-lg px-4 py-2 ">
          Buscar
        </button>
      </form>

      {loading && <p className="mt-6">Buscando...</p>}

      <ul className="mt-6 grid md:grid-cols-2 gap-4">
        {items.map((b) => (
          <li key={b.id} className="border rounded-xl p-4 flex gap-4">
            {b.thumbnail && (
              <img
                src={b.thumbnail}
                alt=""
                className="w-20 h-28 object-cover rounded"
              />
            )}
            <div className="flex-1">
              <h3 className="font-medium">{b.title}</h3>
              <p className="text-sm opacity-70">
                {(b.authors || []).join(", ")}
              </p>
              <Link
                className="inline-block mt-2 text-violet-600 hover:underline"
                href={`/book/${b.id}`}
              >
                Ver detalles
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
