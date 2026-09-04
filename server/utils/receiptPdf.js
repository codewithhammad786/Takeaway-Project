const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const RECEIPTS_DIR = path.join(__dirname, '..', 'uploads', 'receipts');
fs.mkdirSync(RECEIPTS_DIR, { recursive: true });

const GOLD = '#e6ac00';
const DARK = '#262220';
const MUTED = '#6b6358';
const GREEN = '#1e7b34';
const RED = '#b3261e';

function money(n) {
  return `£${Number(n).toFixed(2)}`;
}

// Renders the same information as the admin dashboard's printable receipt, but as an actual PDF
// file (rather than an HTML page) so it can be attached to a WhatsApp message — Twilio's WhatsApp
// API needs a real file it can fetch by URL, not a screen-only HTML document.
function generateReceiptPdf(order) {
  return new Promise((resolve, reject) => {
    const filename = `${order._id}-${Date.now()}.pdf`;
    const filePath = path.join(RECEIPTS_DIR, filename);
    const doc = new PDFDocument({ size: 'A5', margin: 36 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const isPaid = order.paymentStatus === 'Paid';

    // Header
    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(18).text("Bun 'n Dough", { continued: false });
    doc.font('Helvetica').fontSize(9).fillColor(MUTED).text('Pizza · Burger · Grill');
    doc.moveDown(0.6);
    doc.moveTo(36, doc.y).lineTo(doc.page.width - 36, doc.y).strokeColor(GOLD).lineWidth(2).stroke();
    doc.moveDown(0.8);

    doc.fillColor(DARK).font('Helvetica-Bold').fontSize(12).text(`Order #${order.orderNumber}`);
    doc.font('Helvetica').fontSize(9).fillColor(MUTED).text(
      new Date(order.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
    );
    if (order.branch) {
      doc.font('Helvetica-Bold').fontSize(9).fillColor(GOLD).text(`${order.branch} branch`);
    }
    // Standard PDF fonts don't include a ✓ glyph (outside WinAnsiEncoding), so this stays plain text.
    doc.font('Helvetica-Bold').fontSize(10).fillColor(isPaid ? GREEN : RED).text(isPaid ? 'PAID' : 'NOT PAID');
    doc.moveDown(0.8);

    // Customer / order info
    doc.font('Helvetica-Bold').fontSize(9).fillColor(GOLD).text('CUSTOMER');
    doc.font('Helvetica').fontSize(10).fillColor(DARK).text(order.customerName);
    doc.fontSize(9).fillColor(MUTED).text(`Phone: ${order.phone}`);
    if (order.email) doc.text(`Email: ${order.email}`);
    doc.moveDown(0.5);

    doc.font('Helvetica-Bold').fontSize(9).fillColor(GOLD).text(order.orderType.toUpperCase());
    doc.font('Helvetica').fontSize(9).fillColor(DARK);
    if (order.orderType === 'Delivery') {
      doc.text(`${order.address}, ${order.city}${order.postcode ? ' ' + order.postcode : ''}`);
    } else {
      doc.text('Collection in-store');
    }
    doc.fillColor(MUTED).text(`Kitchen status: ${order.status}`);
    doc.moveDown(0.8);

    doc.moveTo(36, doc.y).lineTo(doc.page.width - 36, doc.y).strokeColor('#e0dccb').lineWidth(1).stroke();
    doc.moveDown(0.6);

    // Items
    order.items.forEach((item) => {
      const variant = item.variantLabel && item.variantLabel !== 'Regular' ? ` (${item.variantLabel})` : '';
      const lineTotal = money(item.price * item.quantity);
      const nameWidth = doc.page.width - 36 - 36 - 60;

      const startY = doc.y;
      doc.font('Helvetica-Bold').fontSize(10).fillColor(DARK).text(`${item.quantity}x ${item.name}${variant}`, 36, startY, { width: nameWidth });
      doc.font('Helvetica-Bold').fontSize(10).fillColor(DARK).text(lineTotal, doc.page.width - 36 - 60, startY, { width: 60, align: 'right' });
      doc.moveDown(0.1);

      if (item.selectedGroups && item.selectedGroups.length) {
        item.selectedGroups.forEach((g) => {
          doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED).text(`${g.label}: `, 36, doc.y, { continued: true, width: nameWidth });
          doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(g.choices.join(', '));
        });
      } else if (item.selectedOptions && item.selectedOptions.length) {
        doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(item.selectedOptions.join(', '), { width: nameWidth });
      }
      doc.moveDown(0.4);
    });

    doc.moveTo(36, doc.y).lineTo(doc.page.width - 36, doc.y).strokeColor('#e0dccb').lineWidth(1).stroke();
    doc.moveDown(0.6);

    // Summary
    function summaryRow(label, value, opts = {}) {
      const y = doc.y;
      doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(opts.bold ? 11 : 9.5).fillColor(opts.color || DARK);
      doc.text(label, 36, y, { width: 200 });
      doc.text(value, doc.page.width - 36 - 100, y, { width: 100, align: 'right' });
      doc.moveDown(opts.bold ? 0.3 : 0.15);
    }

    summaryRow('Subtotal', money(order.subtotal));
    if (order.discount > 0) summaryRow('Online discount', `-${money(order.discount)}`, { color: GREEN });
    if (order.deliveryFee > 0) summaryRow('Delivery fee', money(order.deliveryFee));
    doc.moveDown(0.15);
    summaryRow('Total', money(order.total), { bold: true });

    if (order.notes) {
      doc.moveDown(0.6);
      doc.font('Helvetica-Bold').fontSize(9).fillColor(GOLD).text('SPECIAL INSTRUCTIONS');
      doc.font('Helvetica-Oblique').fontSize(9.5).fillColor(DARK).text(order.notes);
    }

    doc.moveDown(1);
    doc.moveTo(36, doc.y).lineTo(doc.page.width - 36, doc.y).strokeColor(GOLD).lineWidth(2).stroke();
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(DARK).text('Thank you for your order!', { align: 'center' });
    doc.font('Helvetica').fontSize(8).fillColor(MUTED).text("Bun 'n Dough — 40 Horse Fair, Birmingham B1 1DA", { align: 'center' });
    doc.text('0121 448 4142 · info@bunndough.com', { align: 'center' });

    doc.end();

    stream.on('finish', () => resolve({ filePath, publicPath: `/uploads/receipts/${filename}` }));
    stream.on('error', reject);
  });
}

module.exports = { generateReceiptPdf };
