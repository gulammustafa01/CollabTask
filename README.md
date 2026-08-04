# CollabTask — Real-Time Collaborative Task Board

A Trello/Linear-style task board with **real-time multiplayer sync**, **role-based permissions**, and **AI-powered priority suggestions**. Built on the MERN stack with a Socket.io real-time layer.

## Features

- **Multi-user boards with drag-and-drop** — powered by `@hello-pangea/dnd` (a maintained fork of react-beautiful-dnd). Cards can be dragged between lists, and lists themselves can be reordered.
- **Real-time sync via Socket.io** — when one user moves a card, every other connected user sees it update instantly, with no refresh needed. Includes live presence avatars and a "so-and-so is moving this card" indicator.
- **Role-based permissions (RBAC)** — three roles per board: `owner`, `editor`, `viewer`. Enforced by backend middleware (`middleware/rbac.js`) on every route — this is real server-side enforcement, not just a UI-level restriction.
- **Activity log** — every action (card created/moved/deleted, member added, role changed, comment added) is stored in an `ActivityLog` collection and streamed live to the sidebar.
- **Card comments** — threaded comments on each card, synced in real time (`comment:new` / `comment:deleted` socket events). Users can delete their own comments; owners can delete any comment.
- **Due date reminders** — set a due date on any card and get automatic visual badges: "Overdue" (red), "Due today" (amber), "Due tomorrow" / "Due <date>" (muted) — computed client-side, no extra cron infrastructure needed.
- **Drag-and-drop list reordering** — not just cards; entire columns (lists) can be dragged to reorder, synced live to all connected users.
- **Dark/light theme toggle** — CSS-variable-based theming, persisted in `localStorage`, respects system preference (`prefers-color-scheme`), and applies before first paint to avoid a flash of unstyled content.
- **Fully responsive** — on mobile, the side panel (Members/Activity/AI Summary) becomes a slide-over drawer, the header wraps gracefully, and boards scroll horizontally (similar to the Trello mobile app).
- **AI features (Groq API)**:
  - ✨ **Auto-suggest priority** — the AI reads a card's title/description and suggests a priority (low/medium/high/urgent) with a short reason.
  - ✨ **AI sprint summary** — generates a concise stand-up-style summary of the whole board (progress, urgent items, a suggestion for the team).

## Architecture

```
collabtask/
├── backend/           Express + Socket.io + MongoDB
│   ├── models/         User, Board, List, Card, Comment, ActivityLog (Mongoose schemas)
│   ├── middleware/      auth.js (JWT), rbac.js (role enforcement)
│   ├── routes/           auth, boards (lists/cards/members/comments/activity nested), ai
│   ├── socket/            socketHandler.js — JWT-authenticated socket connections, board rooms, presence tracking
│   └── utils/groq.js      Groq SDK wrapper for priority suggestion + sprint summary
└── frontend/          React 18 + Vite + Tailwind
    ├── context/AuthContext.jsx, ThemeContext.jsx    Auth state, dark/light theme state
    ├── hooks/useSocket.js                             Per-board socket connection lifecycle
    ├── pages/                                          Login, Register, Dashboard, BoardView
    └── components/                                     ListColumn, CardItem, CardModal, ActivityFeed, MembersPanel, SprintSummaryPanel, ThemeToggle
```

### Real-time flow (core differentiator)

1. The frontend's `useSocket` hook connects a socket using the user's JWT and emits `board:join`.
2. The backend socket middleware verifies the token, joins the user to a `board:<id>` room, and updates an in-memory presence map.
3. When a user creates/moves/updates/deletes a card (or list) — a REST API call persists the change, and that same route handler does `io.to(room).emit(...)` to broadcast the event to every connected client on that board.
4. The frontend updates the UI optimistically right after a drag, and rolls back via `loadBoard()` if the API call fails.

### RBAC enforcement

`requireBoardRole(minRole)` middleware checks a role hierarchy (`viewer < editor < owner`) — so owner-only routes (member invite, role change) are only reachable by owners, and viewers can never create/edit cards or lists — even if the frontend were bypassed, the backend always rejects it.

### Design system

- **Typography**: Sora for headings, Inter for body text, IBM Plex Mono for metadata (timestamps, priority labels, dates) — giving the interface a "system console" feel appropriate for a developer tool.
- **Signature element**: priority is signaled with a colored left rail on each card (like a physical index-card tab) — green (low), blue (medium), amber (high), red (urgent) — used consistently across the app instead of just a text badge.
- **Theming**: all colors are CSS custom properties (`--color-*`), swapped by a `data-theme` attribute on `<html>`, so light/dark mode requires no component-level conditional logic.

## Setup (local development)

### 1. Backend

```bash
cd backend
cp .env.example .env
# fill in MONGO_URI, JWT_SECRET, and GROQ_API_KEY in .env
npm install
npm run dev
```

Get a free Groq API key at: https://console.groq.com/keys

### 2. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

The frontend runs on `http://localhost:5173`, the backend on `http://localhost:5000`.

### 3. Trying out the real-time features

Open two browser windows/tabs (e.g. one normal, one incognito), log in with two different accounts, invite the second account to a board from the **Members** tab (as the owner), and drag a card in one window — you'll see it move instantly in the other.

## Deployment notes

- **Backend**: deploy to Render or Railway — Socket.io needs WebSocket support, so serverless platforms like Vercel functions (which are stateless, short-lived) won't work for the backend.
- **Frontend**: deploy to Vercel, and point `VITE_API_URL` / `VITE_SOCKET_URL` at your production backend URL.
- **MongoDB**: MongoDB Atlas free tier works well.
- **Security**: never commit `.env`. Use a strong random `JWT_SECRET` in production, and set `CORS`'s `CLIENT_URL` to your actual frontend domain.

## Resume bullet (ready to use)

> Built a real-time collaborative task board (MERN + Socket.io) with drag-and-drop boards and lists, role-based access control (owner/editor/viewer) enforced at the API layer, live presence, threaded comments, and activity logging; shipped a fully responsive UI with dark/light theming and an AI-powered feature (Groq/Llama 3.3) for automatic task-priority suggestion and sprint summarization.

**Shorter version (one line):**

> Real-time collaborative task board (MERN + Socket.io) with RBAC, drag-drop, live comments, and AI-powered priority suggestions (Groq API) — fully responsive, dark/light themed.
