import express from "express";
import dotenv from "dotenv";
dotenv.config({ override: true });
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import { type Request, type Response } from "express";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Simple in-memory DB for prototype
  let tasks: any[] = [];

  let memory: any[] = [];
  let userHabits: string[] = ["Thích tập gym vào lúc 5h hoặc 6h sáng."];
  const clients = new Set<Response>();

  // Helper for SSE
  const broadcastNotification = (data: any) => {
    clients.forEach(client => {
      client.write(`data: ${JSON.stringify(data)}\n\n`);
    });
  };

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Tasks API
  app.get("/api/tasks", (req, res) => {
    // For demo purposes, we return all tasks. In real app, filter by userId and date.
    res.json(tasks.sort((a, b) => a.startTime - b.startTime));
  });

  app.post("/api/tasks", (req, res) => {
    const newTaskStartTime = req.body.startTime;
    const newTaskEndTime = req.body.endTime;
    
    // Check conflicts
    const conflicts = tasks.filter(t => 
      t.status !== "REJECTED" &&
      t.status !== "DONE" &&
      ((newTaskStartTime >= t.startTime && newTaskStartTime < t.endTime) || 
      (newTaskEndTime > t.startTime && newTaskEndTime <= t.endTime) ||
      (newTaskStartTime <= t.startTime && newTaskEndTime >= t.endTime))
    );

    if (conflicts.length > 0) {
      return res.status(409).json({ error: "Thời gian này đã có lịch. Vui lòng chọn thời gian khác.", conflicts });
    }

    const task = {
      ...req.body,
      id: req.body.id || Math.random().toString(36).substr(2, 9),
      status: req.body.status || "DRAFT",
      userId: "demo",
      createdAt: new Date().getTime()
    };
    tasks.push(task);
    res.json(task);
  });

  app.patch("/api/tasks/confirm", (req, res) => {
    const { taskIds, action } = req.body;
    if (action === "confirm_all") {
      tasks = tasks.map(t => taskIds.includes(t.id) ? { ...t, status: "PINNED" } : t);
    } else if (action === "reject") {
      tasks = tasks.filter(t => !taskIds.includes(t.id));
    }
    res.json({ success: true });
  });

  app.patch("/api/tasks/:id", (req, res) => {
    tasks = tasks.map(t => t.id === req.params.id ? { ...t, ...req.body } : t);
    res.json({ success: true });
  });

  app.delete("/api/tasks/:id", (req, res) => {
    tasks = tasks.filter(t => t.id !== req.params.id);
    res.json({ success: true });
  });

  // Memory API
  app.post("/api/memory/update", (req, res) => {
    memory.push({ id: Math.random().toString(), content: req.body.content, timestamp: Date.now() });
    res.json({ success: true });
  });

  app.post("/api/memory/search", (req, res) => {
    // Mock semantic search
    res.json({ results: memory.slice(0, 3) });
  });

  // Notifications API
  app.get("/api/notifications/stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    
    clients.add(res);

    req.on("close", () => {
      clients.delete(res);
    });
  });

  // Chat endpoint removed - logic moved to frontend aiService

  // Simulate pushing a notification every 2 minutes for the prototype
  setInterval(() => {
    broadcastNotification({
      id: Math.random().toString(),
      title: "Cập nhật Email",
      message: "Có 2 email mới từ giáo viên. Bạn có muốn AI tóm tắt nội dung không?",
      timestamp: Date.now()
    });
  }, 120000);
  
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
