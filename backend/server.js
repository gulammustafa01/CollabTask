import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import { Server } from "socket.io";
import rateLimit from "express-rate-limit";

import { connectDB } from "./config/db.js";
import { initSocket } from "./socket/socketHandler.js";
import authRoutes from "./routes/auth.js";
import boardRoutes from "./routes/boards.js";
import aiRoutes from "./routes/ai.js";

dotenv.config();

if (!process.env.MONGO_URI) console.warn("⚠️  MONGO_URI is not set in backend/.env");
if (!process.env.JWT_SECRET) console.warn("⚠️  JWT_SECRET is not set in backend/.env — auth will fail");
if (!process.env.GROQ_API_KEY) {
  console.warn("⚠️  GROQ_API_KEY is not set in backend/.env — AI features (priority suggest, sprint summary) will error until you add one: https://console.groq.com/keys");
}

connectDB();

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

const io = new Server(server, {
  cors: { origin: CLIENT_URL, credentials: true },
});

app.set("io", io);

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json({ limit: "1mb" }));

// Basic rate limiting, especially important on AI endpoints (costs money/quota)
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 100 });
const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 15 });
app.use("/api", apiLimiter);
app.use("/api/ai", aiLimiter);

app.get("/api/health", (req, res) => res.json({ status: "ok", time: new Date() }));

app.use("/api/auth", authRoutes);
app.use("/api/boards", boardRoutes);
app.use("/api/ai", aiRoutes);

initSocket(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
