import { PDFDocument, StandardFonts } from "pdf-lib";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import libre from "libreoffice-convert";
import mammoth from "mammoth";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { createWorker } from "tesseract.js";
import OpenAI from "openai";

libre.convertAsync = require("util").promisify(libre.convert);

export type ConversionType =
  | "jpg-to-pdf"
  | "png-to-pdf"
  | "pdf-to-jpg"
  | "pdf-to-png"
  | "pdf-to-word"
  | "word-to-pdf"
  | "excel-to-pdf"
  | "ppt-to-pdf"
  | "pdf-compress"
  | "pdf-merge"
  | "pdf-text"
  | "pdf-split"
  | "pdf-images"
  | "ocr"
  | "pdf-summary"
  | "pdf-editable-text"
  | "pdf-table-extract";

export class DocumentConverter {
  private uploadsDir: string;
  private convertedDir: string;

  private openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  constructor(uploadsDir = "./server/uploads", convertedDir = "./server/converted") {
    this.uploadsDir = uploadsDir;
    this.convertedDir = convertedDir;
  }

  async convert(
    inputPath: string,
    conversionType: ConversionType,
    originalFilename: string,
    additionalFiles?: string[]
  ): Promise<string | string[]> {
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
        return await this.mergePdfs([inputPath, ...(additionalFiles || [])], baseName);

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
  private async imageToPdf(imagePath: string, baseName: string): Promise<string> {
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
  private async pdfToImage(pdfPath: string, baseName: string, ext: "jpg" | "png"): Promise<string> {
    const output = path.join(this.convertedDir, `${baseName}.${ext}`);

    // Placeholder version (replace with pdf-poppler if desired)
    const placeholder = await sharp({
      create: { width: 800, height: 1000, channels: 3, background: "white" },
    })
      .png()
      .toBuffer();

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
  private async officeToPdf(inputPath: string, baseName: string): Promise<string> {
    const outputPath = path.join(this.convertedDir, `${baseName}.pdf`);
    const buffer = await fs.readFile(inputPath);

    const pdfBuf = await libre.convertAsync(buffer, ".pdf", undefined);
    await fs.writeFile(outputPath, pdfBuf);

    return outputPath;
  }

  // -----------------------------------------------------------
  // PDF → Word
  // -----------------------------------------------------------
  private async pdfToWord(pdfPath: string, baseName: string): Promise<string> {
    const outputPath = path.join(this.convertedDir, `${baseName}.docx`);

    const text = await this.extractPdfText(pdfPath);

    const doc = new Document({
      sections: [
        {
          children: [new Paragraph({ children: [new TextRun({ text, size: 22 })] })],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    await fs.writeFile(outputPath, buffer);

    return outputPath;
  }

  // -----------------------------------------------------------
  // COMPRESS PDF
  // -----------------------------------------------------------
  private async compressPdf(pdfPath: string, baseName: string): Promise<string> {
    const outputPath = path.join(this.convertedDir, `${baseName}-compressed.pdf`);

    const pdf = await PDFDocument.load(await fs.readFile(pdfPath));
    const compressed = await pdf.save({ useObjectStreams: false });

    await fs.writeFile(outputPath, compressed);
    return outputPath;
  }

  // -----------------------------------------------------------
  // MERGE PDFs
  // -----------------------------------------------------------
  private async mergePdfs(files: string[], baseName: string): Promise<string> {
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
  private async extractPdfText(pdfPath: string): Promise<string> {
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
  private async splitPdf(pdfPath: string, baseName: string): Promise<string[]> {
    const pdf = await PDFDocument.load(await fs.readFile(pdfPath));

    const files: string[] = [];

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
  private async extractPdfImages(pdfPath: string, baseName: string): Promise<string[]> {
    const pdf = await PDFDocument.load(await fs.readFile(pdfPath));

    const outFiles: string[] = [];
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
  private async performOCR(inputPath: string, baseName: string): Promise<string> {
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
  private async summarizePdf(pdfPath: string, baseName: string): Promise<string> {
    const text = await this.extractPdfText(pdfPath);

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: `Summarize this document:\n${text}` }],
    });

    const summary = response.choices[0].message.content;
    const out = path.join(this.convertedDir, `${baseName}-summary.txt`);

    await fs.writeFile(out, summary);

    return out;
  }

  // -----------------------------------------------------------
  // Convert scanned PDF to editable text (OCR + formatting)
  // -----------------------------------------------------------
  private async scannedPdfToText(pdfPath: string, baseName: string): Promise<string> {
    const text = await this.performOCR(pdfPath, baseName);

    return text;
  }

  // -----------------------------------------------------------
  // Extract tables using AI
  // -----------------------------------------------------------
  private async extractTablesAI(pdfPath: string): Promise<string> {
    const text = await this.extractPdfText(pdfPath);

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content:
            "Extract all tabular data from the following text. Return in JSON format:\n\n" +
            text,
        },
      ],
    });

    return response.choices[0].message.content;
  }
}

export const converter = new DocumentConverter();
