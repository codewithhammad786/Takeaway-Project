const mongoose = require('mongoose');

const selectedGroupSchema = new mongoose.Schema(
  { label: { type: String, required: true }, choices: { type: [String], required: true } },
  { _id: false }
);

const orderItemSchema = new mongoose.Schema(
  {
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    name: { type: String, required: true },
    variantLabel: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    selectedOptions: { type: [String], default: [] },
    // Same choices as selectedOptions, but kept grouped under the menu item's real option-group
    // labels (e.g. "Choose your salad", "Choose your sauces") so receipts/kitchen tickets can show
    // each item's modifiers under proper headings instead of one flat bullet list. Empty for orders
    // placed before this existed, or for pizza topping customization (which has no groups) — those
    // fall back to the flat selectedOptions list wherever this is rendered.
    selectedGroups: { type: [selectedGroupSchema], default: [] },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    customerName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    orderType: { type: String, enum: ['Delivery', 'Pickup'], required: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    postcode: { type: String, trim: true },
    notes: { type: String, trim: true },
    items: { type: [orderItemSchema], required: true, validate: (v) => Array.isArray(v) && v.length > 0 },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, required: true, min: 0, default: 0 },
    deliveryFee: { type: Number, required: true, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['Pending', 'Preparing', 'Out for Delivery', 'Ready for Pickup', 'Completed'],
      default: 'Pending',
    },
    paymentStatus: {
      type: String,
      enum: ['Unpaid', 'Paid', 'Failed'],
      default: 'Unpaid',
    },
    stripeSessionId: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
