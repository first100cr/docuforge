// server/routes.ts
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { z } from "zod";
import storage from "./storage";
import converter from "./converter";
import { createServer } from "http";
import type { Request, Response, Express } from "express";

const uploadStorage = multer.diskStorage({
  destination: "./server/uploads",
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: uploadStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

const conversionRequestSchema = z.object({
  conversionType: z.enum([
    "pdf-to-word",
    "word-to-pdf",
    "jpg-to-pdf",
    "pdf-to-jpg",
    "excel-to-pdf",
    "ppt-to-pdf",
    "png-to-pdf",
    "pdf-to-png",
    "pdf-compress",
    "pdf-merge",
    "pdf-text",
    "pdf-split",
    "pdf-images",
    "ocr",
    "pdf-summary",
    "pdf-editable-text",
    "pdf-table-extract",
  ]),
  jobId: z.string().uuid(),
});

async function registerRoutes(app: Express) {
  app.post("/api/upload", upload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });


      const fileSize = req.file.size;
      const fileExtension = path.extname(req.file.originalname).slice(1).toLowerCase();
      const job = await storage.createConversionJob({
        originalFilename: req.file.originalname,
        originalFormat: fileExtension,
        targetFormat: "pending",
        status: "uploaded",
        inputPath: req.file.path,
        fileSize,
        outputPath: null,
      });

      res.json({
        success: true,
        jobId: job.id,
        filename: req.file.originalname,
        fileSize: `${(fileSize / 1024).toFixed(2)} KB`,
        format: fileExtension,
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  app.post("/api/convert", async (req: Request, res: Response) => {
    try {
      const validationResult = conversionRequestSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Invalid request",
          details: validationResult.error.errors,
        });
      }

      const { conversionType, jobId } = validationResult.data;
      const job = await storage.getConversionJob(jobId);
      if (!job) return res.status(404).json({ error: "Job not found" });

      await storage.updateConversionJob(jobId, {
        status: "converting",
        targetFormat: conversionType.split("-to-")[1] ?? "unknown",
      });

      const outputPath = await converter.convert(job.inputPath, conversionType, job.originalFilename);
      const updatedJob = await storage.updateConversionJob(jobId, {
        status: "completed",
        outputPath,
      });

      res.json({ success: true, job: updatedJob });
    } catch (error) {
      console.error("Conversion error:", error);
      if (req.body.jobId && typeof req.body.jobId === "string") {
        await storage.updateConversionJob(req.body.jobId, { status: "failed" });
      }
      const errorMessage = error instanceof Error ? error.message : "Conversion failed";
      res.status(500).json({ error: errorMessage });
    }
  });

  app.get("/api/download/:jobId", async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;
      const job = await storage.getConversionJob(jobId);
      if (!job || !job.outputPath) return res.status(404).json({ error: "File not found" });

      try {
        await fs.access(job.outputPath);
      } catch {
        return res.status(404).json({ error: "File not found on server" });
      }

      const filename = path.basename(job.outputPath);
      res.download(job.outputPath, filename, async (err) => {
        if (err) console.error("Download error:", err);
        // Post-download cleanup: best-effort after 60s
        setTimeout(async () => {
          try {
            if (job.inputPath) await converter.cleanup(job.inputPath);
            if (job.outputPath) await converter.cleanup(job.outputPath);
            await storage.deleteConversionJob(jobId);
          } catch (cleanupError) {
            console.error("Cleanup error:", cleanupError);
          }
        }, 60_000);
      });
    } catch (error) {
      console.error("Download error:", error);
      res.status(500).json({ error: "Failed to download file" });
    }
  });

  app.get("/api/job/:jobId", async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;
      const job = await storage.getConversionJob(jobId);
      if (!job) return res.status(404).json({ error: "Job not found" });
      res.json({ job });
    } catch (error) {
      console.error("Job status error:", error);
      res.status(500).json({ error: "Failed to get job status" });
    }
  });

  // create and return an http.Server so vite middleware can use it
  const httpServer = createServer(app);
  return httpServer;
}

export default registerRoutes;
