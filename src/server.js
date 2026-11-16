import http from "node:http";
import { URL } from "node:url";
import { register, login, getUserForToken } from "./routes/auth.js";
import { getLobby } from "./routes/lobby.js";

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";
const MAX_BODY = 16 * 1024;
const requestCounts = new Map();

function send(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  res.end(JSON.stringify(payload));
}

function applyCors(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGIN === "*") {
    res.setHeader("Access-Control-Allow-Origin", "*");
  } else if (origin === ALLOWED_ORIGIN) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
}

function checkRateLimit(req) {
  const key = req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const entry = requestCounts.get(key) || { start: now, count: 0 };
  if (now - entry.start > 60_000) {
    entry.start = now;
    entry.count = 0;
  }
  entry.count += 1;
  requestCounts.set(key, entry);
  return entry.count <= 120;
}

async function readJson(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > MAX_BODY) {
      const error = new Error("Request body is too large");
      error.status = 413;
      throw error;
    }
  }
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch {
    const error = new Error("Invalid JSON body");
    error.status = 400;
    throw error;
  }
}

function bearerToken(req) {
  const value = req.headers.authorization || "";
  return value.startsWith("Bearer ") ? value.slice(7) : "";
}

const server = http.createServer(async (req, res) => {
  applyCors(req, res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }
  if (!checkRateLimit(req)) return send(res, 429, { error: "Too many requests" });

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  try {
    if (req.method === "GET" && url.pathname === "/health") {
      return send(res, 200, { ok: true, service: "FF25 Experimental API", version: "0.1.0" });
    }

    if (req.method === "POST" && url.pathname === "/api/register") {
      const result = await register(await readJson(req));
      return send(res, 201, result);
    }

    if (req.method === "POST" && url.pathname === "/api/login") {
      const result = await login(await readJson(req));
      return send(res, 200, result);
    }

    if (req.method === "GET" && url.pathname === "/api/me") {
      const user = await getUserForToken(bearerToken(req));
      if (!user) return send(res, 401, { error: "Authentication required" });
      return send(res, 200, { user });
    }

    if (req.method === "GET" && url.pathname === "/api/lobby") {
      const user = await getUserForToken(bearerToken(req));
      if (!user) return send(res, 401, { error: "Authentication required" });
      return send(res, 200, getLobby(user));
    }

    return send(res, 404, { error: "Route not found" });
  } catch (error) {
    console.error(error);
    return send(res, error.status || 500, {
      error: error.status ? error.message : "Internal server error"
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`FF25 Experimental API listening on http://${HOST}:${PORT}`);
});
