// server/converter.ts
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "node:util";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { createWorker } from "tesseract.js";
import OpenAI from "openai";
import { PDFParse } from "pdf-parse";
import { createWriteStream } from "fs";
import archiver from "archiver";

const execAsync = promisify(exec);

class DocumentConverter {
  uploadsDir: string;
  convertedDir: string;
  openai: OpenAI;

  constructor(uploadsDir = "./server/uploads", convertedDir = "./server/converted") {
    this.uploadsDir = uploadsDir;
    this.convertedDir = convertedDir;
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  // main convert entry
  async convert(inputPath: string, conversionType: string, originalFilename: string, additionalFiles?: string[]) {
    const baseName = path.parse(originalFilename).name;
    switch (conversionType) {
      case "jpg-to-pdf":
      case "png-to-pdf":
        return this.imageToPdf(inputPath, baseName);
      case "pdf-to-jpg":
      case "pdf-to-png":
        return this.pdfToImage(inputPath, baseName, conversionType === "pdf-to-jpg" ? "jpg" : "png");
      case "word-to-pdf":
      case "excel-to-pdf":
      case "ppt-to-pdf":
        return this.officeToPdf(inputPath, baseName);
      case "pdf-to-word":
        return this.pdfToWord(inputPath, baseName);
      case "pdf-compress":
        return this.compressPdf(inputPath, baseName);
      case "pdf-merge":
        return this.mergePdfs([inputPath, ...additionalFiles || []], baseName);
      case "pdf-text":
        return this.extractPdfText(inputPath);
      case "pdf-split":
        return this.splitPdf(inputPath, baseName);
      case "pdf-images":
        return this.extractPdfImages(inputPath, baseName);
      case "ocr":
        return this.performOCR(inputPath, baseName);
      case "pdf-summary":
        return this.summarizePdf(inputPath, baseName);
      case "pdf-editable-text":
        return this.scannedPdfToText(inputPath, baseName);
      case "pdf-table-extract":
        return this.extractTablesAI(inputPath);
      default:
        throw new Error(`Unsupported conversion type: ${conversionType}`);
    }
  }

  // ---------- helpers ----------
  async ensureDir(dir: string) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (e) {
      // ignore
    }
  }

  async cleanup(filePath: string) {
    if (!filePath) return;
    try {
      await fs.unlink(filePath);
    } catch (e) {
      // ignore missing files
    }
  }

  // IMAGE -> PDF
  async imageToPdf(imagePath: string, baseName: string) {
    await this.ensureDir(this.convertedDir);
    const outputPath = path.join(this.convertedDir, `${baseName}.pdf`);
    const imageBuffer = await fs.readFile(imagePath);
    const jpegBuffer = await sharp(imageBuffer).jpeg().toBuffer();
    const pdfDoc = await PDFDocument.create();
    const image = await pdfDoc.embedJpg(jpegBuffer);
    const { width, height } = image.scale(1);
    const page = pdfDoc.addPage([width, height]);
    page.drawImage(image, { x: 0, y: 0, width, height });
    const pdfBytes = await pdfDoc.save();
    await fs.writeFile(outputPath, pdfBytes);
    return outputPath;
  }

