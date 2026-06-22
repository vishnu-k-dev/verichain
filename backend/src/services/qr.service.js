import QRCode from "qrcode";

const QR_OPTIONS = {
  errorCorrectionLevel: "H",
  width: 400,
  margin: 2,
  color: { dark: "#0F172A", light: "#FFFFFF" },
};

/**
 * Generate a QR code as a PNG Buffer (400x400, error correction level H).
 * @param {string} url
 * @returns {Promise<Buffer>}
 */
export async function generateQRBuffer(url) {
  return QRCode.toBuffer(url, { ...QR_OPTIONS, type: "png" });
}

/**
 * Generate a QR code as a base64 data URL — handy for embedding directly in
 * JSON responses and rendering in the frontend without another request.
 * @param {string} url
 * @returns {Promise<string>}
 */
export async function generateQRDataUrl(url) {
  return QRCode.toDataURL(url, QR_OPTIONS);
}

export default { generateQRBuffer, generateQRDataUrl };
