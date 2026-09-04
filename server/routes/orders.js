const express = require('express');
const Order = require('../models/Order');
const User = require('../models/User');
const stripe = require('../config/stripe');
const { buildOrderItems, computeTotals, OrderValidationError, MIN_DELIVERY_ORDER } = require('../utils/pricing');
const { normalizePhone } = require('../utils/twilioVerify');
const { sendOrderPaidWhatsApp } = require('../utils/whatsapp');
const { isShopOpen, isDeliveryAvailable, getBusinessDayKey } = require('../utils/businessHours');

const router = express.Router();

const PHONE_REGEX = /^[0-9+\-\s()]{7,20}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function generateOrderNumber() {
  const timePart = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `BD-${timePart}-${randomPart}`;
}

// Finds or creates the guest customer record for this phone number, keeping name/email up to date
// — this is what lets a phone+email lookup later surface their order history, with no account or
// password ever required.
async function upsertGuestCustomer({ name, phone, email }) {
  const normalizedPhone = normalizePhone(phone);
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedPhone) {
    const err = new Error('A valid phone number is required');
    err.status = 400;
    throw err;
  }

  let customer = await User.findOne({ phone: normalizedPhone });
  if (customer) {
    customer.name = name;
    customer.email = normalizedEmail;
    await customer.save();
  } else {
    customer = await User.create({ name, phone: normalizedPhone, email: normalizedEmail });
  }
  return customer;
}

// POST /api/orders — creates a pending order and a Stripe Checkout Session to pay for it. No login
// required — just a name, phone, and email, which also becomes/updates their guest customer record.
router.post('/', async (req, res, next) => {
  try {
    const { customerName, phone, email, branch, orderType, address, city, postcode, notes, items } = req.body;

    if (!isShopOpen()) {
      return res.status(400).json({ message: "We're closed right now — online ordering runs 3pm–8am. Please come back after 3pm." });
    }
    if (!['Birmingham', 'Stoke-on-Trent'].includes(branch)) {
      return res.status(400).json({ message: 'Please choose a branch (Birmingham or Stoke-on-Trent)' });
    }
    if (!customerName || !customerName.trim()) {
      return res.status(400).json({ message: 'Customer name is required' });
    }
    if (!phone || !PHONE_REGEX.test(phone)) {
      return res.status(400).json({ message: 'A valid phone number is required' });
    }
    if (!email || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: 'A valid email is required' });
    }
    if (!['Delivery', 'Pickup'].includes(orderType)) {
      return res.status(400).json({ message: 'Order type must be Delivery or Pickup' });
    }
    if (orderType === 'Delivery' && !isDeliveryAvailable()) {
      return res.status(400).json({ message: 'Delivery is only available from 7pm to 8am — please switch to Pickup, or try again after 7pm.' });
    }
    if (orderType === 'Delivery' && (!address || !address.trim() || !city || !city.trim())) {
      return res.status(400).json({ message: 'Address and city are required for delivery orders' });
    }

    let orderItems;
    try {
      orderItems = await buildOrderItems(items, branch);
    } catch (err) {
      if (err instanceof OrderValidationError) {
        return res.status(400).json({ message: err.message });
      }
      throw err;
    }

    const { subtotal, discount, deliveryFee, total } = computeTotals(orderItems, orderType);

    if (orderType === 'Delivery' && subtotal < MIN_DELIVERY_ORDER) {
      return res.status(400).json({
        message: `Minimum order for delivery is £${MIN_DELIVERY_ORDER.toFixed(2)} (before discount). Your subtotal is £${subtotal.toFixed(2)} — add more items or switch to pickup.`,
      });
    }

    const customer = await upsertGuestCustomer({ name: customerName.trim(), phone, email });

    const businessDay = getBusinessDayKey();
    const dailyReceiptNo = (await Order.countDocuments({ businessDay })) + 1;

    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      businessDay,
      dailyReceiptNo,
      user: customer._id,
      branch,
      customerName: customerName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      orderType,
      address: orderType === 'Delivery' ? address.trim() : undefined,
      city: orderType === 'Delivery' ? city.trim() : undefined,
      postcode: postcode ? postcode.trim() : undefined,
      notes: notes ? notes.trim() : undefined,
      items: orderItems,
      subtotal,
      discount,
      deliveryFee,
      total,
    });

    const origin = `${req.protocol}://${req.get('host')}`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: { name: `Bun 'n Dough Order #${order.orderNumber}` },
            unit_amount: Math.round(total * 100),
          },
          quantity: 1,
        },
      ],
      customer_email: email.trim(),
      metadata: { orderId: order._id.toString() },
      success_url: `${origin}/order-confirmation.html?orderId=${order._id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout.html?cancelled=1`,
    });

    order.stripeSessionId = session.id;
    await order.save();

    res.status(201).json({ orderId: order._id, checkoutUrl: session.url });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ message: err.message });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: 'Some of the details provided were invalid — please check your name, phone, and email and try again.' });
    }
    if (err.code === 11000) {
      return res.status(400).json({ message: 'That phone number or email is already in use by another order — please double-check your details and try again.' });
    }
    next(err);
  }
});

// POST /api/orders/:id/confirm-payment — verifies a completed Stripe Checkout Session and marks the
// order paid. Knowing both the order ID and its exact Stripe session ID is the "proof" here, since
// there's no login — the session ID isn't something a stranger could guess.
router.post('/:id/confirm-payment', async (req, res, next) => {
  try {
    const { sessionId } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.paymentStatus === 'Paid') {
      return res.json(order);
    }

    if (!sessionId || sessionId !== order.stripeSessionId) {
      return res.status(400).json({ message: 'Payment session does not match this order' });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return res.status(402).json({ message: 'Payment has not been completed yet' });
    }

    order.paymentStatus = 'Paid';
    await order.save();

    // Fire-and-forget — a manager notification should never delay or break the customer's
    // checkout response, so this isn't awaited and any failure is just logged.
    const origin = `${req.protocol}://${req.get('host')}`;
    sendOrderPaidWhatsApp(order, origin).catch((err) => console.error('WhatsApp order notification failed:', err.message));

    res.json(order);
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/:id — the confirmation page for a specific order. The order ID itself (a long,
// unguessable Mongo ID) is what limits this to people who actually placed or received it.
router.get('/:id', async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/orders/:id — removes an unpaid/abandoned order, never a paid one (the business needs
// those records).
router.delete('/:id', async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.paymentStatus === 'Paid') {
      return res.status(400).json({ message: 'Paid orders cannot be removed' });
    }

    await Order.deleteOne({ _id: order._id });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
