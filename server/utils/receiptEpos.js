// Builds the Epson ePOS-Print XML for a customer receipt, plus the Server Direct Print wrapper the
// printer expects back from its polling request. This is the thermal-printer twin of receiptHtml()
// in public/js/admin.js — same content, but laid out as fixed-width text lines because the printer
// is sent commands, not a web page.

// Characters per line. 42 is safe on an 80mm roll (Font A is up to 48 wide on a TM-m30II) and leaves a
// little margin; use 32 for 58mm paper. Override with RECEIPT_COLUMNS if the layout looks off.
const COLUMNS = Number(process.env.RECEIPT_COLUMNS) || 42;
// If the £ sign ever prints as a wrong character on the paper, set RECEIPT_CURRENCY=GBP.
const CURRENCY = process.env.RECEIPT_CURRENCY || '£';

function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Printers only know a limited character set — anything outside Latin-1 (emoji, other scripts, smart
// quotes pasted into notes) is swapped for "?" so a customer's note can never break a ticket.
function clean(value) {
  return String(value == null ? '' : value)
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[^ -ÿ]/g, '?')
    .trim();
}

function money(n) {
  return `${CURRENCY}${Number(n || 0).toFixed(2)}`;
}

function wrap(text, width) {
  const words = clean(text).split(' ').filter(Boolean);
  const lines = [];
  let current = '';
  for (const word of words) {
    let w = word;
    while (w.length > width) {
      if (current) {
        lines.push(current);
        current = '';
      }
      lines.push(w.slice(0, width));
      w = w.slice(width);
    }
    if (!current) current = w;
    else if (current.length + 1 + w.length <= width) current += ` ${w}`;
    else {
      lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function row(left, right, width = COLUMNS) {
  const r = clean(right);
  const leftLines = wrap(left, Math.max(8, width - r.length - 1));
  const out = [];
  leftLines.forEach((l, i) => {
    if (i === leftLines.length - 1) out.push(l + ' '.repeat(Math.max(1, width - l.length - r.length)) + r);
    else out.push(l);
  });
  return out;
}

function buildReceiptEposXml(order) {
  const parts = [];
  const add = (xml) => parts.push(xml);
  const text = (t) => add(`<text>${esc(t)}&#10;</text>`);
  const lines = (arr) => arr.forEach(text);
  const divider = () => text('-'.repeat(COLUMNS));
  const align = (a) => add(`<text align="${a}"/>`);
  const size = (w, h, bold) => add(`<text width="${w}" height="${h}" em="${bold ? 'true' : 'false'}"/>`);

  const isPaid = order.paymentStatus === 'Paid';
  const when = new Date(order.createdAt || Date.now()).toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/London',
  });

  add('<text lang="en"/>');
  add('<text smooth="true"/>');

  align('center');
  size(2, 2, true);
  text("BUN 'N DOUGH");
  size(1, 1, false);
  text('Pizza . Burger . Grill');

  align('left');
  text('');
  size(1, 1, true);
  text('ORDER RECEIPT');
  size(1, 1, false);
  text(`#${clean(order.orderNumber)}`);
  text(when);
  if (order.branch) text(`${clean(order.branch)} branch`);
  size(1, 1, true);
  text(`${isPaid ? 'Amount Paid' : 'Amount Due'}: ${money(order.total)}`);
  size(1, 1, false);
  divider();

  text('CUSTOMER');
  lines(wrap(`Name: ${order.customerName}`, COLUMNS));
  lines(wrap(`Phone: ${order.phone}`, COLUMNS));
  if (order.email) lines(wrap(`Email: ${order.email}`, COLUMNS));
  divider();

  size(1, 1, true);
  text(String(order.orderType || '').toUpperCase());
  size(1, 1, false);
  if (order.orderType === 'Delivery') {
    lines(wrap(`Address: ${order.address}`, COLUMNS));
    lines(wrap(`City: ${order.city}`, COLUMNS));
    if (order.postcode) lines(wrap(`Postcode: ${order.postcode}`, COLUMNS));
  } else {
    text('Collection');
  }
  divider();

  text('ITEMS');
  (order.items || []).forEach((item, index) => {
    if (index > 0) text('');
    const variant = item.variantLabel && item.variantLabel !== 'Regular' ? ` (${item.variantLabel})` : '';
    size(1, 1, true);
    lines(row(`${item.quantity}x ${clean(item.name)}${variant}`, money(item.price * item.quantity)));
    size(1, 1, false);

    if (item.selectedGroups && item.selectedGroups.length) {
      item.selectedGroups.forEach((g) => {
        wrap(`${g.label}: ${(g.choices || []).join(', ')}`, COLUMNS - 2).forEach((l) => text(`  ${l}`));
      });
    } else if (item.selectedOptions && item.selectedOptions.length) {
      item.selectedOptions.forEach((o) => {
        wrap(`- ${o}`, COLUMNS - 2).forEach((l) => text(`  ${l}`));
      });
    }
    if (item.quantity > 1) text(`  ${item.quantity} @ ${money(item.price)} each`);
  });
  divider();

  lines(row('Subtotal', money(order.subtotal)));
  if (order.discount > 0) lines(row('Online discount', `-${money(order.discount)}`));
  if (order.deliveryFee > 0) lines(row('Delivery fee', money(order.deliveryFee)));
  size(2, 2, true);
  lines(row('TOTAL', money(order.total), Math.floor(COLUMNS / 2)));
  size(1, 1, false);

  if (order.notes) {
    text('');
    divider();
    size(1, 1, true);
    text('SPECIAL INSTRUCTIONS');
    size(1, 1, false);
    lines(wrap(order.notes, COLUMNS));
  }

  divider();
  align('center');
  text("BUN 'N DOUGH");
  align('left');
  add('<feed line="3"/>');
  add('<cut type="feed"/>');

  return parts.join('\n');
}

// Server Direct Print reply to the printer's "any jobs?" poll.
function buildPrintRequest(order) {
  return `<?xml version="1.0" encoding="utf-8"?>
<PrintRequestInfo>
<ePOSPrint>
<Parameter>
<devid>local_printer</devid>
<timeout>10000</timeout>
</Parameter>
<PrintData>
<epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">
${buildReceiptEposXml(order)}
</epos-print>
</PrintData>
</ePOSPrint>
</PrintRequestInfo>`;
}

module.exports = { buildReceiptEposXml, buildPrintRequest };
