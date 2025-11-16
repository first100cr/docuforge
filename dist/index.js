var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
import { randomUUID } from "crypto";
var MemStorage = class {
  conversionJobs;
  constructor() {
    this.conversionJobs = /* @__PURE__ */ new Map();
  }
  async getConversionJob(id) {
    return this.conversionJobs.get(id);
  }
  async createConversionJob(insertJob) {
    const id = randomUUID();
    const job = {
      id,
      originalFilename: insertJob.originalFilename,
      originalFormat: insertJob.originalFormat,
      targetFormat: insertJob.targetFormat,
      status: insertJob.status || "pending",
      inputPath: insertJob.inputPath,
      outputPath: insertJob.outputPath || null,
      fileSize: insertJob.fileSize,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.conversionJobs.set(id, job);
    return job;
  }
  async updateConversionJob(id, updates) {
    const job = this.conversionJobs.get(id);
    if (!job) return void 0;
    const updatedJob = { ...job, ...updates };
    this.conversionJobs.set(id, updatedJob);
    return updatedJob;
  }
  async deleteConversionJob(id) {
    this.conversionJobs.delete(id);
  }
};
var storage = new MemStorage();

// server/routes.ts
import multer from "multer";
import path2 from "path";

// server/converter.ts
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import libre from "libreoffice-convert";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { createWorker } from "tesseract.js";
import OpenAI from "openai";
libre.convertAsync = __require("util").promisify(libre.convert);
var DocumentConverter = class {
  uploadsDir;
  convertedDir;
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  constructor(uploadsDir = "./server/uploads", convertedDir = "./server/converted") {
    this.uploadsDir = uploadsDir;
    this.convertedDir = convertedDir;
  }
  async convert(inputPath, conversionType, originalFilename, additionalFiles) {
    const baseName = path.parse(originalFilename).name;
    switch (conversionType) {
      case "jpg-to-pdf":
      case "png-to-pdf":
        return await this.imageToPdf(inputPath, baseName);
      case "pdf-to-jpg":
      case "pdf-to-png":
        return await this.pdfToImage(inputPath, baseName, conversionType === "pdf-to-jpg" ? "jpg" : "png");
      case "word-to-pdf":
      case "excel-to-pdf":
      case "ppt-to-pdf":
        return await this.officeToPdf(inputPath, baseName);
      case "pdf-to-word":
        return await this.pdfToWord(inputPath, baseName);
      case "pdf-compress":
        return await this.compressPdf(inputPath, baseName);
      case "pdf-merge":
        return await this.mergePdfs([inputPath, ...additionalFiles || []], baseName);
      case "pdf-text":
        return await this.extractPdfText(inputPath);
      case "pdf-split":
        return await this.splitPdf(inputPath, baseName);
      case "pdf-images":
        return await this.extractPdfImages(inputPath, baseName);
      case "ocr":
        return await this.performOCR(inputPath, baseName);
      case "pdf-summary":
        return await this.summarizePdf(inputPath, baseName);
      case "pdf-editable-text":
        return await this.scannedPdfToText(inputPath, baseName);
      case "pdf-table-extract":
        return await this.extractTablesAI(inputPath);
      default:
        throw new Error(`Unsupported conversion type: ${conversionType}`);
    }
  }
  // -----------------------------------------------------------
  // IMAGE → PDF
  // -----------------------------------------------------------
  async imageToPdf(imagePath, baseName) {
    const outputPath = path.join(this.convertedDir, `${baseName}.pdf`);
    const imageBuffer = await fs.readFile(imagePath);
    const jpegBuffer = await sharp(imageBuffer).jpeg().toBuffer();
    const pdfDoc = await PDFDocument.create();
    const image = await pdfDoc.embedJpg(jpegBuffer);
    const { width, height } = image;
    const page = pdfDoc.addPage([width, height]);
    page.drawImage(image, { x: 0, y: 0, width, height });
    const pdfBytes = await pdfDoc.save();
    await fs.writeFile(outputPath, pdfBytes);
    return outputPath;
  }
  // -----------------------------------------------------------
  // PDF → Image
  // -----------------------------------------------------------
  async pdfToImage(pdfPath, baseName, ext) {
    const output = path.join(this.convertedDir, `${baseName}.${ext}`);
    const placeholder = await sharp({
      create: { width: 800, height: 1e3, channels: 3, background: "white" }
    }).png().toBuffer();
    if (ext === "jpg") {
      await sharp(placeholder).jpeg({ quality: 80 }).toFile(output);
    } else {
      await fs.writeFile(output, placeholder);
    }
    return output;
  }
  // -----------------------------------------------------------
  // Word/Excel/PPT → PDF
  // -----------------------------------------------------------
  async officeToPdf(inputPath, baseName) {
    const outputPath = path.join(this.convertedDir, `${baseName}.pdf`);
    const buffer = await fs.readFile(inputPath);
    const pdfBuf = await libre.convertAsync(buffer, ".pdf", void 0);
    await fs.writeFile(outputPath, pdfBuf);
    return outputPath;
  }
  // -----------------------------------------------------------
  // PDF → Word
  // -----------------------------------------------------------
  async pdfToWord(pdfPath, baseName) {
    const outputPath = path.join(this.convertedDir, `${baseName}.docx`);
    const text = await this.extractPdfText(pdfPath);
    const doc = new Document({
      sections: [
        {
          children: [new Paragraph({ children: [new TextRun({ text, size: 22 })] })]
        }
      ]
    });
    const buffer = await Packer.toBuffer(doc);
    await fs.writeFile(outputPath, buffer);
    return outputPath;
  }
  // -----------------------------------------------------------
  // COMPRESS PDF
  // -----------------------------------------------------------
  async compressPdf(pdfPath, baseName) {
    const outputPath = path.join(this.convertedDir, `${baseName}-compressed.pdf`);
    const pdf = await PDFDocument.load(await fs.readFile(pdfPath));
    const compressed = await pdf.save({ useObjectStreams: false });
    await fs.writeFile(outputPath, compressed);
    return outputPath;
  }
  // -----------------------------------------------------------
  // MERGE PDFs
  // -----------------------------------------------------------
  async mergePdfs(files, baseName) {
    const outputPath = path.join(this.convertedDir, `${baseName}-merged.pdf`);
    const merged = await PDFDocument.create();
    for (const file of files) {
      const pdf = await PDFDocument.load(await fs.readFile(file));
      const pages = await merged.copyPages(pdf, pdf.getPageIndices());
      pages.forEach((p) => merged.addPage(p));
    }
    const buf = await merged.save();
    await fs.writeFile(outputPath, buf);
    return outputPath;
  }
  // -----------------------------------------------------------
  // Extract PDF Text
  // -----------------------------------------------------------
  async extractPdfText(pdfPath) {
    const data = await fs.readFile(pdfPath);
    const pdf = await PDFDocument.load(data);
    let text = "";
    for (const page of pdf.getPages()) {
      text += page.getText();
    }
    return text || "No text found (scanned PDF?)";
  }
  // -----------------------------------------------------------
  // Split PDF into pages
  // -----------------------------------------------------------
  async splitPdf(pdfPath, baseName) {
    const pdf = await PDFDocument.load(await fs.readFile(pdfPath));
    const files = [];
    for (let i = 0; i < pdf.getPageCount(); i++) {
      const newPdf = await PDFDocument.create();
      const [page] = await newPdf.copyPages(pdf, [i]);
      newPdf.addPage(page);
      const out = path.join(this.convertedDir, `${baseName}-page-${i + 1}.pdf`);
      await fs.writeFile(out, await newPdf.save());
      files.push(out);
    }
    return files;
  }
  // -----------------------------------------------------------
  // Extract Images from PDF
  // -----------------------------------------------------------
  async extractPdfImages(pdfPath, baseName) {
    const pdf = await PDFDocument.load(await fs.readFile(pdfPath));
    const outFiles = [];
    let index = 1;
    for (const page of pdf.getPages()) {
      const images = page.node.normalizedEntries();
      for (const [key, val] of images) {
        if (val?.image) {
          const img = val.image;
          const imgBytes = img.bytes;
          const out = path.join(this.convertedDir, `${baseName}-img-${index}.png`);
          await fs.writeFile(out, imgBytes);
          outFiles.push(out);
          index++;
        }
      }
    }
    return outFiles;
  }
  // -----------------------------------------------------------
  // OCR: Extract text from images or scanned PDFs
  // -----------------------------------------------------------
  async performOCR(inputPath, baseName) {
    const worker = await createWorker("eng");
    const { data } = await worker.recognize(inputPath);
    await worker.terminate();
    const out = path.join(this.convertedDir, `${baseName}-ocr.txt`);
    await fs.writeFile(out, data.text);
    return out;
  }
  // -----------------------------------------------------------
  // PDF Summarization (OpenAI)
  // -----------------------------------------------------------
  async summarizePdf(pdfPath, baseName) {
    const text = await this.extractPdfText(pdfPath);
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: `Summarize this document:
${text}` }]
    });
    const summary = response.choices[0].message.content;
    const out = path.join(this.convertedDir, `${baseName}-summary.txt`);
    await fs.writeFile(out, summary);
    return out;
  }
  // -----------------------------------------------------------
  // Convert scanned PDF to editable text (OCR + formatting)
  // -----------------------------------------------------------
  async scannedPdfToText(pdfPath, baseName) {
    const text = await this.performOCR(pdfPath, baseName);
    return text;
  }
  // -----------------------------------------------------------
  // Extract tables using AI
  // -----------------------------------------------------------
  async extractTablesAI(pdfPath) {
    const text = await this.extractPdfText(pdfPath);
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: "Extract all tabular data from the following text. Return in JSON format:\n\n" + text
        }
      ]
    });
    return response.choices[0].message.content;
  }
};
var converter = new DocumentConverter();

