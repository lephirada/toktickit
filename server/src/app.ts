import express, { Request, Response } from "express";
import cors from "cors";
import { getPrisma } from "./prisma.js";

export const app = express();

app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// Issue 2 — API health check
// ---------------------------------------------------------------------------
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    service: "TokTickIT API",
  });
});

// ---------------------------------------------------------------------------
// Issue 4 — Category list
// GET /api/categories
// ---------------------------------------------------------------------------
app.get("/api/categories", async (_req: Request, res: Response) => {
  try {
    const categories = await getPrisma().category.findMany({
      select: { id: true, name: true },
      orderBy: { id: "asc" },
    });
    res.status(200).json(categories);
  } catch {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// ---------------------------------------------------------------------------
// Issue 6 — Active Requester Users
// GET /api/requesters
// ---------------------------------------------------------------------------
app.get("/api/requesters", async (_req: Request, res: Response) => {
  try {
    const requesters = await getPrisma().requesterUser.findMany({
      where: { isActive: true },
      select: {
        id: true,
        email: true,
        fullName: true,
        department: true,
        isActive: true,
      },
      orderBy: { id: "asc" },
    });
    res.status(200).json({ data: requesters });
  } catch {
    res.status(500).json({ error: "Failed to fetch requesters" });
  }
});

// ---------------------------------------------------------------------------
// Issue 6 — Related Systems
// GET /api/related-systems
// ---------------------------------------------------------------------------
app.get("/api/related-systems", async (req: Request, res: Response) => {
  try {
    const categoryIdQuery = req.query.categoryId;
    const categoryId = categoryIdQuery !== undefined ? Number(categoryIdQuery) : undefined;
    const systems = await getPrisma().relatedSystem.findMany({
      where: categoryId !== undefined && !isNaN(categoryId) ? { categoryId } : undefined,
      select: {
        id: true,
        name: true,
        categoryId: true,
      },
      orderBy: { id: "asc" },
    });
    res.status(200).json(systems);
  } catch {
    res.status(500).json({ error: "Failed to fetch related systems" });
  }
});

// ---------------------------------------------------------------------------
// Issue 6 — Tickets list scoped to requester
// GET /api/tickets
// ---------------------------------------------------------------------------
app.get("/api/tickets", async (req: Request, res: Response) => {
  try {
    const requesterIdHeader = req.headers["x-requester-id"];
    const requesterId = requesterIdHeader ? Number(requesterIdHeader) : undefined;

    const tickets = await getPrisma().ticket.findMany({
      where: requesterId !== undefined && !isNaN(requesterId) ? { requesterId } : undefined,
      select: {
        id: true,
        ticketNo: true,
        summary: true,
        description: true,
        priority: true,
        status: true,
        categoryId: true,
        relatedSystemId: true,
        requesterId: true,
        createdAt: true,
        updatedAt: true,
        category: { select: { id: true, name: true } },
        relatedSystem: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json({ data: tickets });
  } catch {
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
});

export default app;
