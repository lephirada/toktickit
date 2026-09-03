import express, { Request, Response } from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { getPrisma } from "./prisma.js";
import { Prisma, Priority, TicketStatus } from "@prisma/client";
import { requireRequesterAuth, AuthenticatedRequest } from "./middleware/auth.js";
import { handlePreUploadMiddleware, UPLOAD_DIR } from "./middleware/upload.js";
import { createErrorEnvelope, FieldError } from "./utils/errors.js";

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
// Issue 8 — My Tickets Query API with Filtering & Pagination
// GET /api/tickets
// ---------------------------------------------------------------------------
app.get(
  "/api/tickets",
  requireRequesterAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const requesterId = req.requesterId!;
      const {
        search,
        categoryId,
        priority,
        status,
        sortBy,
        sortOrder,
        page,
        pageSize,
        limit,
      } = req.query;

      // 1. Pagination parameters
      const parsedPage = parseInt(page as string, 10);
      const pageNum = !isNaN(parsedPage) && parsedPage > 0 ? parsedPage : 1;

      const requestedLimit = parseInt((pageSize as string) || (limit as string), 10);
      const limitNum = !isNaN(requestedLimit) && requestedLimit > 0 ? requestedLimit : 10;

      const skip = (pageNum - 1) * limitNum;
      const take = limitNum;

      // 2. Filter conditions (Strictly scoped to requesterId)
      const where: Prisma.TicketWhereInput = {
        requesterId,
      };

      if (typeof search === "string" && search.trim().length > 0) {
        const term = search.trim();
        where.OR = [
          { ticketNo: { contains: term, mode: "insensitive" } },
          { summary: { contains: term, mode: "insensitive" } },
        ];
      }

      if (categoryId !== undefined && categoryId !== "") {
        const catId = parseInt(categoryId as string, 10);
        if (!isNaN(catId)) {
          where.categoryId = catId;
        }
      }

      const validPriorities = ["P0_URGENT", "P1_HIGH", "P2_MEDIUM", "P3_LOW"];
      if (typeof priority === "string" && validPriorities.includes(priority.toUpperCase())) {
        where.priority = priority.toUpperCase() as Priority;
      }

      const validStatuses = ["NEW", "IN_PROGRESS", "RESOLVED", "CLOSED", "REJECTED"];
      if (typeof status === "string" && validStatuses.includes(status.toUpperCase())) {
        where.status = status.toUpperCase() as TicketStatus;
      }

      // 3. Sorting
      const validSortFields: Record<string, string> = {
        createdat: "createdAt",
        updatedat: "updatedAt",
        ticketno: "ticketNo",
        priority: "priority",
        status: "status",
        summary: "summary",
      };

      const sortFieldKey = typeof sortBy === "string" ? sortBy.toLowerCase() : "createdat";
      const sortFieldName = validSortFields[sortFieldKey] || "createdAt";
      const sortDirection: "asc" | "desc" =
        typeof sortOrder === "string" && sortOrder.toLowerCase() === "asc" ? "asc" : "desc";

      const orderBy: Prisma.TicketOrderByWithRelationInput = {
        [sortFieldName]: sortDirection,
      };

      // 4. Query DB in parallel (count & findMany)
      const prisma = getPrisma();
      const [totalCount, tickets] = await Promise.all([
        prisma.ticket.count({ where }),
        prisma.ticket.findMany({
          where,
          skip,
          take,
          orderBy,
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
            category: {
              select: {
                id: true,
                name: true,
              },
            },
            relatedSystem: {
              select: {
                id: true,
                name: true,
              },
            },
            requester: {
              select: {
                id: true,
                fullName: true,
                email: true,
                department: true,
              },
            },
            attachments: {
              where: { isSoftDeleted: false },
              select: {
                id: true,
                originalName: true,
                mimeType: true,
                sizeBytes: true,
                createdAt: true,
              },
            },
          },
        }),
      ]);

      const totalPages = Math.ceil(totalCount / limitNum);

      const formattedTickets = tickets.map((t) => ({
        ...t,
        attachmentCount: t.attachments.length,
      }));

      res.status(200).json({
        data: formattedTickets,
        pagination: {
          page: pageNum,
          pageSize: limitNum,
          limit: limitNum,
          totalItems: totalCount,
          totalCount,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1,
        },
      });
    } catch (error) {
      res
        .status(500)
        .json(createErrorEnvelope("INTERNAL_SERVER_ERROR", "Failed to fetch tickets."));
    }
  }
);

