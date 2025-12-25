// src/core/db/notesRepo.ts
import { getDb } from './db';

export type Note = {
  id: string;
  title: string;
  body: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
};

const toRow = (n: Note) => ({
  ...n,
  tags: JSON.stringify(n.tags ?? []),
});

const fromRow = (r: any): Note => ({
  id: r.id,
  title: r.title,
  body: r.body,
  tags: safeParseTags(r.tags),
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
});

const safeParseTags = (tagsJson: any): string[] => {
  try {
    const v = JSON.parse(tagsJson ?? '[]');
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
};

export const NotesRepo = {
  async list(): Promise<Note[]> {
    const db = getDb();
    const res = await db.executeAsync(
      `SELECT id, title, body, tags, createdAt, updatedAt
       FROM notes
       ORDER BY updatedAt DESC;`
    );
    return (res.rows?._array ?? []).map(fromRow);
  },

  async getById(id: string): Promise<Note | null> {
    const db = getDb();
    const res = await db.executeAsync(
      `SELECT id, title, body, tags, createdAt, updatedAt
       FROM notes
       WHERE id = ? LIMIT 1;`,
      [id]
    );
    const row = res.rows?._array?.[0];
    return row ? fromRow(row) : null;
  },

  async upsert(note: Note): Promise<void> {
    const db = getDb();
    const row = toRow(note);
    await db.executeAsync(
      `INSERT INTO notes (id, title, body, tags, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         title=excluded.title,
         body=excluded.body,
         tags=excluded.tags,
         updatedAt=excluded.updatedAt;`,
      [row.id, row.title, row.body, row.tags, row.createdAt, row.updatedAt]
    );
  },

  async remove(id: string): Promise<void> {
    const db = getDb();
    await db.executeAsync(`DELETE FROM notes WHERE id = ?;`, [id]);
  },
};
