// src/core/db/schema.ts
import { getDb } from './db';

export const initDb = async (): Promise<void> => {
  const db = getDb();

  // Lightweight migration strategy: user_version
  // Create meta + tables if needed.
  db.execute('PRAGMA journal_mode=WAL;');
  db.execute('PRAGMA foreign_keys=ON;');

  const verRes = await db.executeAsync('PRAGMA user_version;');
  const currentVersion = verRes.rows?._array?.[0]?.user_version ?? 0;

  if (currentVersion < 1) {
    await db.executeAsync(`
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        tags TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      );
    `);

    await db.executeAsync('CREATE INDEX IF NOT EXISTS idx_notes_updatedAt ON notes(updatedAt DESC);');
    await db.executeAsync('PRAGMA user_version = 1;');
  }
};
