import express, { Request, Response } from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { getPrisma } from "./prisma.js";
import { Prisma, Priority, TicketStatus } from "@prisma/client";
import { requireRequesterAuth, AuthenticatedRequest } from "./middleware/auth.js";
import {
  handlePreUploadMiddleware,
  handleTicketAttachmentUpload,
  UPLOAD_DIR,
} from "./middleware/upload.js";
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

        // Record initial ticket creation in TicketActivity table
        if ((tx as any).ticketActivity) {
          await (tx as any).ticketActivity.create({
            data: {
              ticketId: newTicket.id,
              type: "TICKET_CREATED",
              action: "Ticket created",
              message: `Ticket ${ticketNo} created with status NEW.`,
              actorId: requesterId,
              actorName: req.requester?.fullName || "Requester",
              createdAt: newTicket.createdAt,
            },
          });
        }

        if (Array.isArray(attachmentIds) && attachmentIds.length > 0) {
          await tx.attachment.updateMany({
            where: { id: { in: attachmentIds } },
            data: { ticketId: newTicket.id },
          });

          // Record ATTACHMENT_ADDED activities for linked attachments
          const linkedAtts = await tx.attachment.findMany({
            where: { id: { in: attachmentIds } },
          });
          for (const att of linkedAtts) {
            if ((tx as any).ticketActivity) {
              await (tx as any).ticketActivity.create({
                data: {
                  ticketId: newTicket.id,
                  type: "ATTACHMENT_ADDED",
                  action: "Attachment uploaded",
                  message: `Attachment ${att.originalName} attached to ticket.`,
                  actorId: requesterId,
                  actorName: req.requester?.fullName || "Requester",
                  metadata: {
                    attachmentId: att.id,
                    originalName: att.originalName,
                  },
                  createdAt: att.createdAt,
                },
              });
            }
          }
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

// ---------------------------------------------------------------------------
// Issue 9 — Ticket Details, Attachments Lifecycle & Audit Timeline
// ---------------------------------------------------------------------------

export interface TicketAuditEntry {
  id: string;
  ticketId: number;
  type: string;
  action: string;
  message: string;
  timestamp: Date;
  actorId?: number;
  actorName?: string;
  metadata?: Record<string, unknown>;
}

export const ticketAuditLogs = new Map<number, TicketAuditEntry[]>();

export async function appendTicketAuditLog(
  ticketId: number,
  entry: Omit<TicketAuditEntry, "id" | "ticketId" | "timestamp"> & {
    timestamp?: Date;
  },
  prismaClient?: any
): Promise<TicketAuditEntry> {
  const client = prismaClient || getPrisma();
  const timestamp = entry.timestamp || new Date();
  const dbClient = client as any;

  // Persist directly to PostgreSQL as the single source of truth (propagate on failure)
  const createdRecord = await dbClient.ticketActivity.create({
    data: {
      ticketId,
      type: entry.type,
      action: entry.action,
      message: entry.message,
      actorId: entry.actorId ?? null,
      actorName: entry.actorName || "Requester",
      metadata: entry.metadata ? (entry.metadata as any) : undefined,
      createdAt: timestamp,
    },
  });

  const newEntry: TicketAuditEntry = {
    id: `activity_${createdRecord.id}`,
    ticketId,
    type: entry.type,
    action: entry.action,
    message: entry.message,
    timestamp: createdRecord.createdAt || timestamp,
    actorId: entry.actorId,
    actorName: entry.actorName,
    metadata: entry.metadata,
  };

  // Keep in-memory cache synchronized with DB
  const logs = ticketAuditLogs.get(ticketId) || [];
  logs.push(newEntry);
  ticketAuditLogs.set(ticketId, logs);
  return newEntry;
}

export async function getTicketAuditLogs(
  ticketId: number
): Promise<TicketAuditEntry[]> {
  const prisma = getPrisma() as any;
  const records = await prisma.ticketActivity.findMany({
    where: { ticketId },
    orderBy: { createdAt: "asc" },
  });
  if (records && records.length > 0) {
    return records.map((r: any) => ({
      id: `activity_${r.id}`,
      ticketId: r.ticketId,
      type: r.type,
      action: r.action,
      message: r.message,
      timestamp: r.createdAt,
      actorId: r.actorId ?? undefined,
      actorName: r.actorName,
      metadata: (r.metadata as Record<string, unknown>) ?? undefined,
    }));
  }
  return ticketAuditLogs.get(ticketId) || [];
}

export const auditService = {
  appendTicketAuditLog,
  getTicketAuditLogs,
};

// ---------------------------------------------------------------------------
// Issue 9 — Read-only Ticket Details with Timeline & Attachments (AC 1)
// GET /api/tickets/:id
// ---------------------------------------------------------------------------
app.get(
  "/api/tickets/:id",
  requireRequesterAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const requesterId = req.requesterId!;
      const ticketId = parseInt(req.params.id, 10);

      if (isNaN(ticketId) || ticketId <= 0) {
        res
          .status(404)
          .json(
            createErrorEnvelope(
              "TICKET_NOT_FOUND",
              "Ticket with the specified ID does not exist."
            )
          );
        return;
      }

      const ticket = await getPrisma().ticket.findUnique({
        where: { id: ticketId },
        include: {
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
            orderBy: { id: "asc" },
            select: {
              id: true,
              originalName: true,
              storageKey: true,
              mimeType: true,
              sizeBytes: true,
              isSoftDeleted: true,
              deletedAt: true,
              deletedBy: true,
              deletionReason: true,
              createdAt: true,
            },
          },
          activities: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!ticket) {
        res
          .status(404)
          .json(
            createErrorEnvelope(
              "TICKET_NOT_FOUND",
              "Ticket with the specified ID does not exist."
            )
          );
        return;
      }

      // Requester Isolation: Never leak tickets across requesters
      if (ticket.requesterId !== requesterId) {
        res
          .status(403)
          .json(
            createErrorEnvelope(
              "FORBIDDEN_RESOURCE",
              "You are not authorized to view or access this ticket."
            )
          );
        return;
      }

      // Construct activity history timeline from DB activities
      const timeline: Array<{
        id: string;
        type: string;
        action: string;
        message: string;
        timestamp: Date;
        actor: string;
        reason?: string | null;
        metadata?: Record<string, unknown>;
      }> = [];

      const dbActivities = ticket.activities || [];
      if (dbActivities.length > 0) {
        for (const act of dbActivities) {
          timeline.push({
            id: `activity_${act.id}`,
            type: act.type,
            action: act.action,
            message: act.message,
            timestamp: act.createdAt,
            actor: act.actorName,
            reason: ((act.metadata as any)?.reason as string) || null,
            metadata: (act.metadata as Record<string, unknown>) || undefined,
          });
        }
      } else {
        timeline.push({
          id: `timeline_create_${ticket.id}`,
          type: "TICKET_CREATED",
          action: "Ticket created",
          message: `Ticket ${ticket.ticketNo} created with status ${ticket.status}.`,
          timestamp: ticket.createdAt,
          actor: ticket.requester.fullName,
        });
      }

      for (const att of ticket.attachments) {
        const hasAdd = timeline.some(
          (t) =>
            t.type === "ATTACHMENT_ADDED" &&
            (t.metadata?.attachmentId === att.id ||
              t.message.includes(att.originalName))
        );
        if (!hasAdd) {
          timeline.push({
            id: `timeline_att_add_${att.id}`,
            type: "ATTACHMENT_ADDED",
            action: "Attachment uploaded",
            message: `Attachment ${att.originalName} attached to ticket.`,
            timestamp: att.createdAt,
            actor: ticket.requester.fullName,
            metadata: {
              attachmentId: att.id,
              originalName: att.originalName,
            },
          });
        }

        if (att.isSoftDeleted && att.deletedAt) {
          const hasRem = timeline.some(
            (t) =>
              t.type === "ATTACHMENT_REMOVED" &&
              (t.metadata?.attachmentId === att.id ||
                t.message.includes(att.originalName))
          );
          if (!hasRem) {
            timeline.push({
              id: `timeline_att_rem_${att.id}`,
              type: "ATTACHMENT_REMOVED",
              action: "Attachment removed",
              message: `Attachment ${att.originalName} removed by requester. Reason: ${att.deletionReason || "Removed"}`,
              timestamp: att.deletedAt,
              reason: att.deletionReason,
              actor: ticket.requester.fullName,
              metadata: {
                attachmentId: att.id,
                originalName: att.originalName,
                reason: att.deletionReason,
              },
            });
          }
        }
      }

      // Merge additional recorded in-memory logs
      const extraLogs = await getTicketAuditLogs(ticket.id);
      for (const log of extraLogs) {
        const alreadyInTimeline = timeline.some(
          (t) => t.message === log.message || t.id === log.id
        );
        if (!alreadyInTimeline) {
          timeline.push({
            id: log.id,
            type: log.type,
            action: log.action,
            message: log.message,
            timestamp: log.timestamp,
            reason: (log.metadata?.reason as string) || undefined,
            actor: log.actorName || ticket.requester.fullName,
            metadata: log.metadata,
          });
        }
      }

      timeline.sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      const formattedAttachments = ticket.attachments.map((att) => ({
        id: att.id,
        originalName: att.originalName,
        mimeType: att.mimeType,
        sizeBytes: att.sizeBytes,
        status: att.isSoftDeleted ? "REMOVED" : "ACTIVE",
        isSoftDeleted: att.isSoftDeleted,
        deletedAt: att.deletedAt,
        deletedBy: att.deletedBy,
        deletionReason: att.deletionReason,
        createdAt: att.createdAt,
      }));

      res.status(200).json({
        data: {
          id: ticket.id,
          ticketNo: ticket.ticketNo,
          summary: ticket.summary,
          description: ticket.description,
          priority: ticket.priority,
          status: ticket.status,
          requesterId: ticket.requesterId,
          requester: {
            id: ticket.requester.id,
            fullName: ticket.requester.fullName,
            displayName: ticket.requester.fullName,
            email: ticket.requester.email,
            department: ticket.requester.department,
          },
          category: {
            id: ticket.category.id,
            name: ticket.category.name,
          },
          relatedSystem: ticket.relatedSystem
            ? {
                id: ticket.relatedSystem.id,
                name: ticket.relatedSystem.name,
              }
            : null,
          attachments: formattedAttachments,
          activityTimeline: timeline,
          timeline,
          activityHistory: timeline,
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt,
        },
      });
    } catch (error) {
      res
        .status(500)
        .json(
          createErrorEnvelope(
            "INTERNAL_SERVER_ERROR",
            "Failed to fetch ticket details."
          )
        );
    }
  }
);

