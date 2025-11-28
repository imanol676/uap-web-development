import { tool } from "ai";
import { z } from "zod";
import {
  createBook as dbCreateBook,
  updateBook as dbUpdateBook,
  deleteBook as dbDeleteBook,
  searchBooks as dbSearchBooks,
  getBookStats as dbGetBookStats,
} from "./db";

// Tool 1: Create Book
export const createBook = tool({
  description:
    "Crear un nuevo libro en la biblioteca. Usa esta herramienta cuando el usuario quiera agregar, añadir o crear un libro nuevo.",
  parameters: z.object({
    title: z.string().min(1).describe("Título del libro (requerido)"),
    author: z.string().min(1).describe("Autor del libro (requerido)"),
    genre: z
      .string()
      .optional()
      .describe(
        "Género literario (ficción, no ficción, fantasía, ciencia ficción, romance, misterio, etc.)"
      ),
    status: z
      .enum(["to-read", "reading", "completed"])
      .optional()
      .describe(
        "Estado de lectura: to-read (por leer), reading (leyendo), completed (completado)"
      ),
    priority: z
      .enum(["low", "medium", "high"])
      .optional()
      .describe("Prioridad de lectura: low, medium, high"),
    pages: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Número total de páginas del libro"),
    notes: z.string().optional().describe("Notas o comentarios sobre el libro"),
  }),
  execute: async ({
    title,
    author,
    genre,
    status,
    priority,
    pages,
    notes,
  }: {
    title: string;
    author: string;
    genre?: string;
    status?: "to-read" | "reading" | "completed";
    priority?: "low" | "medium" | "high";
    pages?: number;
    notes?: string;
  }) => {
    try {
      const book = dbCreateBook({
        title,
        author,
        genre,
        status,
        priority,
        pages,
        notes,
      });

      return {
        success: true,
        book,
        message: `Libro "${book.title}" de ${book.author} agregado exitosamente con ID ${book.id}`,
      };
    } catch (error) {
      return {
        success: false,
        error: "Error al crear el libro",
        details: error instanceof Error ? error.message : "Error desconocido",
      };
    }
  },
});

// Tool 2: Update Book
export const updateBook = tool({
  description:
    "Actualizar información de un libro existente. Usa esta herramienta cuando el usuario quiera modificar, cambiar, actualizar o editar un libro. También para marcar como completado, cambiar estado, actualizar progreso de lectura, o cambiar la calificación.",
  parameters: z.object({
    bookId: z
      .number()
      .int()
      .positive()
      .describe("ID único del libro a actualizar (requerido)"),
    title: z.string().min(1).optional().describe("Nuevo título del libro"),
    author: z.string().min(1).optional().describe("Nuevo autor del libro"),
    genre: z.string().optional().describe("Nuevo género literario"),
    status: z
      .enum(["to-read", "reading", "completed"])
      .optional()
      .describe("Nuevo estado de lectura"),
    rating: z
      .number()
      .int()
      .min(1)
      .max(5)
      .optional()
      .describe("Calificación del libro (1-5 estrellas)"),
    pages: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Nuevo número total de páginas"),
    currentPage: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe("Página actual de lectura"),
    priority: z
      .enum(["low", "medium", "high"])
      .optional()
      .describe("Nueva prioridad de lectura"),
    notes: z.string().optional().describe("Nuevas notas o comentarios"),
  }),
  execute: async ({
    bookId,
    ...updates
  }: {
    bookId: number;
    title?: string;
    author?: string;
    genre?: string;
    status?: "to-read" | "reading" | "completed";
    rating?: number;
    pages?: number;
    currentPage?: number;
    priority?: "low" | "medium" | "high";
    notes?: string;
  }) => {
    try {
      const updatedBook = dbUpdateBook(bookId, updates);

      if (!updatedBook) {
        return {
          success: false,
          error: `No se encontró el libro con ID ${bookId}`,
        };
      }

      return {
        success: true,
        book: updatedBook,
        message: `Libro "${updatedBook.title}" actualizado exitosamente`,
      };
    } catch (error) {
      return {
        success: false,
        error: "Error al actualizar el libro",
        details: error instanceof Error ? error.message : "Error desconocido",
      };
    }
  },
});

