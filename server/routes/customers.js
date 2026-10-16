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

// Rebuilds a customer's most recent paid order's item back into a shape the cart page can add
// directly (cart.js's addToCart format) — lets a returning guest re-order with one click instead
// of rebuilding their cart from scratch. "No X" / "Extra X (+£Y.YY)" strings on customization-type
// items (pizza toppings) are parsed back out of selectedOptions since those orders don't store
// removedToppings/addedToppings separately.
const EXTRA_TOPPING_REGEX = /^Extra (.+) \(\+£[\d.]+\)$/;
const NO_TOPPING_REGEX = /^No (.+)$/;

function reshapeOrderItemForCart(item) {
  const removedToppings = [];
  const addedToppings = [];

  if (!item.selectedGroups || !item.selectedGroups.length) {
    for (const opt of item.selectedOptions || []) {
      const extraMatch = opt.match(EXTRA_TOPPING_REGEX);
      const noMatch = opt.match(NO_TOPPING_REGEX);
      if (extraMatch) {
        addedToppings.push(extraMatch[1]);
      } else if (noMatch) {
        removedToppings.push(noMatch[1]);
      }
    }
  }

  return {
    menuItemId: item.menuItem.toString(),
    name: item.name,
    variantLabel: item.variantLabel,
    price: item.price,
    quantity: item.quantity,
    selectedOptions: item.selectedGroups && item.selectedGroups.length ? item.selectedOptions : [],
    removedToppings,
    addedToppings,
  };
}

// POST /api/customers/last-order — guest-friendly "reorder" lookup. Same phone+email proof as
// /lookup-orders, no password or account needed.
router.post('/last-order', lookupLimiter, async (req, res, next) => {
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
      return res.json({ found: false });
    }

    const lastOrder = await Order.findOne({ user: customer._id, paymentStatus: 'Paid' }).sort({ createdAt: -1 });
    if (!lastOrder) {
      return res.json({ found: false });
    }

    const menuItemIds = lastOrder.items.map((i) => i.menuItem);
    const dbItems = await MenuItem.find({ _id: { $in: menuItemIds } });
    const dbItemsById = new Map(dbItems.map((i) => [i._id.toString(), i]));

    let skipped = 0;
    const items = [];
    for (const orderItem of lastOrder.items) {
      const dbItem = dbItemsById.get(orderItem.menuItem.toString());
      if (!dbItem || !dbItem.available) {
        skipped += 1;
        continue;
      }
      items.push({
        ...reshapeOrderItemForCart(orderItem),
        icon: dbItem.icon,
        image: dbItem.image,
      });
    }

    res.json({ found: true, orderNumber: lastOrder.orderNumber, createdAt: lastOrder.createdAt, items, skipped });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