// ---------------------------------------------------------------------------
// Section 14 Part 8 — Add Attachment to Existing Ticket
// POST /api/tickets/:id/attachments
// ---------------------------------------------------------------------------
app.post(
  "/api/tickets/:id/attachments",
  requireRequesterAuth,
  handleTicketAttachmentUpload,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const requesterId = req.requesterId!;
      const ticketId = parseInt(req.params.id, 10);

      if (isNaN(ticketId) || ticketId <= 0) {
        res
          .status(404)
          .json(
            createErrorEnvelope(
              "TICKET_NOT_FOUND",
              "Ticket with the specified ID does not exist."
            )
          );
        return;
      }

      const ticket = await getPrisma().ticket.findUnique({
        where: { id: ticketId },
        include: {
          requester: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      });

      if (!ticket) {
        res
          .status(404)
          .json(
            createErrorEnvelope(
              "TICKET_NOT_FOUND",
              "Ticket with the specified ID does not exist."
            )
          );
        return;
      }

      // Check ownership
      if (ticket.requesterId !== requesterId) {
        res
          .status(403)
          .json(
            createErrorEnvelope(
              "FORBIDDEN_RESOURCE",
              "You are not authorized to modify attachments for this ticket."
            )
          );
        return;
      }

      // Check active attachments limit (Max 5 per ticket)
      const activeCount = await getPrisma().attachment.count({
        where: {
          ticketId,
          isSoftDeleted: false,
        },
      });

      const files = req.files as Express.Multer.File[];
      if (activeCount + files.length > 5) {
        res
          .status(400)
          .json(
            createErrorEnvelope(
              "MAX_ATTACHMENTS_EXCEEDED",
              `Cannot add attachment. Ticket already has ${activeCount} active attachments (maximum is 5).`
            )
          );
        return;
      }

      const file = files[0];
      const sanitizedFilename = path
        .basename(file.originalname)
        .replace(/[^a-zA-Z0-9._-]/g, "_");
      const storageKey = `att_${Date.now()}_${randomUUID().replace(/-/g, "")}_${sanitizedFilename}`;
      const filePath = path.join(UPLOAD_DIR, storageKey);

      await fs.promises.writeFile(filePath, file.buffer);

      const mimeType =
        file.mimetype === "image/jpg" ? "image/jpeg" : file.mimetype;

      const attachment = await getPrisma().$transaction(async (tx) => {
        const createdAtt = await tx.attachment.create({
          data: {
            originalName: file.originalname,
            storageKey,
            mimeType,
            sizeBytes: file.size,
            uploadedById: requesterId,
            ticketId: ticket.id,
            isSoftDeleted: false,
          },
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            sizeBytes: true,
            ticketId: true,
            isSoftDeleted: true,
            createdAt: true,
          },
        });

        // Append audit timeline entry inside the same transaction
        await auditService.appendTicketAuditLog(
          ticket.id,
          {
            type: "ATTACHMENT_ADDED",
            action: "Attachment uploaded",
            message: `Attachment ${file.originalname} added by requester.`,
            timestamp: new Date(),
            actorId: requesterId,
            actorName: ticket.requester.fullName,
            metadata: {
              attachmentId: createdAtt.id,
              originalName: file.originalname,
            },
          },
          tx
        );

        return createdAtt;
      });

      res.status(201).json({
        data: {
          id: attachment.id,
          originalName: attachment.originalName,
          mimeType: attachment.mimeType,
          sizeBytes: attachment.sizeBytes,
          status: "ACTIVE",
          isSoftDeleted: false,
          createdAt: attachment.createdAt,
        },
      });
    } catch (error) {
      res
        .status(500)
        .json(
          createErrorEnvelope(
            "INTERNAL_SERVER_ERROR",
            "Failed to add attachment to ticket."
          )
        );
    }
  }
);