// Tool 3: Delete Book
export const deleteBook = tool({
  description:
    "Eliminar un libro de la biblioteca. Usa esta herramienta cuando el usuario quiera eliminar, borrar o quitar un libro.",
  parameters: z.object({
    bookId: z
      .number()
      .int()
      .positive()
      .describe("ID único del libro a eliminar (requerido)"),
  }),
  execute: async ({ bookId }: { bookId: number }) => {
    try {
      const success = dbDeleteBook(bookId);

      if (!success) {
        return {
          success: false,
          error: `No se encontró el libro con ID ${bookId}`,
        };
      }

      return {
        success: true,
        message: `Libro con ID ${bookId} eliminado exitosamente`,
      };
    } catch (error) {
      return {
        success: false,
        error: "Error al eliminar el libro",
        details: error instanceof Error ? error.message : "Error desconocido",
      };
    }
  },
});

// Tool 4: Search Books
export const searchBooks = tool({
  description:
    'Buscar y filtrar libros en la biblioteca. Usa esta herramienta cuando el usuario quiera ver, buscar, listar, mostrar o filtrar libros. También para preguntas como "qué libros tengo", "muéstrame libros de fantasía", "libros que estoy leyendo", etc.',
  parameters: z.object({
    query: z
      .string()
      .optional()
      .describe("Texto de búsqueda en título, autor o notas"),
    status: z
      .enum(["to-read", "reading", "completed"])
      .optional()
      .describe("Filtrar por estado de lectura"),
    genre: z.string().optional().describe("Filtrar por género literario"),
    priority: z
      .enum(["low", "medium", "high"])
      .optional()
      .describe("Filtrar por prioridad"),
    minRating: z
      .number()
      .int()
      .min(1)
      .max(5)
      .optional()
      .describe("Calificación mínima (1-5)"),
    sortBy: z
      .enum(["createdAt", "title", "author", "rating", "priority"])
      .optional()
      .describe("Campo por el cual ordenar"),
    sortOrder: z
      .enum(["asc", "desc"])
      .optional()
      .describe("Orden ascendente o descendente"),
    limit: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Número máximo de resultados (default: 50)"),
  }),
  execute: async (filters: {
    query?: string;
    status?: "to-read" | "reading" | "completed";
    genre?: string;
    priority?: "low" | "medium" | "high";
    minRating?: number;
    sortBy?: "createdAt" | "title" | "author" | "rating" | "priority";
    sortOrder?: "asc" | "desc";
    limit?: number;
  }) => {
    try {
      const result = dbSearchBooks(filters);

      return {
        success: true,
        books: result.books,
        total: result.total,
        count: result.books.length,
        hasMore: result.total > result.books.length,
        message:
          result.books.length > 0
            ? `Se encontraron ${result.total} libro(s)${
                result.total > result.books.length
                  ? ` (mostrando ${result.books.length})`
                  : ""
              }`
            : "No se encontraron libros con esos criterios",
      };
    } catch (error) {
      return {
        success: false,
        error: "Error al buscar libros",
        details: error instanceof Error ? error.message : "Error desconocido",
      };
    }
  },
});

// Tool 5: Get Book Statistics
export const getBookStats = tool({
  description:
    "Obtener estadísticas y análisis de la biblioteca de libros. Usa esta herramienta cuando el usuario pregunte por estadísticas, resumen, progreso, cuántos libros ha leído, calificaciones promedio, géneros favoritos, etc.",
  parameters: z.object({
    period: z
      .enum(["today", "week", "month", "year", "all-time"])
      .optional()
      .describe("Periodo de tiempo para las estadísticas (default: all-time)"),
  }),
  execute: async ({
    period,
  }: {
    period?: "today" | "week" | "month" | "year" | "all-time";
  }) => {
    try {
      const stats = dbGetBookStats(period);

      return {
        success: true,
        stats,
        message: "Estadísticas generadas exitosamente",
      };
    } catch (error) {
      return {
        success: false,
        error: "Error al generar estadísticas",
        details: error instanceof Error ? error.message : "Error desconocido",
      };
    }
  },
});

// Export all tools
export const bookTools = {
  createBook,
  updateBook,
  deleteBook,
  searchBooks,
  getBookStats,
};