// ---------------------------------------------------------------------------
// Issue 7 — Pre-upload Attachments
// POST /api/attachments/pre-upload
// ---------------------------------------------------------------------------
app.post(
  "/api/attachments/pre-upload",
  requireRequesterAuth,
  handlePreUploadMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const requesterId = req.requesterId!;
      const files = req.files as Express.Multer.File[];

      const createdAttachments = [];

      for (const file of files) {
        const sanitizedFilename = path
          .basename(file.originalname)
          .replace(/[^a-zA-Z0-9._-]/g, "_");
        const storageKey = `att_${Date.now()}_${randomUUID().replace(/-/g, "")}_${sanitizedFilename}`;
        const filePath = path.join(UPLOAD_DIR, storageKey);

        await fs.promises.writeFile(filePath, file.buffer);

        const mimeType = file.mimetype === "image/jpg" ? "image/jpeg" : file.mimetype;

        const attachment = await getPrisma().attachment.create({
          data: {
            originalName: file.originalname,
            storageKey,
            mimeType,
            sizeBytes: file.size,
            uploadedById: requesterId,
            ticketId: null,
            isSoftDeleted: false,
          },
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            sizeBytes: true,
            createdAt: true,
          },
        });

        createdAttachments.push(attachment);
      }

      res.status(201).json({ data: createdAttachments });
    } catch (error) {
      res
        .status(500)
        .json(createErrorEnvelope("INTERNAL_SERVER_ERROR", "Failed to stage attachment."));
    }
  }
);

