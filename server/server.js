require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const Admin = require('./models/Admin');
const User = require('./models/User');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const customerRoutes = require('./routes/customers');
const reviewRoutes = require('./routes/reviews');
const marketingRoutes = require('./routes/marketing');

const app = express();
const PORT = process.env.PORT || 5000;

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('⚠️  STRIPE_SECRET_KEY is not set — checkout/payment will fail until configured in .env');
}
if (!process.env.ADMIN_SESSION_SECRET) {
  console.warn('⚠️  ADMIN_SESSION_SECRET not set — admin login will fail until configured in .env');
}
if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.warn('⚠️  SMTP settings are not fully set — sending deal emails from the Deals tab will fail until configured in .env');
}

// Sets standard security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, HSTS,
// etc.) site-wide. Content-Security-Policy is left off deliberately — this frontend uses inline
// styles for things like the hero slideshow, and a default-strict CSP would silently break them
// without a much larger audit/refactor than the header itself is worth here.
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

// Baseline defense-in-depth on top of the tighter per-route limiters on /api/customers and
// /api/admin/login — generous enough to never affect normal browsing/polling, just there to blunt
// scraping or automated abuse across the whole API.
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests from this network. Please slow down and try again shortly.' },
  })
);

app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/marketing', marketingRoutes);

app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Something went wrong on the server' });
});

async function seedAdminPasswordIfMissing() {
  const existing = await Admin.findOne();
  if (existing) return;

  const initialPassword = process.env.ADMIN_PASSWORD;
  if (!initialPassword) {
    console.warn('⚠️  No admin account exists yet and ADMIN_PASSWORD is not set in .env — set it once to create the initial manager login, then you can change the password from the Settings tab.');
    return;
  }

  const passwordHash = await bcrypt.hash(initialPassword, 10);
  await Admin.create({ passwordHash });
  console.log('✅ Manager account created from ADMIN_PASSWORD — you can change it anytime from the Settings tab in /admin.html.');
}

// Guest checkout used to require a unique email (back when it was a real login system). The schema
// dropped that in favour of a unique phone number, but Mongoose never removes indexes on its own —
// an old unique index on email can still be sitting in the database from before, and will reject a
// second guest using the same email with a different phone number. Syncing on every startup keeps
// the live indexes matching the current schema exactly, so this can't silently come back either.
async function syncUserIndexes() {
  try {
    await User.syncIndexes();
  } catch (err) {
    console.warn('⚠️  Could not sync User indexes:', err.message);
  }
}

connectDB()
  .then(seedAdminPasswordIfMissing)
  .then(syncUserIndexes)
  .then(() => {
    app.listen(PORT, () => console.log(`Bun 'n Dough server listening on port ${PORT} (http://localhost:${PORT} only works when running on your own computer — on a host like Railway, use the public URL it gives you instead)`));
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });
