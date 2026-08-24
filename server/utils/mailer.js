const nodemailer = require('nodemailer');

let transporter;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }

  const port = Number(process.env.SMTP_PORT) || 587;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

async function sendMail({ to, subject, html, text }) {
  const t = getTransporter();
  if (!t) {
    throw new Error('Email is not configured on the server (missing SMTP_HOST/SMTP_USER/SMTP_PASS)');
  }

  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;
  await t.sendMail({ from: `Bun 'n Dough <${fromAddress}>`, to, subject, html, text });
}

module.exports = { sendMail, getTransporter };
