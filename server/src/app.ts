import express, { Request, Response } from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { getPrisma } from "./prisma.js";
import { Prisma, Priority, TicketStatus } from "@prisma/client";
import {
  requireAuth,
  requirePasswordChanged,
  requireRole,
  AuthenticatedRequest,
} from "./middleware/auth.js";
import {
  signSessionToken,
  COOKIE_NAME,
  getSessionCookieOptions,
  getClearCookieOptions,
} from "./utils/jwt.js";
import {
  verifyPassword,
  hashPassword,
  validatePasswordPolicy,
} from "./utils/password.js";
import {
  handlePreUploadMiddleware,
  handleTicketAttachmentUpload,
  UPLOAD_DIR,
} from "./middleware/upload.js";
import { createErrorEnvelope, FieldError } from "./utils/errors.js";

export const app = express();

const rawClientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
if (rawClientOrigin === "*") {
  throw new Error(
    "CORS configuration error: Wildcard origin '*' is strictly prohibited when credentials are true."
  );
}
const CLIENT_ORIGIN = rawClientOrigin;
app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  })
);
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

// ===========================================================================
// Issue 12 — Authentication Endpoints
// ===========================================================================

// POST /api/auth/login
app.post("/api/auth/login", async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body || {};

  if (!email || typeof email !== "string" || !password || typeof password !== "string") {
    res
      .status(400)
      .json(createErrorEnvelope("VALIDATION_ERROR", "Email and password are required."));
    return;
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    const user = await getPrisma().user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user || !user.isActive) {
      res
        .status(401)
        .json(createErrorEnvelope("INVALID_CREDENTIALS", "Invalid email or password."));
      return;
    }

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      res
        .status(401)
        .json(createErrorEnvelope("INVALID_CREDENTIALS", "Invalid email or password."));
      return;
    }

    const token = signSessionToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    res.cookie(COOKIE_NAME, token, getSessionCookieOptions());

    res.status(200).json({
      data: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json(createErrorEnvelope("INTERNAL_SERVER_ERROR", "Login failed."));
  }
});

// POST /api/auth/logout (Idempotent & Permissive)
app.post("/api/auth/logout", (_req: Request, res: Response): void => {
  res.cookie(COOKIE_NAME, "", getClearCookieOptions());
  res.status(200).json({
    data: {
      message: "Successfully logged out",
    },
  });
});

// GET /api/auth/me (Exempt from password-change gate)
app.get("/api/auth/me", requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user!;
  res.status(200).json({
    data: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    },
  });
});

// POST /api/auth/change-password (Exempt from password-change gate)
app.post(
  "/api/auth/change-password",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { currentPassword, newPassword, confirmPassword } = req.body || {};
    const user = req.user!;

    if (!currentPassword || !newPassword || !confirmPassword) {
      res
        .status(400)
        .json(
          createErrorEnvelope(
            "VALIDATION_ERROR",
            "Current password, new password, and confirmation are required."
          )
        );
      return;
    }

    if (newPassword !== confirmPassword) {
      res
        .status(422)
        .json(createErrorEnvelope("VALIDATION_ERROR", "New password and confirmation do not match."));
      return;
    }

    if (newPassword === currentPassword) {
      res
        .status(422)
        .json(
          createErrorEnvelope(
            "VALIDATION_ERROR",
            "New password must be different from current password."
          )
        );
      return;
    }

    const policyResult = validatePasswordPolicy(newPassword);
    if (!policyResult.isValid) {
      res
        .status(422)
        .json(
          createErrorEnvelope(
            "VALIDATION_ERROR",
            policyResult.reason || "Password does not meet complexity requirements."
          )
        );
      return;
    }

    const isCurrentValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      res
        .status(400)
        .json(createErrorEnvelope("INVALID_CURRENT_PASSWORD", "Incorrect current password."));
      return;
    }

    try {
      const newHash = await hashPassword(newPassword);
      await getPrisma().user.update({
        where: { id: user.id },
        data: {
          passwordHash: newHash,
          mustChangePassword: false,
        },
      });

      res.status(200).json({
        data: {
          message: "Password changed successfully",
          mustChangePassword: false,
        },
      });
    } catch (error) {
      res
        .status(500)
        .json(createErrorEnvelope("INTERNAL_SERVER_ERROR", "Failed to update password."));
    }
  }
);

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
    res.status(500).json(createErrorEnvelope("INTERNAL_SERVER_ERROR", "Failed to fetch categories"));
  }
});

