import { Database } from "sqlite-async";

const setupDatabase = async function () {
  try {
    const db = await Database.open("test.db");
    console.log("Database opened successfully");

    await db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE
      )
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        description TEXT NOT NULL,
        duration INTEGER NOT NULL,
        date TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    return db;
  } catch (err) {
    console.error("Error opening database:", err);
    throw err;
  }
};

export { setupDatabase };
