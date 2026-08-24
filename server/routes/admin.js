const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const Review = require('../models/Review');
const Admin = require('../models/Admin');
const User = require('../models/User');
const requireAdmin = require('../middleware/requireAdmin');
const upload = require('../middleware/upload');
const { sendMail } = require('../utils/mailer');
const {
  signAdminSessionToken,
  signPendingTwoFactorToken,
  verifyPendingTwoFactorToken,
} = require('../utils/adminAuth');

const router = express.Router();

const ORDER_STATUSES = ['Pending', 'Preparing', 'Out for Delivery', 'Ready for Pickup', 'Completed'];
const SALT_ROUNDS = 10;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

function round2(n) {
  return Math.round(n * 100) / 100;
}

// Slows down both credential-stuffing (password) and code-guessing (2FA) attacks at the network
// level, on top of the account-level lockout below — two independent layers, either one blocks it.
const adminAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts from this network. Please wait and try again later.' },
});

function minutesUntil(date) {
  return Math.max(1, Math.ceil((date.getTime() - Date.now()) / 60000));
}

// POST /api/admin/login — step 1 of 2. Checks the password and account lockout, then hands back
// either a "set up 2FA" or "enter your code" response — never a full session token from here.
router.post('/login', adminAuthLimiter, async (req, res, next) => {
  try {
    const { password } = req.body;

    if (!process.env.ADMIN_SESSION_SECRET) {
      return res.status(500).json({
        message: 'Admin login is not configured on the server (missing ADMIN_SESSION_SECRET in .env)',
      });
    }

    const admin = await Admin.findOne();
    if (!admin) {
      return res.status(500).json({
        message: 'No manager account exists yet — set ADMIN_PASSWORD in .env and restart the server once to create it.',
      });
    }

    if (admin.lockedUntil && admin.lockedUntil > new Date()) {
      return res.status(423).json({
        message: `Too many failed attempts. Try again in ${minutesUntil(admin.lockedUntil)} minute(s).`,
      });
    }

    const match = await bcrypt.compare(password || '', admin.passwordHash);
    if (!match) {
      admin.failedLoginAttempts = (admin.failedLoginAttempts || 0) + 1;
      if (admin.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        admin.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
        admin.failedLoginAttempts = 0;
        await admin.save();
        return res.status(423).json({
          message: `Too many failed attempts. Locked for ${LOCKOUT_MINUTES} minutes.`,
        });
      }
      await admin.save();
      const remaining = MAX_FAILED_ATTEMPTS - admin.failedLoginAttempts;
      return res.status(401).json({ message: `Incorrect password (${remaining} attempt(s) before lockout)` });
    }

    admin.failedLoginAttempts = 0;
    admin.lockedUntil = undefined;

    const tempToken = signPendingTwoFactorToken();

    if (!admin.twoFactorEnabled) {
      const secret = authenticator.generateSecret();
      admin.twoFactorSecret = secret;
      await admin.save();

      const otpauth = authenticator.keyuri('Manager', "Bun 'n Dough", secret);
      const qrCode = await QRCode.toDataURL(otpauth);

      return res.json({ requiresSetup: true, qrCode, secret, tempToken });
    }

    await admin.save();
    res.json({ requiresTwoFactor: true, tempToken });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/verify-2fa — step 2 of 2. Checks the authenticator code against the secret (and,
// on first-time setup, permanently enables 2FA the moment the first code checks out) before issuing
// the real session token.
router.post('/verify-2fa', adminAuthLimiter, async (req, res, next) => {
  try {
    const { tempToken, code } = req.body;

    let decoded;
    try {
      decoded = verifyPendingTwoFactorToken(tempToken || '');
    } catch (err) {
      return res.status(401).json({ message: 'Your session expired — please log in again.' });
    }
    void decoded;

    const admin = await Admin.findOne();
    if (!admin || !admin.twoFactorSecret) {
      return res.status(400).json({ message: 'Two-factor setup was not started — please log in again.' });
    }

    const valid = code && authenticator.verify({ token: code.trim(), secret: admin.twoFactorSecret });
    if (!valid) {
      return res.status(401).json({ message: 'Incorrect verification code' });
    }

    if (!admin.twoFactorEnabled) {
      admin.twoFactorEnabled = true;
      await admin.save();
    }

    res.json({ token: signAdminSessionToken() });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/settings/2fa/reset — for when the manager loses their authenticator device.
// Requires the current password; clears the old secret so the next login re-runs QR setup.
router.patch('/settings/2fa/reset', requireAdmin, async (req, res, next) => {
  try {
    const { currentPassword } = req.body;

    const admin = await Admin.findOne();
    if (!admin) {
      return res.status(500).json({ message: 'No manager account exists yet' });
    }

    const match = await bcrypt.compare(currentPassword || '', admin.passwordHash);
    if (!match) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    admin.twoFactorEnabled = false;
    admin.twoFactorSecret = undefined;
    await admin.save();

    res.json({ message: 'Two-factor authentication has been reset. You will set it up again on your next login.' });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/settings/password — change the manager login password
router.patch('/settings/password', requireAdmin, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const admin = await Admin.findOne();
    if (!admin) {
      return res.status(500).json({ message: 'No manager account exists yet' });
    }

    const match = await bcrypt.compare(currentPassword || '', admin.passwordHash);
    if (!match) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    admin.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await admin.save();

    res.json({ message: 'Password updated' });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/orders
router.get('/orders', requireAdmin, async (req, res, next) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).limit(200);
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/orders/:id/status
router.patch('/orders/:id/status', requireAdmin, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/orders/:id — lets the manager remove an order (e.g. a stray test order, or a
// mistaken/duplicate one) from the dashboard entirely. Unlike the customer-facing delete route,
// this isn't limited to unpaid orders — it's a manager action, not a self-service cancellation.
router.delete('/orders/:id', requireAdmin, async (req, res, next) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({ message: 'Order deleted' });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/menu — list every menu item (including unavailable) for the image manager
router.get('/menu', requireAdmin, async (req, res, next) => {
  try {
    const items = await MenuItem.find().sort({ category: 1, name: 1 });
    res.json(items);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/menu/:id/image — upload/replace a menu item's photo
router.post('/menu/:id/image', requireAdmin, (req, res, next) => {
  upload.single('image')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || 'Upload failed' });
    }
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No image file was uploaded' });
      }

      const item = await MenuItem.findById(req.params.id);
      if (!item) {
        fs.unlink(req.file.path, () => {});
        return res.status(404).json({ message: 'Menu item not found' });
      }

      const previousImage = item.image;
      item.image = `/uploads/menu-images/${req.file.filename}`;
      await item.save();

      // Clean up the old file if it was a previous upload (not a stock/external URL)
      if (previousImage && previousImage.startsWith('/uploads/menu-images/')) {
        const oldPath = path.join(__dirname, '..', previousImage);
        fs.unlink(oldPath, () => {});
      }

      res.json(item);
    } catch (err2) {
      next(err2);
    }
  });
});

// DELETE /api/admin/menu/:id — permanently removes a menu item (e.g. one being discontinued).
// Existing orders are unaffected since they store a denormalized copy of the item's name/price at
// the time it was ordered, not a live reference.
router.delete('/menu/:id', requireAdmin, async (req, res, next) => {
  try {
    const item = await MenuItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Menu item not found' });

    if (item.image && item.image.startsWith('/uploads/menu-images/')) {
      const imagePath = path.join(__dirname, '..', item.image);
      fs.unlink(imagePath, () => {});
    }

    res.json({ message: 'Menu item deleted' });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/reviews — list every review (pending + approved) for moderation
router.get('/reviews', requireAdmin, async (req, res, next) => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/reviews/:id/approve
router.patch('/reviews/:id/approve', requireAdmin, async (req, res, next) => {
  try {
    const review = await Review.findByIdAndUpdate(req.params.id, { approved: true }, { new: true });
    if (!review) return res.status(404).json({ message: 'Review not found' });
    res.json(review);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/reviews/:id
router.delete('/reviews/:id', requireAdmin, async (req, res, next) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/stats — earnings summary, last-7-days chart data, and top-selling items,
// all computed from real paid orders (nothing simulated or hardcoded).
router.get('/stats', requireAdmin, async (req, res, next) => {
  try {
    const paidOrders = await Order.find({ paymentStatus: 'Paid' }).sort({ createdAt: -1 });

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let todayTotal = 0;
    let weekTotal = 0;
    let monthTotal = 0;
    const dailyTotals = new Map();
    const itemTotals = new Map();

    for (const order of paidOrders) {
      const createdAt = order.createdAt;
      if (createdAt >= startOfToday) todayTotal += order.total;
      if (createdAt >= startOfWeek) weekTotal += order.total;
      if (createdAt >= startOfMonth) monthTotal += order.total;

      const dayKey = createdAt.toISOString().slice(0, 10);
      dailyTotals.set(dayKey, (dailyTotals.get(dayKey) || 0) + order.total);

      for (const item of order.items) {
        itemTotals.set(item.name, (itemTotals.get(item.name) || 0) + item.quantity);
      }
    }

    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(startOfToday);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      last7Days.push({ date: key, total: round2(dailyTotals.get(key) || 0) });
    }

    const topItems = Array.from(itemTotals.entries())
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    res.json({
      today: round2(todayTotal),
      thisWeek: round2(weekTotal),
      thisMonth: round2(monthTotal),
      totalPaidOrders: paidOrders.length,
      last7Days,
      topItems,
    });
  } catch (err) {
    next(err);
  }
});

function escapeHtmlServer(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildDealEmailHtml({ name, subject, message, orderUrl, unsubscribeUrl }) {
  const safeMessage = escapeHtmlServer(message).replace(/\n/g, '<br>');
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#fff8e7;font-family:'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:24px;">
    <div style="background:#121212;border-radius:16px 16px 0 0;padding:24px;text-align:center;">
      <span style="color:#ffc72c;font-size:1.4rem;font-weight:800;">🍔 Bun 'n Dough</span>
    </div>
    <div style="background:#ffffff;padding:28px 24px;border-radius:0 0 16px 16px;">
      <p style="margin:0 0 12px;color:#262220;">Hi ${escapeHtmlServer(name)},</p>
      <h2 style="color:#262220;margin:0 0 14px;">${escapeHtmlServer(subject)}</h2>
      <p style="color:#262220;line-height:1.6;margin:0 0 22px;">${safeMessage}</p>
      <div style="text-align:center;">
        <a href="${orderUrl}" style="display:inline-block;background:#ffc72c;color:#121212;font-weight:700;padding:12px 26px;border-radius:999px;text-decoration:none;">Order Now</a>
      </div>
    </div>
    <p style="text-align:center;color:#8a8a8a;font-size:0.78rem;margin-top:16px;">
      You're receiving this because you've ordered from Bun 'n Dough before.<br>
      <a href="${unsubscribeUrl}" style="color:#8a8a8a;">Unsubscribe from deal emails</a>
    </p>
  </div>
</body>
</html>`;
}

// GET /api/admin/campaigns/recipients-count — how many customers would receive a deal email right now.
router.get('/campaigns/recipients-count', requireAdmin, async (req, res, next) => {
  try {
    const count = await User.countDocuments({ marketingOptOut: { $ne: true } });
    res.json({ count });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/campaigns/send — emails every customer who hasn't unsubscribed with a deal
// announcement. Each recipient gets their own unsubscribe link tied to their account.
router.post('/campaigns/send', requireAdmin, async (req, res, next) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !subject.trim()) {
      return res.status(400).json({ message: 'Subject is required' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const recipients = await User.find({ marketingOptOut: { $ne: true } });
    if (!recipients.length) {
      return res.status(400).json({ message: 'No customers are eligible to receive emails right now' });
    }

    const origin = `${req.protocol}://${req.get('host')}`;
    const orderUrl = `${origin}/menu.html`;
    let sent = 0;
    let failed = 0;

    for (const user of recipients) {
      if (!user.unsubscribeToken) {
        user.unsubscribeToken = crypto.randomBytes(24).toString('hex');
        await user.save();
      }

      const unsubscribeUrl = `${origin}/api/marketing/unsubscribe?token=${user.unsubscribeToken}`;
      const html = buildDealEmailHtml({ name: user.name, subject, message, orderUrl, unsubscribeUrl });

      try {
        await sendMail({
          to: user.email,
          subject,
          html,
          text: `${message}\n\nOrder now: ${orderUrl}\n\nUnsubscribe: ${unsubscribeUrl}`,
        });
        sent += 1;
      } catch (err) {
        failed += 1;
        console.error(`Failed to send deal email to ${user.email}:`, err.message);
      }
    }

    res.json({ sent, failed, total: recipients.length });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