// ---------------------------------------------------------------------------
// Issue 9 — Active Attachment Streaming Download & 410 Gone Guard (AC 2 & 4)
// GET /api/attachments/:id/download
// ---------------------------------------------------------------------------
app.get(
  "/api/attachments/:id/download",
  requireRequesterAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const requesterId = req.requesterId!;
      const attachmentId = parseInt(req.params.id, 10);

      if (isNaN(attachmentId) || attachmentId <= 0) {
        res
          .status(404)
          .json(
            createErrorEnvelope(
              "ATTACHMENT_NOT_FOUND",
              "The requested attachment does not exist."
            )
          );
        return;
      }

      const attachment = await getPrisma().attachment.findUnique({
        where: { id: attachmentId },
        include: {
          ticket: {
            select: {
              id: true,
              requesterId: true,
            },
          },
        },
      });

      if (!attachment) {
        res
          .status(404)
          .json(
            createErrorEnvelope(
              "ATTACHMENT_NOT_FOUND",
              "The requested attachment does not exist."
            )
          );
        return;
      }

      // Check Ownership: ticket requesterId if linked, or uploadedById if staged
      const ownerId = attachment.ticket
        ? attachment.ticket.requesterId
        : attachment.uploadedById;

      if (ownerId !== requesterId) {
        res
          .status(403)
          .json(
            createErrorEnvelope(
              "FORBIDDEN_RESOURCE",
              "You do not have permission to download this attachment."
            )
          );
        return;
      }

      // Soft-removal guard: Return 410 Gone immediately
      if (attachment.isSoftDeleted) {
        res.status(410).json({
          error: "Attachment has been removed",
          message: "Attachment has been removed by requester.",
          code: "ATTACHMENT_SOFT_DELETED",
          removedAt: attachment.deletedAt
            ? attachment.deletedAt.toISOString()
            : new Date().toISOString(),
          deletedAt: attachment.deletedAt
            ? attachment.deletedAt.toISOString()
            : new Date().toISOString(),
          reason: attachment.deletionReason || "Removed",
          deletionReason: attachment.deletionReason || "Removed",
        });
        return;
      }

      const filePath = path.join(UPLOAD_DIR, attachment.storageKey);
      if (!fs.existsSync(filePath)) {
        res
          .status(404)
          .json(
            createErrorEnvelope(
              "ATTACHMENT_FILE_NOT_FOUND",
              "The requested attachment file is missing on storage."
            )
          );
        return;
      }

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${attachment.originalName}"`
      );
      res.setHeader("Content-Type", attachment.mimeType);

      const fileStream = fs.createReadStream(filePath);
      fileStream.on("error", () => {
        if (!res.headersSent) {
          res
            .status(500)
            .json(
              createErrorEnvelope(
                "INTERNAL_SERVER_ERROR",
                "Error streaming attachment file."
              )
            );
        }
      });

      fileStream.pipe(res);
    } catch (error) {
      if (!res.headersSent) {
        res
          .status(500)
          .json(
            createErrorEnvelope(
              "INTERNAL_SERVER_ERROR",
              "Failed to process attachment download."
            )
          );
      }
    }
  }
);