  // PDF -> Image (using soffice)
  async pdfToImage(pdfPath: string, baseName: string, ext: string) {
    await this.ensureDir(this.convertedDir);

    // Check page count to decide strategy
    const pdfBuffer = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pageCount = pdfDoc.getPageCount();

    if (pageCount > 1) {
      // Multi-page: Split -> Convert each -> Zip
      const tempDir = path.join(this.convertedDir, `temp_${baseName}_${Date.now()}`);
      await this.ensureDir(tempDir);

      try {
        const imageFiles: string[] = [];

        // Split and convert each page
        for (let i = 0; i < pageCount; i++) {
          const newPdf = await PDFDocument.create();
          const [page] = await newPdf.copyPages(pdfDoc, [i]);
          newPdf.addPage(page);

          const pageBaseName = `${baseName}-page-${i + 1}`;
          const pagePdfPath = path.join(tempDir, `${pageBaseName}.pdf`);
          await fs.writeFile(pagePdfPath, await newPdf.save());

          // Convert this page PDF to image
          const cmd = `soffice --headless --convert-to ${ext} --outdir "${tempDir}" "${pagePdfPath}"`;
          await execAsync(cmd);

          // Expected output filename from soffice
          const expectedImageName = `${pageBaseName}.${ext}`;
          const expectedImagePath = path.join(tempDir, expectedImageName);

          // Verify existence
          try {
            await fs.access(expectedImagePath);
            imageFiles.push(expectedImageName);
          } catch (e) {
            console.error(`Failed to convert page ${i + 1}`, e);
          }
        }

        if (imageFiles.length === 0) {
          throw new Error("No images generated from multi-page PDF");
        }

        // Zip them
        const zipPath = path.join(this.convertedDir, `${baseName}-images.zip`);
        const output = createWriteStream(zipPath);
        const archive = archiver("zip", { zlib: { level: 9 } });

        return new Promise<string>((resolve, reject) => {
          output.on("close", async () => {
            await fs.rm(tempDir, { recursive: true, force: true });
            resolve(zipPath);
          });
          archive.on("error", (err) => reject(err));
          archive.pipe(output);
          for (const file of imageFiles) {
            archive.file(path.join(tempDir, file), { name: file });
          }
          archive.finalize();
        });

      } catch (error: any) {
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => { });
        console.error("Multi-page conversion error:", error);
        throw new Error(`Conversion failed: ${error.message}`);
      }
    } else {
      // Single page: Convert directly
      const tempDir = path.join(this.convertedDir, `temp_${baseName}_${Date.now()}`);
      await this.ensureDir(tempDir);

      try {
        const cmd = `soffice --headless --convert-to ${ext} --outdir "${tempDir}" "${pdfPath}"`;
        console.log("Executing conversion command:", cmd);
        await execAsync(cmd);

        const files = await fs.readdir(tempDir);
        const imageFiles = files.filter(f => f.toLowerCase().endsWith(`.${ext}`));

        if (imageFiles.length === 0) {
          throw new Error("No images generated from PDF conversion");
        }

        // Move the single file
        const source = path.join(tempDir, imageFiles[0]);
        const target = path.join(this.convertedDir, `${baseName}.${ext}`);
        await fs.rename(source, target);
        await fs.rm(tempDir, { recursive: true, force: true });
        return target;

      } catch (error: any) {
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => { });
        console.error("Single-page conversion error:", error);
        throw new Error(`Conversion failed: ${error.message}`);
      }
    }
  }

  // OFFICE -> PDF using direct soffice call
  async officeToPdf(inputPath: string, baseName: string) {
    await this.ensureDir(this.convertedDir);
    const outputPath = path.join(this.convertedDir, `${baseName}.pdf`);

    try {
      // --headless: no UI
      // --convert-to pdf: output format
      // --outdir: output directory
      const cmd = `soffice --headless --convert-to pdf --outdir "${this.convertedDir}" "${inputPath}"`;
      console.log("Executing conversion command:", cmd);
      await execAsync(cmd);

      const expectedOutput = path.join(this.convertedDir, path.parse(inputPath).name + ".pdf");

      if (expectedOutput !== outputPath) {
        await fs.rename(expectedOutput, outputPath);
      }

      return outputPath;
    } catch (error: any) {
      console.error("LibreOffice conversion error:", error);
      throw new Error(`Conversion failed: ${error.message}`);
    }
  }

  // PDF -> Word (using direct soffice call for reliability)
  async pdfToWord(pdfPath: string, baseName: string) {
    await this.ensureDir(this.convertedDir);
    const outputPath = path.join(this.convertedDir, `${baseName}.docx`);

    // We use the input pdfPath directly since it's already a file on disk
    // Run soffice conversion
    // --headless: no UI
    // --infilter="writer_pdf_import": force PDF import
    // --convert-to docx: output format
    // --outdir: output directory
    try {
      const cmd = `soffice --headless --infilter="writer_pdf_import" --convert-to docx --outdir "${this.convertedDir}" "${pdfPath}"`;
      console.log("Executing conversion command:", cmd);
      await execAsync(cmd);

      // soffice uses the input filename for the output, so we might need to rename if baseName is different
      // But here pdfPath is likely uploads/filename.pdf, so output will be converted/filename.docx
      // We need to ensure the output filename matches what we expect

      const expectedOutput = path.join(this.convertedDir, path.parse(pdfPath).name + ".docx");

      if (expectedOutput !== outputPath) {
        await fs.rename(expectedOutput, outputPath);
      }

      return outputPath;
    } catch (error: any) {
      console.error("LibreOffice conversion error:", error);
      throw new Error(`Conversion failed: ${error.message}`);
    }
  }

  // COMPRESS PDF (basic)
  async compressPdf(pdfPath: string, baseName: string) {
    await this.ensureDir(this.convertedDir);
    const outputPath = path.join(this.convertedDir, `${baseName}-compressed.pdf`);
    const pdf = await PDFDocument.load(await fs.readFile(pdfPath));
    const compressed = await pdf.save({ useObjectStreams: false });
    await fs.writeFile(outputPath, compressed);
    return outputPath;
  }

  // MERGE PDFs
  async mergePdfs(files: string[], baseName: string) {
    await this.ensureDir(this.convertedDir);
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

  // Extract PDF text using pdf-parse
  async extractPdfText(pdfPath: string): Promise<string> {
    try {
      const dataBuffer = await fs.readFile(pdfPath);
      const parser = new PDFParse(new Uint8Array(dataBuffer));
      const data = await parser.getText();

      const text = data.text.trim();

      if (!text || text.length === 0) {
        return "No text found (scanned PDF?)";
      }

      return text;
    } catch (error) {
      console.error("PDF text extraction error:", error);
      return "No text found (scanned PDF?)";
    }
  }

  // Split PDF into single-page PDFs
  async splitPdf(pdfPath: string, baseName: string) {
    await this.ensureDir(this.convertedDir);
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

  // Extract images from PDF (best-effort)
  async extractPdfImages(pdfPath: string, baseName: string) {
    await this.ensureDir(this.convertedDir);
    const pdf = await PDFDocument.load(await fs.readFile(pdfPath));
    const outFiles = [];
    let index = 1;
    for (const page of pdf.getPages()) {
      const images = page.node.normalizedEntries?.() || [];
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

  // OCR using tesseract.js
  async performOCR(inputPath: string, baseName: string) {
    await this.ensureDir(this.convertedDir);
    const worker = await createWorker("eng");

    try {
      const { data } = await worker.recognize(inputPath);

      const out = path.join(this.convertedDir, `${baseName}-ocr.txt`);
      await fs.writeFile(out, data.text);
      return out;
    } finally {
      await worker.terminate();
    }
  }

  async scannedPdfToText(pdfPath: string, baseName: string) {
    // use OCR pipeline for scanned PDFs
    return this.performOCR(pdfPath, baseName);
  }

  // Summarize PDF via OpenAI
  async summarizePdf(pdfPath: string, baseName: string) {
    const text = await this.extractPdfText(pdfPath);

    if (text === "No text found (scanned PDF?)") {
      throw new Error("Cannot summarize: No text found in PDF. This might be a scanned document.");
    }

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: `Summarize this document:\n${text}` }],
    });

    const summary = response.choices?.[0]?.message?.content ?? "No summary";
    const out = path.join(this.convertedDir, `${baseName}-summary.txt`);
    await fs.writeFile(out, summary);
    return out;
  }

  // Extract tables using AI (returns raw model output)
  async extractTablesAI(pdfPath: string) {
    const text = await this.extractPdfText(pdfPath);

    if (text === "No text found (scanned PDF?)") {
      throw new Error("Cannot extract tables: No text found in PDF. This might be a scanned document.");
    }

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: "Extract all tabular data from the following text. Return in JSON format:\n\n" + text,
        },
      ],
    });
    return response.choices?.[0]?.message?.content ?? "";
  }
}

const converter = new DocumentConverter();
export default converter;
