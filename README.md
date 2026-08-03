# CollabTask — Real-Time Collaborative Task Board

Trello/Linear jaisa hi, lekin **real-time multiplayer** + **role-based permissions** + **AI-powered priority suggestions** ke saath. MERN stack pe bana hai (jaise SkyArc), plus Socket.io real-time layer.

## Kya-kya hai isme

- **Multi-user boards with drag-drop** — `@hello-pangea/dnd` (maintained react-beautiful-dnd fork) se smooth drag-and-drop, cards ek list se doosri list me move ho sakte hain.
- **Real-time sync via Socket.io** — jab ek user card move kare, doosre saare connected users ko turant (bina refresh ke) dikh jaata hai. Live presence avatars, aur "so-and-so is moving this card" indicator bhi hai.
- **Role-based permissions (RBAC)** — har board pe teen roles: `owner`, `editor`, `viewer`. Backend middleware (`middleware/rbac.js`) har route pe role check karta hai — sirf UI-level restriction nahi, actual server-side enforcement.
- **Activity log** — har action (card create/move/delete, member add, role change, comments) ek `ActivityLog` collection me store hota hai aur sidebar me real-time update hota hai.
- **Card comments** — har card pe threaded comments, real-time sync (`comment:new`/`comment:deleted` socket events), sirf apna comment delete kar sakte ho (ya owner kisi ka bhi).
- **Due date reminders** — cards pe due date set karo, visual badges automatically dikhte hain: "Overdue" (red), "Due today" (amber), "Due tomorrow"/"Due <date>" (muted) — client-side computed, koi extra cron job nahi chahiye.
- **Drag-drop list reorder** — sirf cards hi nahi, poori lists (columns) bhi drag karke reorder kar sakte ho — real-time sab connected users ko sync hota hai.
- **Dark/light theme toggle** — CSS-variable based theming, localStorage me persist hoti hai, system preference (`prefers-color-scheme`) bhi respect karta hai, aur flash-of-unstyled-content avoid karne ke liye theme paint se pehle hi set ho jaati hai.
- **Fully responsive** — mobile pe board panel (Members/Activity/AI Summary) ek slide-over drawer ban jaata hai, header wrap karta hai, boards horizontally scroll karte hain (jaise Trello mobile app).
- **AI features (Groq API)**:
  - ✨ **Auto-suggest priority** — card ka title/description dekhkar AI batata hai priority kya honi chahiye (low/medium/high/urgent) + ek chhoti si reason.
  - ✨ **AI sprint summary** — poore board ka snapshot leke ek concise stand-up-style summary generate karta hai (progress, urgent items, suggestion).

## Architecture

```
collabtask/
├── backend/           Express + Socket.io + MongoDB
│   ├── models/         User, Board, List, Card, ActivityLog (Mongoose schemas)
│   ├── middleware/      auth.js (JWT), rbac.js (role enforcement)
│   ├── routes/          auth, boards (lists/cards/members/activity nested), ai
│   ├── socket/           socketHandler.js — JWT-authenticated socket connections, board rooms, presence tracking
│   └── utils/groq.js     Groq SDK wrapper for priority suggestion + sprint summary
└── frontend/          React 18 + Vite + Tailwind
    ├── context/AuthContext.jsx    JWT-based auth state
    ├── hooks/useSocket.js          per-board socket connection lifecycle
    ├── pages/                       Login, Register, Dashboard, BoardView
    └── components/                  ListColumn, CardItem, CardModal, ActivityFeed, MembersPanel, SprintSummaryPanel
```

### Real-time flow (core differentiator)

1. Frontend `useSocket` hook JWT token ke saath socket connect karta hai aur `board:join` emit karta hai.
2. Backend socket middleware token verify karta hai, user ko `board:<id>` room me join karata hai, presence Map update karta hai.
3. Jab koi card move/create/update/delete karta hai — REST API call hoti hai (persistence ke liye), aur wahi route handler `io.to(room).emit(...)` se sab connected clients ko event bhejta hai.
5. Frontend optimistically UI update karta hai (drag ke turant baad) aur agar API fail ho jaaye to `loadBoard()` se rollback kar deta hai.

### RBAC enforcement

`requireBoardRole(minRole)` middleware role hierarchy check karta hai (`viewer < editor < owner`) — matlab `owner`-only routes (member invite, role change) sirf owner access kar sakta hai, aur `viewer` role wale sirf read kar sakte hain, kabhi bhi card/list create/edit nahi kar sakte — chahe frontend bypass kiya jaaye, backend hamesha reject karega.

## Setup (local development)

### 1. Backend

```bash
cd backend
cp .env.example .env
# .env me apna MONGO_URI, JWT_SECRET, aur GROQ_API_KEY daalo
npm install
npm run dev
```

Groq API key yahan se free milti hai: https://console.groq.com/keys

### 2. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Frontend `http://localhost:5173` pe chalega, backend `http://localhost:5000` pe.

### 3. Try karna real-time feature

Do alag browser windows/tabs kholo (ya ek normal + ek incognito), dono me alag accounts se login karo, ek hi board pe dono ko invite karo (owner wale account se `Members` tab se email daal ke invite karo), aur ek window me card drag karo — doosri window me turant move hote dekhoge.

## Deployment notes

- Backend: Render/Railway pe deploy karo (Socket.io ke liye websocket support chahiye — Vercel serverless functions pe long-lived socket connections kaam nahi karte).
- Frontend: Vercel pe deploy karo, jaise tumhara portfolio — `VITE_API_URL` aur `VITE_SOCKET_URL` ko production backend URL pe point karo.
- MongoDB: MongoDB Atlas free tier use kar sakte ho.
- **Security**: `.env` kabhi commit mat karna. Production me `JWT_SECRET` strong random string rakho, aur CORS `CLIENT_URL` ko apne actual frontend domain pe set karo.

## Resume bullet (ready to use)

> Built a real-time collaborative task board (MERN + Socket.io) with drag-and-drop boards and lists, role-based access control (owner/editor/viewer) enforced at the API layer, live presence, threaded comments, and activity logging; shipped a fully responsive UI with dark/light theming and an AI-powered feature (Groq/Llama 3.3) for automatic task-priority suggestion and sprint summarization.

**Shorter version (one line):**

> Real-time collaborative task board (MERN + Socket.io) with RBAC, drag-drop, live comments, and AI-powered priority suggestions (Groq API) — fully responsive, dark/light themed.
