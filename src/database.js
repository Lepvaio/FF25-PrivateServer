import fs from "node:fs/promises";
import path from "node:path";

const dataDir = process.env.DATA_DIR || path.resolve("data");
const dbPath = path.join(dataDir, "database.json");

const emptyDb = () => ({ users: [] });

export async function readDb() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    const raw = await fs.readFile(dbPath, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.users)) return emptyDb();
    return parsed;
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Database read failed:", error.message);
      throw new Error("Database is unavailable");
    }
    const initial = emptyDb();
    await writeDb(initial);
    return initial;
  }
}

export async function writeDb(db) {
  await fs.mkdir(dataDir, { recursive: true });
  const tempPath = `${dbPath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(db, null, 2), { mode: 0o600 });
  await fs.rename(tempPath, dbPath);
}