// ---------------------------------------------------------------------------
// Issue 6 — Active Requester Users
// GET /api/requesters
// ---------------------------------------------------------------------------
app.get("/api/requesters", async (_req: Request, res: Response) => {
  try {
    const requesters = await getPrisma().user.findMany({
      where: { isActive: true, role: "REQUESTER" },
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
    res.status(500).json(createErrorEnvelope("INTERNAL_SERVER_ERROR", "Failed to fetch requesters"));
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
    res.status(500).json(createErrorEnvelope("INTERNAL_SERVER_ERROR", "Failed to fetch related systems"));
  }
});

// ---------------------------------------------------------------------------
// Issue 8 — My Tickets Query API with Filtering & Pagination
// GET /api/tickets
// ---------------------------------------------------------------------------
app.get(
  "/api/tickets",
  requireAuth,
  requirePasswordChanged,
  requireRole("REQUESTER"),
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
        where.requestedPriority = priority.toUpperCase() as Priority;
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
        priority: "requestedPriority",
        requestedpriority: "requestedPriority",
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
            requestedPriority: true,
            itPriority: true,
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
        priority: t.requestedPriority,
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
// Issue 14 — Staff Ticket Queue Query API with Filtering, Search & Pagination
// GET /api/staff/tickets
// ---------------------------------------------------------------------------
app.get(
  "/api/staff/tickets",
  requireAuth,
  requirePasswordChanged,
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        search,
        categoryId,
        requestedPriority,
        itPriority,
        status,
        owner,
        sortBy,
        sortOrder,
        page,
        pageSize,
      } = req.query;

      // 1. Pagination parameters
      const parsedPage = parseInt(page as string, 10);
      const pageNum = !isNaN(parsedPage) && parsedPage > 0 ? parsedPage : 1;

      const parsedPageSize = parseInt(pageSize as string, 10);
      const limitNum = !isNaN(parsedPageSize) && parsedPageSize > 0
        ? Math.min(parsedPageSize, 50)
        : 10;

      const skip = (pageNum - 1) * limitNum;
      const take = limitNum;

      // 2. Filter conditions
      const where: Prisma.TicketWhereInput = {};

      // Search: ticketNo or summary (case-insensitive)
      if (typeof search === "string" && search.trim().length > 0) {
        const term = search.trim();
        where.OR = [
          { ticketNo: { contains: term, mode: "insensitive" } },
          { summary: { contains: term, mode: "insensitive" } },
        ];
      }

      // Category filter
      if (categoryId !== undefined && categoryId !== "") {
        const catId = parseInt(categoryId as string, 10);
        if (isNaN(catId) || catId <= 0) {
          res
            .status(400)
            .json(
              createErrorEnvelope(
                "INVALID_QUERY_PARAMETER",
                "Invalid categoryId parameter.",
                [{ field: "categoryId", message: "categoryId must be a positive integer" }]
              )
            );
          return;
        }
        where.categoryId = catId;
      }

      // Priority validation
      const validPriorities = ["P0_URGENT", "P1_HIGH", "P2_MEDIUM", "P3_LOW"];
      if (requestedPriority !== undefined && requestedPriority !== "") {
        const reqPrioStr = String(requestedPriority).toUpperCase();
        if (!validPriorities.includes(reqPrioStr)) {
          res
            .status(400)
            .json(
              createErrorEnvelope(
                "INVALID_QUERY_PARAMETER",
                "Invalid requestedPriority parameter.",
                [{ field: "requestedPriority", message: `requestedPriority must be one of: ${validPriorities.join(", ")}` }]
              )
            );
          return;
        }
        where.requestedPriority = reqPrioStr as Priority;
      }

      if (itPriority !== undefined && itPriority !== "") {
        const itPrioStr = String(itPriority).toUpperCase();
        if (!validPriorities.includes(itPrioStr)) {
          res
            .status(400)
            .json(
              createErrorEnvelope(
                "INVALID_QUERY_PARAMETER",
                "Invalid itPriority parameter.",
                [{ field: "itPriority", message: `itPriority must be one of: ${validPriorities.join(", ")}` }]
              )
            );
          return;
        }
        where.itPriority = itPrioStr as Priority;
      }

      // Status validation
      const validStatuses = [
        "NEW",
        "OPEN",
        "IN_PROGRESS",
        "WAITING_FOR_REQUESTER",
        "RESOLVED",
        "CLOSED",
        "REOPENED",
        "CANCELLED",
      ];
      if (status !== undefined && status !== "") {
        const statusStr = String(status).toUpperCase();
        if (!validStatuses.includes(statusStr)) {
          res
            .status(400)
            .json(
              createErrorEnvelope(
                "INVALID_QUERY_PARAMETER",
                "Invalid status parameter.",
                [{ field: "status", message: `status must be one of: ${validStatuses.join(", ")}` }]
              )
            );
          return;
        }
        where.status = statusStr as TicketStatus;
      }

      // Owner filter: ALL, UNASSIGNED, MY_TICKETS
      if (owner !== undefined && owner !== "") {
        const ownerStr = String(owner).toUpperCase();
        if (ownerStr === "UNASSIGNED") {
          where.ownerId = null;
        } else if (ownerStr === "MY_TICKETS") {
          where.ownerId = req.user!.id;
        } else if (ownerStr === "ALL") {
          // No owner filter
        } else {
          res
            .status(400)
            .json(
              createErrorEnvelope(
                "INVALID_QUERY_PARAMETER",
                "Invalid owner parameter.",
                [{ field: "owner", message: "owner must be one of: ALL, UNASSIGNED, MY_TICKETS" }]
              )
            );
          return;
        }
      }

      // 3. Sorting
      const validSortFields: Record<string, string> = {
        createdat: "createdAt",
        itpriority: "itPriority",
        status: "status",
        updatedat: "updatedAt",
      };

      const sortFieldKey = typeof sortBy === "string" ? sortBy.toLowerCase() : "createdat";
      const sortFieldName = validSortFields[sortFieldKey] || "createdAt";
      const sortDirection: "asc" | "desc" =
        typeof sortOrder === "string" && sortOrder.toLowerCase() === "asc" ? "asc" : "desc";

      const orderBy: Prisma.TicketOrderByWithRelationInput[] = [
        { [sortFieldName]: sortDirection },
        { id: "desc" },
      ];

      // 4. Query DB in parallel
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
            requestedPriority: true,
            itPriority: true,
            status: true,
            resolutionIndicated: true,
            createdAt: true,
            updatedAt: true,
            requester: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
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
            owner: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        }),
      ]);

      const totalPages = Math.ceil(totalCount / limitNum);

      res.status(200).json({
        data: tickets,
        pagination: {
          page: pageNum,
          pageSize: limitNum,
          totalItems: totalCount,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1,
        },
      });
    } catch (error) {
      res
        .status(500)
        .json(createErrorEnvelope("INTERNAL_SERVER_ERROR", "Failed to fetch staff tickets."));
    }
  }
);

