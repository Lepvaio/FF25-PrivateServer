# FF25-PrivateServer v0.1

A small standalone experimental account/lobby API built with Node.js 18+ and no third-party runtime dependencies.

> **Compatibility warning:** This project does not connect to, impersonate, or replace Garena's official servers. It is not compatible with the original Free Fire 1.25 APK by default. It provides a safe backend prototype that can be tested independently. Do not bypass authentication, certificate pinning, anti-cheat, or other protections in the game.

## Features

- `GET /health` — health check
- `POST /api/register` — create a test account
- `POST /api/login` — sign in
- `GET /api/me` — current account (Bearer token)
- `GET /api/lobby` — experimental lobby response (Bearer token)
- Passwords hashed with Node.js `scrypt`
- JSON-file storage for local prototyping

## Run locally

Requires Node.js 18 or newer.

```bash
npm start
```

The server listens on port `3000` by default.

## Test the API

Health check:

```bash
curl http://localhost:3000/health
```

Register:

```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"player123","password":"test-password-123"}'
```

Login:

```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"player123","password":"test-password-123"}'
```

Use the returned `token`:

```bash
curl http://localhost:3000/api/lobby \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Environment variables

- `PORT` — listening port (default `3000`)
- `HOST` — bind address (default `0.0.0.0`)
- `DATA_DIR` — directory for `database.json` (default `./data`)
- `ALLOWED_ORIGIN` — CORS origin (default `*`; set a specific origin when you have a web client)

## Deployment notes

Deploy as a Node.js web service with build command empty (no dependencies) and start command `npm start`. A free hosting plan may sleep, have usage limits, or erase local files on restart/redeploy. Use persistent storage or a managed database before relying on account persistence.

## API examples

### `POST /api/register`

Request:

```json
{"username":"player123","password":"test-password-123"}
```

Response:

```json
{
  "token": "example-session-token",
  "user": {
    "id": "generated-uuid",
    "username": "player123",
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

### `GET /api/lobby`

Requires `Authorization: Bearer <token>`.

Returns a test lobby status and the authenticated test account.

## Current limitations

- Sessions are kept in memory and are cleared when the server restarts.
- JSON storage is suitable only for a prototype and a single server instance.
- Matchmaking and real-time gameplay are not implemented.
- This API does not discover or reproduce the official game's private network protocol.
