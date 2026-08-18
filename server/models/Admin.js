const mongoose = require('mongoose');

// Single-document collection: there's one shared staff/manager login for this business, stored in
// the database (bcrypt-hashed) instead of a plain .env value, so it can be changed from the
// Settings tab. On first run, server.js seeds this from ADMIN_PASSWORD in .env if no document
// exists yet, so existing deployments keep working with their current password after upgrading.
const adminSchema = new mongoose.Schema(
  {
    passwordHash: { type: String, required: true },
    twoFactorSecret: { type: String },
    twoFactorEnabled: { type: Boolean, default: false },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Admin', adminSchema);
