import QRCode from 'qrcode';

/**
 * Generate standard NPCI dynamic UPI QR Code URL/Data URL
 * @param {Object} params
 * @param {string} params.upiId - e.g. "kwikstore@upi"
 * @param {string} params.name - e.g. "KwikStore Enterprises"
 * @param {number} params.amount - e.g. 1450.00
 * @param {string} params.invoiceNumber - e.g. "KS-DEL-2026-0001"
 */
export async function generateUpiQrDataUrl({ upiId, name, amount, invoiceNumber }) {
  if (!upiId) return null;

  const cleanName = encodeURIComponent(name || 'Shop Pay');
  const cleanAmount = parseFloat(amount || 0).toFixed(2);
  const note = encodeURIComponent(`Bill ${invoiceNumber || 'POS'}`);

  // Standard NPCI UPI URI Scheme
  const upiString = `upi://pay?pa=${upiId}&pn=${cleanName}&am=${cleanAmount}&cu=INR&tn=${note}`;

  try {
    const dataUrl = await QRCode.toDataURL(upiString, {
      width: 200,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });
    return dataUrl;
  } catch (err) {
    console.error('Error generating UPI QR:', err);
    return null;
  }
}
