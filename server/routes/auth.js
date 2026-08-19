const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const requireCustomer = require('../middleware/requireCustomer');
const { normalizePhone } = require('../utils/twilioVerify');

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[\d\s]{10,15}$/;
const SALT_ROUNDS = 10;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

function minutesUntil(date) {
  return Math.max(1, Math.ceil((date.getTime() - Date.now()) / 60000));
}

// Same idea as the manager login's limiter: slows down credential-stuffing and OTP-guessing at the
// network level, independent of the per-account lockout below.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts from this network. Please wait and try again later.' },
});

function signToken(user) {
  return jwt.sign({ userId: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

function publicUser(user) {
  return { id: user._id, name: user.name, email: user.email, phone: user.phone };
}

// POST /api/auth/register
router.post('/register', authLimiter, async (req, res, next) => {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: 'Customer auth is not configured on the server (missing JWT_SECRET)' });
    }

    const { name, email, phone, password } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }
    if (!email || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: 'A valid email is required' });
    }
    if (!phone || !PHONE_REGEX.test(phone)) {
      return res.status(400).json({ message: 'A valid phone number is required' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = normalizePhone(phone);

    const [existingEmail, existingPhone] = await Promise.all([
      User.findOne({ email: normalizedEmail }),
      User.findOne({ phone: normalizedPhone }),
    ]);
    if (existingEmail) {
      return res.status(409).json({ message: 'An account with that email already exists' });
    }
    if (existingPhone) {
      return res.status(409).json({ message: 'An account with that phone number already exists' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      passwordHash,
    });

    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: 'Customer auth is not configured on the server (missing JWT_SECRET)' });
    }

    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Incorrect email or password' });
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return res.status(423).json({
        message: `Too many failed attempts. Try again in ${minutesUntil(user.lockedUntil)} minute(s).`,
      });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
        user.failedLoginAttempts = 0;
        await user.save();
        return res.status(423).json({
          message: `Too many failed attempts. Locked for ${LOCKOUT_MINUTES} minutes.`,
        });
      }
      await user.save();
      return res.status(401).json({ message: 'Incorrect email or password' });
    }

    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;
    await user.save();

    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', requireCustomer, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'Account not found' });
    res.json(publicUser(user));
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/orders — the logged-in customer's own order history
router.get('/orders', requireCustomer, async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.userId }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/recommendations — "Order Again" (items this customer has actually bought before)
// and "You Might Also Like" (other available items in those same categories they haven't tried),
// built entirely from their real paid order history — nothing guessed or fabricated.
router.get('/recommendations', requireCustomer, async (req, res, next) => {
  try {
    const paidOrders = await Order.find({ user: req.userId, paymentStatus: 'Paid' }).sort({ createdAt: -1 });

    if (!paidOrders.length) {
      return res.json({ orderAgain: [], recommended: [] });
    }

    const orderedItemIds = [];
    const seenIds = new Set();
    for (const order of paidOrders) {
      for (const item of order.items) {
        const id = item.menuItem.toString();
        if (!seenIds.has(id)) {
          seenIds.add(id);
          orderedItemIds.push(id);
        }
      }
    }

    const orderAgainItems = await MenuItem.find({ _id: { $in: orderedItemIds }, available: true });
    const orderAgainMap = new Map(orderAgainItems.map((i) => [i._id.toString(), i]));
    const orderAgain = orderedItemIds
      .map((id) => orderAgainMap.get(id))
      .filter(Boolean)
      .slice(0, 8);

    const orderedCategories = [...new Set(orderAgain.map((i) => i.category))];

    const recommended = orderedCategories.length
      ? await MenuItem.find({
          category: { $in: orderedCategories },
          _id: { $nin: orderedItemIds },
          available: true,
        })
          .sort({ popular: -1, name: 1 })
          .limit(8)
      : [];

    res.json({ orderAgain, recommended });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
