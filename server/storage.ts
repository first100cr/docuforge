// server/storage.ts
import { randomUUID } from "crypto";

interface ConversionJob {
  id: string;
  originalFilename: string;
  originalFormat: string;
  targetFormat: string;
  status: string;
  inputPath: string;
  outputPath: string | null;
  fileSize: number;
  createdAt: Date;
}

interface InsertJob {
  originalFilename: string;
  originalFormat: string;
  targetFormat: string;
  status?: string;
  inputPath: string;
  outputPath?: string | null;
  fileSize: number;
}

class MemStorage {
  conversionJobs: Map<string, ConversionJob>;

  constructor() {
    this.conversionJobs = new Map();
  }

  async getConversionJob(id: string): Promise<ConversionJob | undefined> {
    return this.conversionJobs.get(id);
  }

  async createConversionJob(insertJob: InsertJob): Promise<ConversionJob> {
    const id = randomUUID();
    const job: ConversionJob = {
      id,
      originalFilename: insertJob.originalFilename,
      originalFormat: insertJob.originalFormat,
      targetFormat: insertJob.targetFormat,
      status: insertJob.status || "pending",
      inputPath: insertJob.inputPath,
      outputPath: insertJob.outputPath || null,
      fileSize: insertJob.fileSize,
      createdAt: new Date(),
    };
    this.conversionJobs.set(id, job);
    return job;
  }

  async updateConversionJob(id: string, updates: Partial<ConversionJob>): Promise<ConversionJob | undefined> {
    const job = this.conversionJobs.get(id);
    if (!job) return undefined;
    const updatedJob = { ...job, ...updates };
    this.conversionJobs.set(id, updatedJob);
    return updatedJob;
  }

  async deleteConversionJob(id: string): Promise<void> {
    this.conversionJobs.delete(id);
  }
}

const storage = new MemStorage();
export default storage;
