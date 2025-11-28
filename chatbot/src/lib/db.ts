import Database from "better-sqlite3";
import path from "path";

export interface Book {
  id: number;
  title: string;
  author: string;
  genre?: string;
  status: "to-read" | "reading" | "completed";
  rating?: number;
  pages?: number;
  currentPage?: number;
  priority?: "low" | "medium" | "high";
  notes?: string;
  startDate?: string;
  finishDate?: string;
  createdAt: string;
  updatedAt: string;
  deleted?: number;
}

// Usar una ruta fija en el proyecto
const dbPath = path.join(process.cwd(), "books.db");
let db: Database.Database | null = null;

function getDb() {
  if (!db) {
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    initializeDatabase(db);
  }
  return db;
}

function initializeDatabase(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      genre TEXT,
      status TEXT NOT NULL DEFAULT 'to-read',
      rating INTEGER CHECK(rating >= 1 AND rating <= 5),
      pages INTEGER,
      currentPage INTEGER DEFAULT 0,
      priority TEXT DEFAULT 'medium',
      notes TEXT,
      startDate TEXT,
      finishDate TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      deleted INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);
    CREATE INDEX IF NOT EXISTS idx_books_genre ON books(genre);
    CREATE INDEX IF NOT EXISTS idx_books_deleted ON books(deleted);
    CREATE INDEX IF NOT EXISTS idx_books_priority ON books(priority);
  `);
}

export function createBook(data: {
  title: string;
  author: string;
  genre?: string;
  status?: "to-read" | "reading" | "completed";
  priority?: "low" | "medium" | "high";
  pages?: number;
  notes?: string;
}): Book {
  const database = getDb();

  const stmt = database.prepare(`
    INSERT INTO books (title, author, genre, status, priority, pages, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    data.title,
    data.author,
    data.genre || null,
    data.status || "to-read",
    data.priority || "medium",
    data.pages || null,
    data.notes || null
  );

  return getBookById(Number(result.lastInsertRowid))!;
}

export function updateBook(
  id: number,
  data: Partial<Omit<Book, "id" | "createdAt" | "updatedAt">>
): Book | null {
  const database = getDb();

  const updates: string[] = [];
  const values: any[] = [];

  if (data.title !== undefined) {
    updates.push("title = ?");
    values.push(data.title);
  }
  if (data.author !== undefined) {
    updates.push("author = ?");
    values.push(data.author);
  }
  if (data.genre !== undefined) {
    updates.push("genre = ?");
    values.push(data.genre);
  }
  if (data.status !== undefined) {
    updates.push("status = ?");
    values.push(data.status);

    // Auto-set dates based on status
    if (data.status === "reading" && !data.startDate) {
      updates.push("startDate = ?");
      values.push(new Date().toISOString());
    }
    if (data.status === "completed" && !data.finishDate) {
      updates.push("finishDate = ?");
      values.push(new Date().toISOString());
    }
  }
  if (data.rating !== undefined) {
    updates.push("rating = ?");
    values.push(data.rating);
  }
  if (data.pages !== undefined) {
    updates.push("pages = ?");
    values.push(data.pages);
  }
  if (data.currentPage !== undefined) {
    updates.push("currentPage = ?");
    values.push(data.currentPage);
  }
  if (data.priority !== undefined) {
    updates.push("priority = ?");
    values.push(data.priority);
  }
  if (data.notes !== undefined) {
    updates.push("notes = ?");
    values.push(data.notes);
  }
  if (data.startDate !== undefined) {
    updates.push("startDate = ?");
    values.push(data.startDate);
  }
  if (data.finishDate !== undefined) {
    updates.push("finishDate = ?");
    values.push(data.finishDate);
  }

  if (updates.length === 0) {
    return getBookById(id);
  }

  updates.push("updatedAt = ?");
  values.push(new Date().toISOString());
  values.push(id);

  const stmt = database.prepare(`
    UPDATE books 
    SET ${updates.join(", ")}
    WHERE id = ? AND deleted = 0
  `);

  stmt.run(...values);
  return getBookById(id);
}

export function deleteBook(id: number): boolean {
  const database = getDb();

  // Soft delete
  const stmt = database.prepare(`
    UPDATE books 
    SET deleted = 1, updatedAt = ? 
    WHERE id = ? AND deleted = 0
  `);

  const result = stmt.run(new Date().toISOString(), id);
  return result.changes > 0;
}

export function getBookById(id: number): Book | null {
  const database = getDb();

  const stmt = database.prepare(`
    SELECT * FROM books WHERE id = ? AND deleted = 0
  `);

  return stmt.get(id) as Book | null;
}

