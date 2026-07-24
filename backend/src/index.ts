import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";

import { connectDB } from "./lib/db.js";

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import callRoutes from "./routes/call.route.js";
import groupRoutes from "./routes/group.route.js";
import searchRoutes from "./routes/search.route.js";
import storyRoutes from "./routes/story.route.js";
import { app, server } from "./lib/socket.js";

dotenv.config();

const PORT = process.env.PORT || 5001;
const __dirname = path.resolve();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }))
app.use(cookieParser());
app.use(cors({
  origin: ["http://localhost:5173", "https://AIGramX-frontend-swart.vercel.app", "https://texts-frontend-swart.vercel.app"],
  credentials: true,
}));

app.get("/health", (req, res) => res.sendStatus(200));

// Mount authentication routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/calls", callRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/stories", storyRoutes);



// Connect to MongoDB and start server
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});