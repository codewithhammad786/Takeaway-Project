const express = require('express');
const Order = require('../models/Order');
const stripe = require('../config/stripe');
const requireCustomer = require('../middleware/requireCustomer');
const { buildOrderItems, computeTotals, OrderValidationError } = require('../utils/pricing');

const router = express.Router();

const PHONE_REGEX = /^[0-9+\-\s()]{7,20}$/;

function generateOrderNumber() {
  const timePart = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `BD-${timePart}-${randomPart}`;
}

// POST /api/orders — creates a pending order and a Stripe Checkout Session to pay for it. Requires login.
router.post('/', requireCustomer, async (req, res, next) => {
  try {
    const { customerName, phone, email, orderType, address, city, postcode, notes, items } = req.body;

    if (!customerName || !customerName.trim()) {
      return res.status(400).json({ message: 'Customer name is required' });
    }
    if (!phone || !PHONE_REGEX.test(phone)) {
      return res.status(400).json({ message: 'A valid phone number is required' });
    }
    if (!['Delivery', 'Pickup'].includes(orderType)) {
      return res.status(400).json({ message: 'Order type must be Delivery or Pickup' });
    }
    if (orderType === 'Delivery' && (!address || !address.trim() || !city || !city.trim())) {
      return res.status(400).json({ message: 'Address and city are required for delivery orders' });
    }

    let orderItems;
    try {
      orderItems = await buildOrderItems(items);
    } catch (err) {
      if (err instanceof OrderValidationError) {
        return res.status(400).json({ message: err.message });
      }
      throw err;
    }

    const { subtotal, discount, deliveryFee, total } = computeTotals(orderItems, orderType);

    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      user: req.userId,
      customerName: customerName.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : undefined,
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
      customer_email: email ? email.trim() : undefined,
      metadata: { orderId: order._id.toString() },
      success_url: `${origin}/order-confirmation.html?orderId=${order._id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout.html?cancelled=1`,
    });

    order.stripeSessionId = session.id;
    await order.save();

    res.status(201).json({ orderId: order._id, checkoutUrl: session.url });
  } catch (err) {
    next(err);
  }
});

// POST /api/orders/:id/confirm-payment — verifies a completed Stripe Checkout Session and marks the order paid.
router.post('/:id/confirm-payment', requireCustomer, async (req, res, next) => {
  try {
    const { sessionId } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.user.toString() !== req.userId) {
      return res.status(403).json({ message: 'This order does not belong to your account' });
    }

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

    res.json(order);
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/:id — only the owning customer can view their order.
router.get('/:id', requireCustomer, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.user.toString() !== req.userId) {
      return res.status(403).json({ message: 'This order does not belong to your account' });
    }
    res.json(order);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/orders/:id — customers can only remove their own unpaid/abandoned orders,
// never a paid one (the business needs those records).
router.delete('/:id', requireCustomer, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.user.toString() !== req.userId) {
      return res.status(403).json({ message: 'This order does not belong to your account' });
    }
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
