const express = require('express');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const { normalizePhone } = require('../utils/twilioVerify');

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[\d\s]{10,15}$/;

// Slows down anyone trying to brute-force phone+email combinations to view a stranger's orders —
// there's no password here, so this rate limit is the main defense against guessing.
const lookupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts from this network. Please wait and try again later.' },
});

// "Order Again" (items this customer has actually bought before) and "You Might Also Like" (other
// available items in those same categories they haven't tried), built entirely from their real
// paid order history — nothing guessed or fabricated.
async function buildRecommendations(paidOrders) {
  if (!paidOrders.length) {
    return { orderAgain: [], recommended: [] };
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

  return { orderAgain, recommended };
}

// POST /api/customers/lookup-orders — guest order history. There's no account or password: proving
// you know both the phone number and email used on a past order is what unlocks it, the same way a
// lot of takeaway/delivery sites handle guest order tracking.
router.post('/lookup-orders', lookupLimiter, async (req, res, next) => {
  try {
    const { phone, email } = req.body;
    if (!phone || !PHONE_REGEX.test(phone)) {
      return res.status(400).json({ message: 'A valid phone number is required' });
    }
    if (!email || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: 'A valid email is required' });
    }

    const normalizedPhone = normalizePhone(phone);
    const normalizedEmail = email.trim().toLowerCase();

    const customer = await User.findOne({ phone: normalizedPhone, email: normalizedEmail });
    if (!customer) {
      return res.json({ orders: [], orderAgain: [], recommended: [] });
    }

    const orders = await Order.find({ user: customer._id }).sort({ createdAt: -1 });
    const paidOrders = orders.filter((o) => o.paymentStatus === 'Paid');
    const { orderAgain, recommended } = await buildRecommendations(paidOrders);

    res.json({ orders, orderAgain, recommended });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