// ---------------------------------------------------------------------------
// Issue 7 — Pre-upload Attachments
// POST /api/attachments/pre-upload
// ---------------------------------------------------------------------------
app.post(
  "/api/attachments/pre-upload",
  requireAuth,
  requirePasswordChanged,
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
  requireAuth,
  requirePasswordChanged,
  requireRole("REQUESTER"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const requesterId = req.requesterId!;
      const {
        categoryId,
        relatedSystemId,
        priority: rawPriority,
        requestedPriority: rawRequestedPriority,
        summary,
        description,
        attachmentIds,
      } = req.body || {};

      const priority = rawRequestedPriority || rawPriority;

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
            requestedPriority: priority,
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

      const responseData = createdTicket
        ? {
            ...createdTicket,
            priority: createdTicket.requestedPriority,
          }
        : null;

      res.status(201).json({ data: responseData });
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
  requireAuth,
  requirePasswordChanged,
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
          comments: {
            where: { isInternal: false },
            orderBy: { createdAt: "asc" },
            include: {
              author: {
                select: {
                  id: true,
                  fullName: true,
                  role: true,
                },
              },
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

      // Requester Isolation (AC-12-12): Anti-leakage returns 404 for unowned tickets
      if (req.user!.role === "REQUESTER" && ticket.requesterId !== requesterId) {
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

      const formattedComments = (ticket.comments || []).map((c: any) => ({
        id: c.id,
        ticketId: c.ticketId,
        authorId: c.authorId,
        authorName: c.author.fullName,
        authorRole: c.author.role,
        content: c.body,
        body: c.body,
        createdAt: c.createdAt,
      }));

      res.status(200).json({
        data: {
          id: ticket.id,
          ticketNo: ticket.ticketNo,
          summary: ticket.summary,
          description: ticket.description,
          priority: ticket.requestedPriority,
          requestedPriority: ticket.requestedPriority,
          itPriority: ticket.itPriority,
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
          comments: formattedComments,
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
// Issue 12 / Section 3.4 — Confirm Problem Appears Resolved
// POST /api/tickets/:id/confirm-resolved
// ---------------------------------------------------------------------------
app.post(
  "/api/tickets/:id/confirm-resolved",
  requireAuth,
  requirePasswordChanged,
  requireRole("REQUESTER"),
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

      // Ownership enforcement: Only ticket owner can confirm resolved (anti-leakage 404)
      if (ticket.requesterId !== requesterId) {
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

      // Precondition 1: Duplicate check (AC-15-12 / Section 3.4)
      if (ticket.resolutionIndicated) {
        res
          .status(409)
          .json(
            createErrorEnvelope(
              "ALREADY_INDICATED_RESOLVED",
              "Ticket resolution has already been confirmed by the requester."
            )
          );
        return;
      }

      // Precondition 2: Must be IN_PROGRESS or WAITING_FOR_REQUESTER
      const eligibleStatuses = ["IN_PROGRESS", "WAITING_FOR_REQUESTER"];
      if (!eligibleStatuses.includes(ticket.status)) {
        res
          .status(422)
          .json(
            createErrorEnvelope(
              "VALIDATION_ERROR",
              `Cannot confirm resolution for ticket in status ${ticket.status}. Must be IN_PROGRESS or WAITING_FOR_REQUESTER.`
            )
          );
        return;
      }

      // If WAITING_FOR_REQUESTER, transition to IN_PROGRESS. Otherwise remain IN_PROGRESS.
      // NOTE: NEVER set status to RESOLVED! (BR-05)
      const nextStatus = "IN_PROGRESS";

      const feedbackCommentText = req.body?.feedbackComment
        ? `[Resolution Feedback] The requester indicated that the reported issue appears resolved. Feedback: ${String(req.body.feedbackComment).trim()}`
        : "[Resolution Feedback] The requester indicated that the reported issue appears resolved.";

      const updated = await getPrisma().$transaction(async (tx) => {
        const updatedTicket = await tx.ticket.update({
          where: { id: ticket.id },
          data: {
            resolutionIndicated: true,
            status: nextStatus,
          },
        });

        // Add automated public comment
        await tx.comment.create({
          data: {
            ticketId: ticket.id,
            authorId: requesterId,
            body: feedbackCommentText,
            isInternal: false,
          },
        });

        // Add activity record
        await tx.ticketActivity.create({
          data: {
            ticketId: ticket.id,
            type: "INDICATE_RESOLVED",
            action: "Problem indicated resolved",
            message: "Requester indicated that the problem appears resolved.",
            actorId: requesterId,
            actorName: req.requester?.fullName || "Requester",
          },
        });

        return updatedTicket;
      });

      res.status(200).json({
        data: {
          id: updated.id,
          ticketNo: updated.ticketNo,
          status: updated.status,
          resolutionIndicated: true,
          message: "Resolution confirmation recorded successfully.",
        },
      });
    } catch (error) {
      res
        .status(500)
        .json(
          createErrorEnvelope(
            "INTERNAL_SERVER_ERROR",
            "Failed to confirm ticket resolution."
          )
        );
    }
  }
);

// ---------------------------------------------------------------------------
// Issue 12 / Section 4.1 — List Public Comments
// GET /api/tickets/:id/comments
// ---------------------------------------------------------------------------
app.get(
  "/api/tickets/:id/comments",
  requireAuth,
  requirePasswordChanged,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
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

      // Authorization: Requesters can only access comments on their own tickets (anti-leakage 404)
      if (req.user!.role === "REQUESTER" && ticket.requesterId !== req.user!.id) {
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

      // IT_STAFF, ADMINISTRATOR, or ticket's Requester can list public comments
      const comments = await getPrisma().comment.findMany({
        where: {
          ticketId,
          isInternal: false,
        },
        orderBy: { createdAt: "asc" },
        include: {
          author: {
            select: {
              id: true,
              fullName: true,
              role: true,
            },
          },
        },
      });

      const formatted = comments.map((c) => ({
        id: c.id,
        ticketId: c.ticketId,
        authorId: c.authorId,
        authorName: c.author.fullName,
        authorRole: c.author.role,
        content: c.body,
        body: c.body,
        createdAt: c.createdAt,
      }));

      res.status(200).json({ data: formatted });
    } catch (error) {
      res
        .status(500)
        .json(
          createErrorEnvelope(
            "INTERNAL_SERVER_ERROR",
            "Failed to fetch ticket comments."
          )
        );
    }
  }
);

// ---------------------------------------------------------------------------
// Issue 12 / Section 4.2 — Post Public Comment
// POST /api/tickets/:id/comments
// ---------------------------------------------------------------------------
app.post(
  "/api/tickets/:id/comments",
  requireAuth,
  requirePasswordChanged,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
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

      // Authorization: Requesters can only post comments on their own tickets (anti-leakage 404)
      if (req.user!.role === "REQUESTER" && ticket.requesterId !== req.user!.id) {
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

      const rawContent = req.body?.content ?? req.body?.body;
      if (
        typeof rawContent !== "string" ||
        rawContent.trim().length < 1 ||
        rawContent.trim().length > 2000
      ) {
        res
          .status(422)
          .json(
            createErrorEnvelope(
              "VALIDATION_ERROR",
              "Comment content must be between 1 and 2000 characters."
            )
          );
        return;
      }

      const commentContent = rawContent.trim();
      const author = req.user!;

      // Side Effect: If ticket is in WAITING_FOR_REQUESTER and author is ticket's requester,
      // transition status to IN_PROGRESS (AC-15-12 / Section 4.2)
      const shouldTransition =
        ticket.status === "WAITING_FOR_REQUESTER" && ticket.requesterId === author.id;

      const result = await getPrisma().$transaction(async (tx) => {
        if (shouldTransition) {
          await tx.ticket.update({
            where: { id: ticket.id },
            data: { status: "IN_PROGRESS" },
          });

          await tx.ticketActivity.create({
            data: {
              ticketId: ticket.id,
              type: "STATUS_CHANGED",
              action: "Status updated",
              message:
                "Ticket status automatically transitioned from WAITING_FOR_REQUESTER to IN_PROGRESS upon requester reply.",
              actorId: author.id,
              actorName: author.fullName,
            },
          });
        }

        const comment = await tx.comment.create({
          data: {
            ticketId: ticket.id,
            authorId: author.id,
            body: commentContent,
            isInternal: false,
          },
          include: {
            author: {
              select: {
                id: true,
                fullName: true,
                role: true,
              },
            },
          },
        });

        await tx.ticketActivity.create({
          data: {
            ticketId: ticket.id,
            type: "COMMENT_ADDED",
            action: "Public comment added",
            message: `Public comment posted by ${author.fullName}.`,
            actorId: author.id,
            actorName: author.fullName,
          },
        });

        return comment;
      });

      res.status(201).json({
        data: {
          id: result.id,
          ticketId: result.ticketId,
          authorId: result.authorId,
          authorName: result.author.fullName,
          authorRole: result.author.role,
          content: result.body,
          body: result.body,
          createdAt: result.createdAt,
        },
      });
    } catch (error) {
      res
        .status(500)
        .json(
          createErrorEnvelope(
            "INTERNAL_SERVER_ERROR",
            "Failed to post comment."
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
  requireAuth,
  requirePasswordChanged,
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

      // Check ownership (AC-12-12 anti-leakage: 404 for non-owning requester)
      if (req.user!.role === "REQUESTER" && ticket.requesterId !== requesterId) {
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
  requireAuth,
  requirePasswordChanged,
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

      // AC-12-12 anti-leakage: Return 404 for unauthorized requesters
      if (req.user!.role === "REQUESTER" && ownerId !== requesterId) {
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

    // Ownership check (AC-12-12 anti-leakage: 404 for unauthorized requester)
    const ownerId = attachment.ticket
      ? attachment.ticket.requesterId
      : attachment.uploadedById;

    if (req.user!.role === "REQUESTER" && ownerId !== requesterId) {
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
  requireAuth,
  requirePasswordChanged,
  handleAttachmentRemoval
);
app.patch(
  "/api/attachments/:id/remove",
  requireAuth,
  requirePasswordChanged,
  handleAttachmentRemoval
);
app.delete(
  "/api/attachments/:id",
  requireAuth,
  requirePasswordChanged,
  handleAttachmentRemoval
);

export default app;

