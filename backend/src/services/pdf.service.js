import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

/**
 * Stamp a QR code onto the bottom-right of the last page of a PDF, with a
 * "Scan to Verify" caption above it. Returns a NEW PDF buffer; the original is
 * left untouched (its hash is what we anchored on-chain).
 *
 * @param {Buffer} pdfBuffer    Original PDF bytes.
 * @param {Buffer} qrPngBuffer  QR code PNG bytes.
 * @returns {Promise<Buffer>}   QR-stamped PDF bytes.
 */
export async function stampQRCode(pdfBuffer, qrPngBuffer) {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const qrImage = await pdfDoc.embedPng(qrPngBuffer);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pages = pdfDoc.getPages();
  const lastPage = pages[pages.length - 1];
  const { width } = lastPage.getSize();

  const qrSize = 80;
  const margin = 24;
  const x = width - qrSize - margin;
  const y = margin;

  // White card behind the QR so it stays scannable over any background.
  lastPage.drawRectangle({
    x: x - 8,
    y: y - 8,
    width: qrSize + 16,
    height: qrSize + 28,
    color: rgb(1, 1, 1),
    borderColor: rgb(0.06, 0.09, 0.16),
    borderWidth: 1,
    opacity: 1,
  });

  lastPage.drawImage(qrImage, { x, y, width: qrSize, height: qrSize });

  lastPage.drawText("Scan to Verify", {
    x: x - 4,
    y: y + qrSize + 6,
    size: 8,
    font,
    color: rgb(0.06, 0.09, 0.16),
  });

  const stamped = await pdfDoc.save();
  return Buffer.from(stamped);
}

export default { stampQRCode };