// ---------------------------------------------------------------------------
// Issue 9 — Attachment Soft-Removal with Reason & Audit Logging (AC 3)
// POST /api/attachments/:id/remove
// PATCH /api/attachments/:id/remove
// DELETE /api/attachments/:id
// ---------------------------------------------------------------------------
export const PRESET_REMOVAL_REASONS = [
  "Uploaded incorrect document / file",
  "Contains sensitive or confidential data",
  "Duplicate file",
];

async function handleAttachmentRemoval(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const requesterId = req.requesterId!;
    const attachmentId = parseInt(req.params.id, 10);

    if (isNaN(attachmentId) || attachmentId <= 0) {
      res
        .status(404)
        .json(
          createErrorEnvelope(
            "ATTACHMENT_NOT_FOUND",
            "The requested attachment does not exist."
          )
        );
      return;
    }

    const attachment = await getPrisma().attachment.findUnique({
      where: { id: attachmentId },
      include: {
        ticket: {
          select: {
            id: true,
            ticketNo: true,
            requesterId: true,
          },
        },
      },
    });

    if (!attachment) {
      res
        .status(404)
        .json(
          createErrorEnvelope(
            "ATTACHMENT_NOT_FOUND",
            "The requested attachment does not exist."
          )
        );
      return;
    }

    // Ownership check
    const ownerId = attachment.ticket
      ? attachment.ticket.requesterId
      : attachment.uploadedById;

    if (ownerId !== requesterId) {
      res
        .status(403)
        .json(
          createErrorEnvelope(
            "FORBIDDEN_RESOURCE",
            "You do not have permission to remove this attachment."
          )
        );
      return;
    }

    if (attachment.isSoftDeleted) {
      res
        .status(400)
        .json(
          createErrorEnvelope(
            "ALREADY_REMOVED",
            "Attachment has already been removed."
          )
        );
      return;
    }

    const { reason, customReason } = req.body || {};
    let resolvedReason = "";

    if (reason === "Other") {
      if (
        typeof customReason !== "string" ||
        customReason.trim().length < 5 ||
        customReason.trim().length > 255
      ) {
        res.status(400).json(
          createErrorEnvelope(
            "VALIDATION_FAILED",
            "When selecting 'Other', a customReason between 5 and 255 characters is required.",
            [
              {
                field: "customReason",
                message: "Custom reason must be at least 5 characters long.",
              },
            ]
          )
        );
        return;
      }
      resolvedReason = customReason.trim();
    } else if (
      typeof reason === "string" &&
      PRESET_REMOVAL_REASONS.includes(reason.trim())
    ) {
      resolvedReason = reason.trim();
    } else if (
      req.method === "DELETE" &&
      typeof reason === "string" &&
      reason.trim().length >= 5 &&
      reason.trim().length <= 255
    ) {
      resolvedReason = reason.trim();
    } else {
      res.status(400).json(
        createErrorEnvelope(
          "VALIDATION_FAILED",
          "A valid preset reason or 'Other' with a custom reason (min 5 chars) is required.",
          [
            {
              field: "reason",
              message:
                "Reason must be one of the preset reasons or 'Other' with customReason.",
            },
          ]
        )
      );
      return;
    }

    const now = new Date();
    const updated = await getPrisma().$transaction(async (tx) => {
      const updatedAtt = await tx.attachment.update({
        where: { id: attachment.id },
        data: {
          isSoftDeleted: true,
          deletedAt: now,
          deletedBy: requesterId,
          deletionReason: resolvedReason,
        },
      });

      // Record audit entry in ticket activity timeline inside the same atomic transaction
      if (attachment.ticketId) {
        await auditService.appendTicketAuditLog(
          attachment.ticketId,
          {
            type: "ATTACHMENT_REMOVED",
            action: "Attachment removed",
            message: `Attachment ${attachment.originalName} removed by requester. Reason: ${resolvedReason}`,
            timestamp: now,
            actorId: requesterId,
            actorName: req.requester?.fullName || "Requester",
            metadata: {
              attachmentId: attachment.id,
              originalName: attachment.originalName,
              reason: resolvedReason,
            },
          },
          tx
        );
      }

      return updatedAtt;
    });

    res.status(200).json({
      data: {
        id: updated.id,
        ticketId: updated.ticketId,
        originalName: updated.originalName,
        mimeType: updated.mimeType,
        sizeBytes: updated.sizeBytes,
        status: "REMOVED",
        isSoftDeleted: true,
        removedAt: updated.deletedAt,
        deletedAt: updated.deletedAt,
        deletedBy: updated.deletedBy,
        reason: updated.deletionReason,
        deletionReason: updated.deletionReason,
      },
      message: "Attachment removed successfully",
    });
  } catch (error) {
    res
      .status(500)
      .json(
        createErrorEnvelope(
          "INTERNAL_SERVER_ERROR",
          "Failed to remove attachment."
        )
      );
  }
}

app.post(
  "/api/attachments/:id/remove",
  requireRequesterAuth,
  handleAttachmentRemoval
);
app.patch(
  "/api/attachments/:id/remove",
  requireRequesterAuth,
  handleAttachmentRemoval
);
app.delete(
  "/api/attachments/:id",
  requireRequesterAuth,
  handleAttachmentRemoval
);

export default app;