// ---------------------------------------------------------------------------
// Issue 7 — Ticket Creation
// POST /api/tickets
// ---------------------------------------------------------------------------
app.post(
  "/api/tickets",
  requireRequesterAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const requesterId = req.requesterId!;
      const {
        categoryId,
        relatedSystemId,
        priority,
        summary,
        description,
        attachmentIds,
      } = req.body || {};

      const fieldErrors: FieldError[] = [];

      // Validate summary
      if (
        typeof summary !== "string" ||
        summary.trim().length < 5 ||
        summary.trim().length > 100
      ) {
        fieldErrors.push({
          field: "summary",
          message: "Summary must be between 5 and 100 characters.",
        });
      }

      // Validate description
      if (
        typeof description !== "string" ||
        description.trim().length < 10 ||
        description.trim().length > 2000
      ) {
        fieldErrors.push({
          field: "description",
          message: "Description must be between 10 and 2000 characters.",
        });
      }

      // Validate categoryId
      let validCategory = false;
      if (
        typeof categoryId !== "number" ||
        isNaN(categoryId) ||
        !Number.isInteger(categoryId)
      ) {
        fieldErrors.push({
          field: "categoryId",
          message: "Valid category is required.",
        });
      } else {
        const category = await getPrisma().category.findUnique({
          where: { id: categoryId },
        });
        if (!category) {
          fieldErrors.push({
            field: "categoryId",
            message: "Valid category is required.",
          });
        } else {
          validCategory = true;
        }
      }

      // Validate relatedSystemId
      if (relatedSystemId !== undefined && relatedSystemId !== null) {
        if (
          typeof relatedSystemId !== "number" ||
          isNaN(relatedSystemId) ||
          !Number.isInteger(relatedSystemId)
        ) {
          fieldErrors.push({
            field: "relatedSystemId",
            message: "Selected system does not belong to the chosen category.",
          });
        } else {
          const system = await getPrisma().relatedSystem.findUnique({
            where: { id: relatedSystemId },
          });
          if (
            !system ||
            !validCategory ||
            system.categoryId !== categoryId
          ) {
            fieldErrors.push({
              field: "relatedSystemId",
              message: "Selected system does not belong to the chosen category.",
            });
          }
        }
      }

      // Validate priority
      const validPriorities = ["P0_URGENT", "P1_HIGH", "P2_MEDIUM", "P3_LOW"];
      if (!priority || !validPriorities.includes(priority)) {
        fieldErrors.push({
          field: "priority",
          message: "Priority must be one of P0_URGENT, P1_HIGH, P2_MEDIUM, P3_LOW.",
        });
      }

      // Validate attachmentIds
      if (attachmentIds !== undefined && attachmentIds !== null) {
        if (
          !Array.isArray(attachmentIds) ||
          attachmentIds.length > 5 ||
          attachmentIds.some(
            (id: unknown) => typeof id !== "number" || !Number.isInteger(id)
          )
        ) {
          fieldErrors.push({
            field: "attachmentIds",
            message: "Invalid or already linked attachment ID.",
          });
        } else if (attachmentIds.length > 0) {
          const attachments = await getPrisma().attachment.findMany({
            where: { id: { in: attachmentIds } },
          });

          if (attachments.length !== attachmentIds.length) {
            fieldErrors.push({
              field: "attachmentIds",
              message: "Invalid or already linked attachment ID.",
            });
          } else {
            const hasInvalid = attachments.some(
              (att) =>
                att.uploadedById !== requesterId ||
                att.ticketId !== null ||
                att.isSoftDeleted
            );
            if (hasInvalid) {
              fieldErrors.push({
                field: "attachmentIds",
                message: "Invalid or already linked attachment ID.",
              });
            }
          }
        }
      }

      if (fieldErrors.length > 0) {
        res
          .status(422)
          .json(
            createErrorEnvelope(
              "VALIDATION_FAILED",
              "Validation failed on ticket creation payload.",
              fieldErrors
            )
          );
        return;
      }

      // Atomic Execution & Ticket Numbering
      const createdTicket = await getPrisma().$transaction(async (tx) => {
        const year = new Date().getFullYear();
        const latestTicket = await tx.ticket.findFirst({
          where: {
            ticketNo: {
              startsWith: `TKT-${year}-`,
            },
          },
          orderBy: {
            id: "desc",
          },
        });

        let nextSeq = 1;
        if (latestTicket) {
          const parts = latestTicket.ticketNo.split("-");
          const num = parseInt(parts[2], 10);
          if (!isNaN(num)) {
            nextSeq = num + 1;
          }
        }

        const ticketNo = `TKT-${year}-${String(nextSeq).padStart(5, "0")}`;

        const newTicket = await tx.ticket.create({
          data: {
            ticketNo,
            summary: summary.trim(),
            description: description.trim(),
            priority,
            status: "NEW",
            requesterId,
            categoryId,
            relatedSystemId: relatedSystemId || null,
          },
        });

        if (Array.isArray(attachmentIds) && attachmentIds.length > 0) {
          await tx.attachment.updateMany({
            where: { id: { in: attachmentIds } },
            data: { ticketId: newTicket.id },
          });
        }

        return tx.ticket.findUnique({
          where: { id: newTicket.id },
          include: {
            category: { select: { id: true, name: true } },
            relatedSystem: { select: { id: true, name: true } },
            requester: {
              select: {
                id: true,
                fullName: true,
                email: true,
                department: true,
              },
            },
            attachments: {
              select: {
                id: true,
                originalName: true,
                mimeType: true,
                sizeBytes: true,
                isSoftDeleted: true,
                createdAt: true,
              },
              orderBy: { id: "asc" },
            },
          },
        });
      });

      res.status(201).json({ data: createdTicket });
    } catch (error) {
      res
        .status(500)
        .json(createErrorEnvelope("INTERNAL_SERVER_ERROR", "Failed to create ticket."));
    }
  }
);

export default app;
