import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import libre from 'libreoffice-convert';
import { promisify } from 'util';

const convertAsync = promisify(libre.convert);

(async () => {
    try {
        // Create a new PDFDocument
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage();
        page.drawText('Hello World!');
        const pdfBytes = await pdfDoc.save();
        fs.writeFileSync('test_gen.pdf', pdfBytes);
        console.log('Created test_gen.pdf');

        const buf = Buffer.from(pdfBytes);

        console.log('--- Testing "docx" ---');
        try {
            const res = await convertAsync(buf, 'docx', undefined);
            console.log('Success with "docx". Output size:', res.length);
        } catch (e: any) {
            console.log('Error with "docx":', e.message);
        }

        console.log('--- Testing ".docx" ---');
        try {
            const res = await convertAsync(buf, '.docx', undefined);
            console.log('Success with ".docx". Output size:', res.length);
        } catch (e: any) {
            console.log('Error with ".docx":', e.message);
        }
    } catch (e) {
        console.error('Test failed:', e);
    }
})();
