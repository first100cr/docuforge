import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import { converter, type ConversionType, SUPPORTED_CONVERSIONS } from "./converter";
import * as fs from "fs/promises";
import { z } from "zod";

// Configure multer for file uploads
const uploadStorage = multer.diskStorage({
  destination: './server/uploads',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: uploadStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

const conversionRequestSchema = z.object({
  conversionType: z.enum([
    'pdf-to-word',
    'word-to-pdf',
    'jpg-to-pdf',
    'pdf-to-jpg',
    'excel-to-pdf',
    'ppt-to-pdf',
    'png-to-pdf',
    'pdf-to-png',
  ] as const),
  jobId: z.string().uuid(),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Upload file endpoint
  app.post('/api/upload', upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const fileSize = `${(req.file.size / 1024).toFixed(2)} KB`;
      const fileExtension = path.extname(req.file.originalname).slice(1).toLowerCase();

      // Create conversion job
      const job = await storage.createConversionJob({
        originalFilename: req.file.originalname,
        originalFormat: fileExtension,
        targetFormat: 'pending',
        status: 'uploaded',
        inputPath: req.file.path,
        fileSize: fileSize,
        outputPath: null,
      });

      res.json({
        success: true,
        jobId: job.id,
        filename: req.file.originalname,
        fileSize: fileSize,
        format: fileExtension,
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Failed to upload file' });
    }
  });

  // Start conversion endpoint
  app.post('/api/convert', async (req: Request, res: Response) => {
    try {
      const validationResult = conversionRequestSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: 'Invalid request', 
          details: validationResult.error.errors 
        });
      }

      const { conversionType, jobId } = validationResult.data;

      const job = await storage.getConversionJob(jobId);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      // Update job status
      await storage.updateConversionJob(jobId, {
        status: 'converting',
        targetFormat: conversionType.split('-to-')[1],
      });

      // Perform conversion
      const outputPath = await converter.convert(
        job.inputPath,
        conversionType,
        job.originalFilename
      );

      // Update job with output
      const updatedJob = await storage.updateConversionJob(jobId, {
        status: 'completed',
        outputPath: outputPath,
      });

      res.json({
        success: true,
        job: updatedJob,
      });
    } catch (error) {
      console.error('Conversion error:', error);
      
      // Update job status to failed
      if (req.body.jobId && typeof req.body.jobId === 'string') {
        await storage.updateConversionJob(req.body.jobId, {
          status: 'failed',
        });
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Conversion failed';
      res.status(500).json({ error: errorMessage });
    }
  });

  // Download converted file endpoint
  app.get('/api/download/:jobId', async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;
      
      const job = await storage.getConversionJob(jobId);
      if (!job || !job.outputPath) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Check if file exists
      try {
        await fs.access(job.outputPath);
      } catch {
        return res.status(404).json({ error: 'File not found on server' });
      }

      const filename = path.basename(job.outputPath);
      res.download(job.outputPath, filename, async (err) => {
        if (err) {
          console.error('Download error:', err);
        }
        
        // Cleanup files after download (optional - could be done by a background job)
        setTimeout(async () => {
          try {
            if (job.inputPath) await converter.cleanup(job.inputPath);
            if (job.outputPath) await converter.cleanup(job.outputPath);
            await storage.deleteConversionJob(jobId);
          } catch (cleanupError) {
            console.error('Cleanup error:', cleanupError);
          }
        }, 60000); // Cleanup after 1 minute
      });
    } catch (error) {
      console.error('Download error:', error);
      res.status(500).json({ error: 'Failed to download file' });
    }
  });

  // Get job status endpoint
  app.get('/api/job/:jobId', async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;
      
      const job = await storage.getConversionJob(jobId);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      res.json({ job });
    } catch (error) {
      console.error('Job status error:', error);
      res.status(500).json({ error: 'Failed to get job status' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
