import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const conversionJobs = pgTable("conversion_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  originalFilename: text("original_filename").notNull(),
  originalFormat: text("original_format").notNull(),
  targetFormat: text("target_format").notNull(),
  status: text("status").notNull().default("pending"),
  inputPath: text("input_path").notNull(),
  outputPath: text("output_path"),
  fileSize: text("file_size").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertConversionJobSchema = createInsertSchema(conversionJobs).omit({
  id: true,
  createdAt: true,
});

export type InsertConversionJob = z.infer<typeof insertConversionJobSchema>;
export type ConversionJob = typeof conversionJobs.$inferSelect;
