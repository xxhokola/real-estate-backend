// src/utils/convertDocxToPdf.js
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs-extra';

export const convertDocxToPdf = (inputPath) => {
  return new Promise((resolve, reject) => {
    const outputDir = path.dirname(inputPath);

    exec(`libreoffice --headless --convert-to pdf "${inputPath}" --outdir "${outputDir}"`, (error) => {
      if (error) {
        console.error('❌ LibreOffice conversion failed:', error);
        return reject(new Error('PDF conversion failed'));
      }

      const outputPath = inputPath.replace(/\.docx$/, '.pdf');
      if (!fs.existsSync(outputPath)) {
        return reject(new Error('PDF output not found'));
      }

      resolve(outputPath);
    });
  });
};