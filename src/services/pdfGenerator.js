import fs from 'fs-extra';
import path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export const generateSignedLeasePDF = async ({ leaseId, tenantName, approvalDate }) => {
  const templatePath = path.join('templates', 'standard_lease.pdf');
  const outputPath = path.join('signed-leases', `lease_${leaseId}.pdf`);

  try {
    const templateBytes = await fs.readFile(templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes);

    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const signatureY = 100;

    firstPage.drawText(`Signed by: ${tenantName}`, {
      x: 50,
      y: signatureY,
      size: 12,
      font,
      color: rgb(0, 0, 0),
    });

    firstPage.drawText(`Date: ${approvalDate}`, {
      x: 50,
      y: signatureY - 20,
      size: 12,
      font,
      color: rgb(0, 0, 0),
    });

    const pdfBytes = await pdfDoc.save();
    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeFile(outputPath, pdfBytes);

    return outputPath;
  } catch (err) {
    console.error('PDF generation failed:', err);
    throw new Error('Failed to generate signed lease PDF');
  }
};