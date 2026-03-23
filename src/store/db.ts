import Database from "@tauri-apps/plugin-sql";

let dbPromise: Promise<Database> | null = null;

export const getDb = (): Promise<Database> => {
  if (!dbPromise) {
    dbPromise = Database.load("sqlite:db.sqlite");
  }
  return dbPromise;
};
