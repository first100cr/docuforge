// server/storage.js
import { randomUUID } from "crypto";

class MemStorage {
  constructor() {
    this.conversionJobs = new Map();
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
      createdAt: new Date(),
    };
    this.conversionJobs.set(id, job);
    return job;
  }

  async updateConversionJob(id, updates) {
    const job = this.conversionJobs.get(id);
    if (!job) return undefined;
    const updatedJob = { ...job, ...updates };
    this.conversionJobs.set(id, updatedJob);
    return updatedJob;
  }

  async deleteConversionJob(id) {
    this.conversionJobs.delete(id);
  }
}

const storage = new MemStorage();
export default storage;
