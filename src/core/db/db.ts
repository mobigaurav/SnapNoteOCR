// src/core/db/db.ts
import { open, type QuickSQLiteConnection } from 'react-native-quick-sqlite';

const DB_NAME = 'snapnote.db';

// Keep a singleton connection for the app lifetime.
let conn: QuickSQLiteConnection | null = null;

export const getDb = (): QuickSQLiteConnection => {
  if (conn) return conn;

  conn = open({
    name: DB_NAME,
    // "default" is the commonly used location value in quick-sqlite wrappers
    // If your build complains, we can remove location entirely.
    location: 'default',
  });

  return conn;
};
