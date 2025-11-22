import { PDFDocument } from "pdf-lib";
import fs from "fs/promises";
import { createRequire } from "module";
import { promisify } from "node:util";

const require = createRequire(import.meta.url);
const libre = require("libreoffice-convert");
libre.convertAsync = promisify(libre.convert);

async function test() {
    // Create sample PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    page.drawText('Hello World!');
    const pdfBytes = await pdfDoc.save();
    await fs.writeFile("test.pdf", pdfBytes);

    console.log("Created test.pdf");

    try {
        const pdfBuf = await fs.readFile("test.pdf");
        const jpgBuf = await libre.convertAsync(pdfBuf, ".jpg", undefined);
        await fs.writeFile("test.jpg", jpgBuf);
        console.log("Converted to test.jpg");
    } catch (e) {
        console.error("Conversion failed:", e);
    }
}

test();
