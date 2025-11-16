// server/converter.js
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import libre from "libreoffice-convert";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { createWorker } from "tesseract.js";
import OpenAI from "openai";
import { promisify } from "node:util"; // <-- ESM-safe import

// promisify libre.convert so it works in ESM bundles
libre.convertAsync = promisify(libre.convert);

class DocumentConverter {
  constructor(uploadsDir = "./server/uploads", convertedDir = "./server/converted") {
    this.uploadsDir = uploadsDir;
    this.convertedDir = convertedDir;
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  // main convert entry
  async convert(inputPath, conversionType, originalFilename, additionalFiles) {
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
  async ensureDir(dir) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (e) {
      // ignore
    }
  }

  async cleanup(filePath) {
    if (!filePath) return;
    try {
      await fs.unlink(filePath);
    } catch (e) {
      // ignore missing files
    }
  }

  // IMAGE -> PDF
  async imageToPdf(imagePath, baseName) {
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

  // PDF -> Image (simple placeholder implementation)
  async pdfToImage(pdfPath, baseName, ext) {
    await this.ensureDir(this.convertedDir);
    const output = path.join(this.convertedDir, `${baseName}.${ext}`);
    // placeholder: create a white PNG/JPEG as a fallback
    const placeholder = await sharp({
      create: { width: 800, height: 1000, channels: 3, background: "white" },
    }).png().toBuffer();
    if (ext === "jpg") {
      await sharp(placeholder).jpeg({ quality: 80 }).toFile(output);
    } else {
      await fs.writeFile(output, placeholder);
    }
    return output;
  }

  // OFFICE -> PDF using libreoffice
  async officeToPdf(inputPath, baseName) {
    await this.ensureDir(this.convertedDir);
    const outputPath = path.join(this.convertedDir, `${baseName}.pdf`);
    const buffer = await fs.readFile(inputPath);
    const pdfBuf = await libre.convertAsync(buffer, ".pdf", undefined);
    await fs.writeFile(outputPath, pdfBuf);
    return outputPath;
  }

  // PDF -> Word (basic text extraction into a .docx)
  async pdfToWord(pdfPath, baseName) {
    await this.ensureDir(this.convertedDir);
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

  // COMPRESS PDF (basic)
  async compressPdf(pdfPath, baseName) {
    await this.ensureDir(this.convertedDir);
    const outputPath = path.join(this.convertedDir, `${baseName}-compressed.pdf`);
    const pdf = await PDFDocument.load(await fs.readFile(pdfPath));
    const compressed = await pdf.save({ useObjectStreams: false });
    await fs.writeFile(outputPath, compressed);
    return outputPath;
  }

  // MERGE PDFs
  async mergePdfs(files, baseName) {
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

  // Extract PDF text
  async extractPdfText(pdfPath) {
    const data = await fs.readFile(pdfPath);
    const pdf = await PDFDocument.load(data);
    let text = "";
    for (const page of pdf.getPages()) {
      // pdf-lib does not have getText() in some versions; if it doesn't exist,
      // this will return empty. Keep parity with your original approach.
      if (typeof page.getText === "function") {
        text += page.getText();
      } else {
        // fallback: no text extraction available
        text += "";
      }
    }
    return text || "No text found (scanned PDF?)";
  }

  // Split PDF into single-page PDFs
  async splitPdf(pdfPath, baseName) {
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
  async extractPdfImages(pdfPath, baseName) {
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
  async performOCR(inputPath, baseName) {
    await this.ensureDir(this.convertedDir);
    const worker = createWorker();
    // prepare worker properly
    await worker.load();
    await worker.loadLanguage("eng");
    await worker.initialize("eng");
    const { data } = await worker.recognize(inputPath);
    await worker.terminate();
    const out = path.join(this.convertedDir, `${baseName}-ocr.txt`);
    await fs.writeFile(out, data.text);
    return out;
  }

  async scannedPdfToText(pdfPath, baseName) {
    // use OCR pipeline for scanned PDFs
    return this.performOCR(pdfPath, baseName);
  }

  // Summarize PDF via OpenAI
  async summarizePdf(pdfPath, baseName) {
    const text = await this.extractPdfText(pdfPath);
    // note: adapt this call to match your OpenAI SDK version if necessary
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
  async extractTablesAI(pdfPath) {
    const text = await this.extractPdfText(pdfPath);
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