// server/routes.ts
import * as fs2 from "fs/promises";
import { z } from "zod";
var uploadStorage = multer.diskStorage({
  destination: "./server/uploads",
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path2.extname(file.originalname));
  }
});
var upload = multer({
  storage: uploadStorage,
  limits: {
    fileSize: 10 * 1024 * 1024
    // 10MB limit
  }
});
var conversionRequestSchema = z.object({
  conversionType: z.enum([
    "pdf-to-word",
    "word-to-pdf",
    "jpg-to-pdf",
    "pdf-to-jpg",
    "excel-to-pdf",
    "ppt-to-pdf",
    "png-to-pdf",
    "pdf-to-png"
  ]),
  jobId: z.string().uuid()
});
async function registerRoutes(app2) {
  app2.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const fileSize = `${(req.file.size / 1024).toFixed(2)} KB`;
      const fileExtension = path2.extname(req.file.originalname).slice(1).toLowerCase();
      const job = await storage.createConversionJob({
        originalFilename: req.file.originalname,
        originalFormat: fileExtension,
        targetFormat: "pending",
        status: "uploaded",
        inputPath: req.file.path,
        fileSize,
        outputPath: null
      });
      res.json({
        success: true,
        jobId: job.id,
        filename: req.file.originalname,
        fileSize,
        format: fileExtension
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });
  app2.post("/api/convert", async (req, res) => {
    try {
      const validationResult = conversionRequestSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Invalid request",
          details: validationResult.error.errors
        });
      }
      const { conversionType, jobId } = validationResult.data;
      const job = await storage.getConversionJob(jobId);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      await storage.updateConversionJob(jobId, {
        status: "converting",
        targetFormat: conversionType.split("-to-")[1]
      });
      const outputPath = await converter.convert(
        job.inputPath,
        conversionType,
        job.originalFilename
      );
      const updatedJob = await storage.updateConversionJob(jobId, {
        status: "completed",
        outputPath
      });
      res.json({
        success: true,
        job: updatedJob
      });
    } catch (error) {
      console.error("Conversion error:", error);
      if (req.body.jobId && typeof req.body.jobId === "string") {
        await storage.updateConversionJob(req.body.jobId, {
          status: "failed"
        });
      }
      const errorMessage = error instanceof Error ? error.message : "Conversion failed";
      res.status(500).json({ error: errorMessage });
    }
  });
  app2.get("/api/download/:jobId", async (req, res) => {
    try {
      const { jobId } = req.params;
      const job = await storage.getConversionJob(jobId);
      if (!job || !job.outputPath) {
        return res.status(404).json({ error: "File not found" });
      }
      try {
        await fs2.access(job.outputPath);
      } catch {
        return res.status(404).json({ error: "File not found on server" });
      }
      const filename = path2.basename(job.outputPath);
      res.download(job.outputPath, filename, async (err) => {
        if (err) {
          console.error("Download error:", err);
        }
        setTimeout(async () => {
          try {
            if (job.inputPath) await converter.cleanup(job.inputPath);
            if (job.outputPath) await converter.cleanup(job.outputPath);
            await storage.deleteConversionJob(jobId);
          } catch (cleanupError) {
            console.error("Cleanup error:", cleanupError);
          }
        }, 6e4);
      });
    } catch (error) {
      console.error("Download error:", error);
      res.status(500).json({ error: "Failed to download file" });
    }
  });
  app2.get("/api/job/:jobId", async (req, res) => {
    try {
      const { jobId } = req.params;
      const job = await storage.getConversionJob(jobId);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      res.json({ job });
    } catch (error) {
      console.error("Job status error:", error);
      res.status(500).json({ error: "Failed to get job status" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs3 from "fs";
import path4 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path3 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      ),
      await import("@replit/vite-plugin-dev-banner").then(
        (m) => m.devBanner()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path3.resolve(import.meta.dirname, "client", "src"),
      "@shared": path3.resolve(import.meta.dirname, "shared"),
      "@assets": path3.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path3.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path3.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path4.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs3.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path4.resolve(import.meta.dirname, "public");
  if (!fs3.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path4.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path5 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path5.startsWith("/api")) {
      let logLine = `${req.method} ${path5} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(port, "127.0.0.1", () => {
    log(`serving on port ${port}`);
  });
})();
