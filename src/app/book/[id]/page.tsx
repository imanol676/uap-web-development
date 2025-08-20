import { pickThumb, getBookById } from "@/lib/googleBooks";
import ReviewClient from "./review-client";

export default async function BookPage({ params }: { params: { id: string } }) {
  const g = await getBookById(params.id);

  if (!g) {
    return (
      <main className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-semibold">Libro no encontrado</h1>
        <p className="opacity-80">No se pudo encontrar el libro solicitado.</p>
      </main>
    );
  }

  const thumb = pickThumb(g.volumeInfo);

  return (
    <main className="max-w-3xl mx-auto p-6 ">
      <div className="flex gap-4">
        {thumb && (
          <img src={thumb} alt="" className="w-28 h-40 object-cover rounded" />
        )}
        <div>
          <h1 className="text-2xl font-semibold">{g.volumeInfo.title}</h1>
          <p className="opacity-80">
            {(g.volumeInfo.authors ?? []).join(", ")}
          </p>
          <p className="text-sm mt-2 opacity-70">
            {g.volumeInfo.publisher} • {g.volumeInfo.publishedDate}
          </p>
        </div>
      </div>

      <section className="mt-6">
        <h2 className="text-xl font-medium">Descripción</h2>
        <p className="mt-2 whitespace-pre-wrap opacity-90">
          {g.volumeInfo.description ?? "Sin descripción."}
        </p>
      </section>

      <ReviewClient
        googleId={g.id}
        title={g.volumeInfo.title ?? "Sin título"}
        authors={(g.volumeInfo.authors ?? []).join(", ")}
        thumbnail={thumb}
      />
    </main>
  );
}
