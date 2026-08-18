const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    // sparse so this unique index doesn't fail to build against any accounts created before phone
    // numbers existed on this model — new registrations still always require one (enforced in the
    // /register route), this only keeps old accounts from blocking the index.
    phone: { type: String, required: true, trim: true, unique: true, sparse: true },
    phoneVerified: { type: Boolean, default: false },
    passwordHash: { type: String, required: true },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
