import { PDFDocument } from "pdf-lib";
import { writeFile, readFile } from "fs/promises";

/**
 * For this example I know the acknowledgement & citations
 * are on pages 10-18 so I can hard code this.
 */
export const modifyPdf = async (filePath: string) => {
  const pageNumsToDelete = [10, 11, 12, 13, 14, 15, 16, 17, 18];
  const existingPdfBytes = await readFile(filePath);
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  for (let i = 0; i < pageNumsToDelete.length; i += 1) {
    const pageCount = pdfDoc.getPageCount();
    pdfDoc.removePage(pageCount - 1);
  }
  const pdfBytes2 = await pdfDoc.save();
  await writeFile(filePath, pdfBytes2, "binary");
};