export function searchBooks(filters: {
  query?: string;
  status?: "to-read" | "reading" | "completed";
  genre?: string;
  priority?: "low" | "medium" | "high";
  minRating?: number;
  sortBy?: "createdAt" | "title" | "author" | "rating" | "priority";
  sortOrder?: "asc" | "desc";
  limit?: number;
}): { books: Book[]; total: number } {
  const database = getDb();

  const conditions: string[] = ["deleted = 0"];
  const params: any[] = [];

  if (filters.query) {
    conditions.push("(title LIKE ? OR author LIKE ? OR notes LIKE ?)");
    const queryPattern = `%${filters.query}%`;
    params.push(queryPattern, queryPattern, queryPattern);
  }

  if (filters.status) {
    conditions.push("status = ?");
    params.push(filters.status);
  }

  if (filters.genre) {
    conditions.push("genre = ?");
    params.push(filters.genre);
  }

  if (filters.priority) {
    conditions.push("priority = ?");
    params.push(filters.priority);
  }

  if (filters.minRating) {
    conditions.push("rating >= ?");
    params.push(filters.minRating);
  }

  const whereClause = conditions.join(" AND ");

  // Get total count
  const countStmt = database.prepare(`
    SELECT COUNT(*) as count FROM books WHERE ${whereClause}
  `);
  const { count } = countStmt.get(...params) as { count: number };

  // Get books
  const sortBy = filters.sortBy || "createdAt";
  const sortOrder = filters.sortOrder || "desc";
  const limit = filters.limit || 50;

  const booksStmt = database.prepare(`
    SELECT * FROM books 
    WHERE ${whereClause}
    ORDER BY ${sortBy} ${sortOrder}
    LIMIT ?
  `);

  const books = booksStmt.all(...params, limit) as Book[];

  return { books, total: count };
}

export function getBookStats(
  period?: "today" | "week" | "month" | "year" | "all-time"
) {
  const database = getDb();

  let dateFilter = "";
  if (period === "today") {
    dateFilter = "AND date(createdAt) = date('now')";
  } else if (period === "week") {
    dateFilter = "AND date(createdAt) >= date('now', '-7 days')";
  } else if (period === "month") {
    dateFilter = "AND date(createdAt) >= date('now', '-1 month')";
  } else if (period === "year") {
    dateFilter = "AND date(createdAt) >= date('now', '-1 year')";
  }

  // Summary stats
  const summaryStmt = database.prepare(`
    SELECT 
      COUNT(*) as totalBooks,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedBooks,
      SUM(CASE WHEN status = 'reading' THEN 1 ELSE 0 END) as readingBooks,
      SUM(CASE WHEN status = 'to-read' THEN 1 ELSE 0 END) as toReadBooks,
      AVG(CASE WHEN rating IS NOT NULL THEN rating ELSE NULL END) as avgRating,
      SUM(CASE WHEN status = 'completed' AND pages IS NOT NULL THEN pages ELSE 0 END) as totalPagesRead
    FROM books 
    WHERE deleted = 0 ${dateFilter}
  `);
  const summary = summaryStmt.get() as any;

  // Stats by genre
  const genreStmt = database.prepare(`
    SELECT 
      genre,
      COUNT(*) as total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'reading' THEN 1 ELSE 0 END) as reading,
      SUM(CASE WHEN status = 'to-read' THEN 1 ELSE 0 END) as toRead
    FROM books 
    WHERE deleted = 0 AND genre IS NOT NULL ${dateFilter}
    GROUP BY genre
  `);
  const byGenre = genreStmt.all();

  // Stats by priority
  const priorityStmt = database.prepare(`
    SELECT 
      priority,
      COUNT(*) as total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'reading' THEN 1 ELSE 0 END) as reading,
      SUM(CASE WHEN status = 'to-read' THEN 1 ELSE 0 END) as toRead
    FROM books 
    WHERE deleted = 0 ${dateFilter}
    GROUP BY priority
  `);
  const byPriority = priorityStmt.all();

  // Top rated books
  const topRatedStmt = database.prepare(`
    SELECT title, author, rating, genre
    FROM books 
    WHERE deleted = 0 AND rating IS NOT NULL ${dateFilter}
    ORDER BY rating DESC, title ASC
    LIMIT 5
  `);
  const topRated = topRatedStmt.all();

  // Reading progress
  const progressStmt = database.prepare(`
    SELECT 
      title,
      author,
      pages,
      currentPage,
      ROUND((CAST(currentPage AS FLOAT) / pages) * 100, 1) as progressPercent
    FROM books 
    WHERE deleted = 0 AND status = 'reading' AND pages > 0 ${dateFilter}
    ORDER BY progressPercent DESC
  `);
  const readingProgress = progressStmt.all();

  return {
    summary: {
      totalBooks: summary.totalBooks || 0,
      completedBooks: summary.completedBooks || 0,
      readingBooks: summary.readingBooks || 0,
      toReadBooks: summary.toReadBooks || 0,
      avgRating: summary.avgRating
        ? parseFloat(summary.avgRating.toFixed(2))
        : 0,
      totalPagesRead: summary.totalPagesRead || 0,
      completionRate:
        summary.totalBooks > 0
          ? parseFloat(
              ((summary.completedBooks / summary.totalBooks) * 100).toFixed(1)
            )
          : 0,
    },
    byGenre,
    byPriority,
    topRated,
    readingProgress,
  };
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
