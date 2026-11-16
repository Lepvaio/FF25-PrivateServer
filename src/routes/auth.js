import {
  randomBytes, scrypt as scryptCallback, timingSafeEqual, randomUUID
} from "node:crypto";
import { promisify } from "node:util";
import { readDb, writeDb } from "../database.js";

const scrypt = promisify(scryptCallback);
const sessions = new Map();

function safeUser(user) {
  return { id: user.id, username: user.username, createdAt: user.createdAt };
}

async function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  const derived = await scrypt(password, salt, 64);
  return { salt, hash: Buffer.from(derived).toString("hex") };
}

async function verifyPassword(password, user) {
  const derived = Buffer.from(await scrypt(password, user.salt, 64));
  const expected = Buffer.from(user.passwordHash, "hex");
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

export async function register({ username, password }) {
  if (typeof username !== "string" || !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    const error = new Error("Username must be 3–20 letters, numbers, or underscores");
    error.status = 400;
    throw error;
  }
  if (typeof password !== "string" || password.length < 8 || password.length > 128) {
    const error = new Error("Password must be 8–128 characters");
    error.status = 400;
    throw error;
  }

  const db = await readDb();
  if (db.users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
    const error = new Error("Username is already taken");
    error.status = 409;
    throw error;
  }

  const credentials = await hashPassword(password);
  const user = {
    id: randomUUID(),
    username,
    salt: credentials.salt,
    passwordHash: credentials.hash,
    createdAt: new Date().toISOString()
  };
  db.users.push(user);
  await writeDb(db);
  return createSession(user);
}

export async function login({ username, password }) {
  if (typeof username !== "string" || typeof password !== "string") {
    const error = new Error("Username and password are required");
    error.status = 400;
    throw error;
  }
  const db = await readDb();
  const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (!user || !(await verifyPassword(password, user))) {
    const error = new Error("Invalid username or password");
    error.status = 401;
    throw error;
  }
  return createSession(user);
}

function createSession(user) {
  const token = randomBytes(32).toString("base64url");
  sessions.set(token, { userId: user.id, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  return { token, user: safeUser(user) };
}

export async function getUserForToken(token) {
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }
  const db = await readDb();
  const user = db.users.find(u => u.id === session.userId);
  return user ? safeUser(user) : null;
}

export function revokeToken(token) {
  if (token) sessions.delete(token);
}
