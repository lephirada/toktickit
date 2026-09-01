import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { Request, Response, NextFunction } from "express";
import { createErrorEnvelope } from "../utils/errors.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const UPLOAD_DIR = path.resolve(__dirname, "../../uploads");

// Ensure directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/plain",
  "image/jpg",
];

const storage = multer.memoryStorage();

const multerUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      const err = new Error("Allowed file types: JPEG, PNG, WEBP, PDF, TXT.");
      (err as unknown as { code: string }).code = "UNSUPPORTED_MEDIA_TYPE";
      cb(err);
    }
  },
});

export function handlePreUploadMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const uploadHandler = multerUpload.any();

  uploadHandler(req, res, (err: unknown) => {
    if (err) {
      const multerErr = err as { code?: string; message?: string };
      if (multerErr.code === "LIMIT_FILE_SIZE") {
        res
          .status(413)
          .json(
            createErrorEnvelope("FILE_TOO_LARGE", "File size exceeds 5MB limit.")
          );
        return;
      }
      if (multerErr.code === "UNSUPPORTED_MEDIA_TYPE") {
        res
          .status(415)
          .json(
            createErrorEnvelope(
              "UNSUPPORTED_MEDIA_TYPE",
              "Allowed file types: JPEG, PNG, WEBP, PDF, TXT."
            )
          );
        return;
      }
      if (
        multerErr.code === "LIMIT_FILE_COUNT" ||
        multerErr.code === "LIMIT_UNEXPECTED_FILE"
      ) {
        res
          .status(413)
          .json(
            createErrorEnvelope(
              "MAX_ATTACHMENTS_EXCEEDED",
              "Maximum 5 attachments allowed per upload."
            )
          );
        return;
      }
      res
        .status(400)
        .json(
          createErrorEnvelope(
            "UPLOAD_ERROR",
            multerErr.message || "Failed to process uploaded file."
          )
        );
      return;
    }

    const files = req.files as Express.Multer.File[] | undefined;

    if (!files || files.length === 0) {
      res
        .status(400)
        .json(
          createErrorEnvelope("NO_FILES_PROVIDED", "No files provided for pre-upload.")
        );
      return;
    }

    if (files.length > 5) {
      res
        .status(413)
        .json(
          createErrorEnvelope(
            "MAX_ATTACHMENTS_EXCEEDED",
            "Maximum 5 attachments allowed per upload."
          )
        );
      return;
    }

    next();
  });
}
