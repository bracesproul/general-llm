import { PDFDocument } from 'pdf-lib';

export const deletePagesFromPdf = async (
  pdf: Buffer,
  pagesToDelete: number[]
): Promise<Buffer> => {
  const pdfDoc = await PDFDocument.load(pdf);
  let numToOffsetBy = 1;
  for (const pageNumber of pagesToDelete) {
    pdfDoc.removePage(pageNumber - numToOffsetBy);
    numToOffsetBy += 1;
  }
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
};
