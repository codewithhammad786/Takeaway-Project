const mongoose = require('mongoose');

// Represents a guest customer, identified by phone + email rather than a password-based account —
// created/updated automatically the first time someone places an order with those details, and
// reused afterwards to link up their order history and marketing preferences.
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true, unique: true },
    marketingOptOut: { type: Boolean, default: false },
    unsubscribeToken: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
