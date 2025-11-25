import libre from 'libreoffice-convert';
import fs from 'fs';
import { promisify } from 'util';

const convertAsync = promisify(libre.convert);

(async () => {
    try {
        const buf = fs.readFileSync('test.pdf');

        console.log('--- Testing "docx" ---');
        try {
            await convertAsync(buf, 'docx', undefined);
            console.log('Success with "docx"');
        } catch (e: any) {
            console.log('Error with "docx":', e.message);
        }

        console.log('--- Testing ".docx" ---');
        try {
            await convertAsync(buf, '.docx', undefined);
            console.log('Success with ".docx"');
        } catch (e: any) {
            console.log('Error with ".docx":', e.message);
        }
    } catch (e) {
        console.error('Test failed:', e);
    }
})();
