# Bun 'n Dough — Takeaway Website

A full takeaway ordering website for **Bun 'n Dough** (Pizza, Burger and Grill, Birmingham): customers create an account, browse the real menu with photos, pick sizes/toppings/flavours, add items to a cart, pay by card, and see their order history. Staff track live orders from a separate admin page. Built with a plain HTML/CSS/JS frontend and a Node.js/Express + MongoDB backend.

## Features

- Professional multi-column footer and auth-aware navbar (Login/Register or "Hi, Name" + My Orders + Logout) on every page
- Home page with hero, popular picks, and contact/hours info
- Full menu page (95 items across 15 categories) with category filtering and real food photos (with an automatic emoji fallback if a photo fails to load)
- Per-item **size/price variants** (e.g. Single/Meal, Small/Large skewers, pizza sizes 8"–20") and **multiple option groups per item**, each with its own choice list, max-selection limit, and optional per-choice price add-on — e.g. every burger gets a free Salad group and free Sauce group, the Cheeseburger additionally offers an Extra Patty for +£1.50, every Grilled item offers a Flavour + Side + Drink choice (with premium drinks like Red Bull at +£1), and meal deals (Solo/Duo/Ultimate Feast) offer drink and side choices sized to match the deal
- **Per-pizza customization** — click "Customize" on any of the 13 fixed pizzas to open a modal: remove any of its default toppings for free, or add extra toppings for £1.00 each, with the price updating live as you change size/toppings
- **Customer accounts required to order** — register/login, with automatic order history (`orders.html`) tied to your account, including the option to remove your own unpaid/abandoned orders from that history
- Cart (persisted in the browser via `localStorage`, synced live across tabs) with quantity controls — each distinct variant/option combination is its own line
- Automatic **15% online-order discount**, applied to every order
- Checkout with delivery/pickup toggle, form validation, and a live order summary
- **Real card payment via Stripe Checkout** — customer is redirected to Stripe's hosted payment page, then back to a confirmation page once payment is verified server-side
- **Dedicated Contact page** (`contact.html`) with address/phone/opening hours and a **customer review system** — anyone can leave a star rating + comment, which is held for staff approval before it appears publicly
- **Staff admin page** (`/admin.html`) — separate password-protected login, with three tabs:
  - **Orders** — live incoming orders (auto-refreshes every 15s), update each order's status (Pending → Preparing → ... → Completed), filterable by payment status
  - **Menu Images** — upload/replace the real photo for any menu item directly from the dashboard (stored on the server and served from `/uploads`, no code changes needed)
  - **Reviews** — approve or delete customer-submitted reviews before they go live
- REST API backed by MongoDB, with server-side price recalculation so totals (including variant price and every selected option's price) can't be tampered with from the browser, and server-side payment verification so an order can't be marked paid without a real completed Stripe session

## Tech Stack

- **Frontend:** HTML, CSS, vanilla JavaScript (no build step)
- **Backend:** Node.js, Express
- **Database:** MongoDB (via Mongoose)
- **Auth:** JWT + bcrypt password hashing (separate customer and staff logins)
- **Payments:** Stripe Checkout (test mode by default)
- **Currency:** GBP (£)

## Project Structure

```
Final-Year-Project/
├── public/              # Frontend (served statically by Express)
│   ├── css/style.css
│   ├── js/               # api.js, auth.js, cart.js, nav.js, menu.js, menu-card.js, checkout.js, admin.js, contact.js, ...
│   ├── index.html, menu.html, cart.html, checkout.html, order-confirmation.html
│   ├── login.html, register.html, orders.html   # customer accounts + order history
│   ├── contact.html                               # contact info + customer reviews
│   └── admin.html                                 # staff-only dashboard (orders / menu images / reviews)
└── server/              # Backend
    ├── config/            # db.js, stripe.js
    ├── middleware/         # requireAdmin.js, requireCustomer.js (JWT auth), upload.js (multer, menu image uploads)
    ├── models/             # MenuItem (variants + optionGroups + image), Order, User, Review
    ├── routes/             # /api/menu, /api/orders, /api/admin, /api/auth, /api/reviews
    ├── utils/pricing.js    # shared variant/option validation + totals math
    ├── seed/               # Full Bun 'n Dough menu + seed script
    ├── uploads/menu-images/ # staff-uploaded menu photos (served at /uploads/menu-images/...)
    └── server.js
```

## Getting Started

### 1. Prerequisites

- [Node.js](https://nodejs.org/) v18+
- A MongoDB instance — either:
  - Install [MongoDB Community Server](https://www.mongodb.com/try/download/community) and run it locally (default: `mongodb://127.0.0.1:27017`), or
  - Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/atlas) and use its connection string
- A free [Stripe](https://dashboard.stripe.com/register) account (test mode — no real card processing setup needed to develop/demo)
- A [Twilio](https://www.twilio.com/try-twilio) account with a **Verify Service** set up (used to text customers a 6-digit code when they register — free trial credit covers testing)

### 2. Install dependencies

```bash
cd server
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `server/.env`:

```
MONGODB_URI=mongodb://127.0.0.1:27017/bunndough
PORT=5000

# From dashboard.stripe.com/test/apikeys (starts with sk_test_)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key

# Manager login for /admin.html — pick your own values. ADMIN_PASSWORD only matters the very
# first time the server starts (it creates the manager account with this password); after that,
# change the password anytime from the Settings tab in /admin.html and this value is ignored.
ADMIN_PASSWORD=choose-a-strong-password
ADMIN_SESSION_SECRET=choose-a-long-random-string

# Signs customer login sessions — pick your own different long random string
JWT_SECRET=choose-a-different-long-random-string

# Twilio Verify — texts the code customers enter to confirm their phone number when registering.
# Account SID + Auth Token are on your Twilio Console dashboard; create a Verify Service at
# console.twilio.com/us1/develop/verify/services for the Service SID.
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_VERIFY_SERVICE_SID=your-twilio-verify-service-sid
```

### 4. Seed the menu

This populates the database with the full Bun 'n Dough menu (Grilled, Persian, Parmesan, Meal Deals, Munch Boxes, Pizza, Build Your Own Pizza, Calzone, Burgers, Kebabs, Wraps, Sides, Sweet Treats, Milkshakes), each with a photo, sourced from free-to-use stock photography:

```bash
npm run seed
```

### 5. Run the server

```bash
npm start
```

Then open **http://localhost:5000** in your browser. The Express server serves both the API and the static frontend, so there's nothing else to run.

For development with auto-restart on file changes:

```bash
npm run dev
```

### 6. Create a customer account and test a payment

Browsing the menu requires an account — clicking **Order Now** (or **Menu**) while logged out sends you to the registration page. Register with a name, email, phone number, and password; you'll be texted a 6-digit code (via Twilio) to confirm the phone number before the account is created. Add items to your cart, go to checkout, and when redirected to Stripe's hosted payment page use one of [Stripe's test cards](https://docs.stripe.com/testing) — e.g. card number `4242 4242 4242 4242`, any future expiry date, any 3-digit CVC, any postcode. No real money moves in test mode. Your order will then show up on `orders.html` ("My Orders").

### 7. Manager dashboard

Go to **http://localhost:5000/admin.html** and log in with the `ADMIN_PASSWORD` you set in `.env` — this creates the manager account the first time the server starts. It's a completely separate login from customer accounts: `admin.html` is never linked from anywhere on the public site, so only someone who already knows that URL can even reach it.

The manager login itself is protected by two independent layers, since this account controls the entire business:

- **Two-factor authentication** — the very first successful login shows a QR code to scan with an authenticator app (Google Authenticator, Authy, Microsoft Authenticator, etc.); every login after that requires the current 6-digit code from the app, not just the password. No third-party service or ongoing cost — it's all self-contained (industry-standard TOTP). Lost the authenticator device? Reset it from the **Settings** tab with the current password, then set it up again on the next login.
- **Lockout after repeated failed passwords** — 5 wrong passwords in a row locks the account for 15 minutes, and there's a separate network-level rate limit on both the password and code-entry steps to slow down any automated guessing.

The dashboard has five tabs:

- **Dashboard** — today/this week/this month earnings, a 7-day earnings chart, and your top 5 selling items, all computed from real paid orders.
- **Orders** — the live order queue, with status updates.
- **Menu Images** — upload a real photo for any item, just pick the item's card and choose a file.
- **Reviews** — approve or delete customer-submitted reviews before they appear on `contact.html`.
- **Settings** — change the manager password, or reset two-factor authentication, anytime (no need to touch `.env` or restart the server).

## How Ordering Works

1. **Register/Login** (`register.html` / `login.html`) — customers create an account (name, email, phone, password — hashed with bcrypt, phone verified by SMS code) or log in; a JWT is stored in the browser and sent as `Authorization: Bearer` on every subsequent request that needs it. Customer logins get the same brute-force protection as the manager account — 5 wrong passwords locks that account for 15 minutes — plus network-level rate limiting on login/register/OTP requests. The whole site also sends standard security headers (via `helmet`) on every response.
2. **Menu** (`menu.html`) — requires a logged-in account; visiting it while logged out redirects to registration/login first, then brings you straight back. Items are fetched from `GET /api/menu` and shown with a real photo (falls back to the item's emoji automatically if the photo fails to load). Items with more than one size show a dropdown; items with a flavour/topping choice show chips (radio for single-choice, checkboxes capped at the item's max for toppings). "Add to Cart" stores the selected variant + options in `localStorage`.
3. **Cart** (`cart.html`) — lets you adjust quantities or remove lines before checking out; shows the automatic 15% discount. Cart state stays in sync live across browser tabs.
4. **Checkout** (`checkout.html`) — requires being logged in (redirects to `login.html?redirect=checkout.html` otherwise, then bounces back). Pre-fills your name/email from your account, collects the rest of the details, toggles delivery vs. pickup (delivery fee is £2.99, free over £25 subtotal), and submits to `POST /api/orders`. The server re-looks-up each item's variant price and validates selected options from the database, creates a **pending** order tied to your account, opens a Stripe Checkout Session for the total, and redirects you to Stripe's hosted payment page. The cart is *not* cleared yet at this point.
5. **Payment** — happens entirely on Stripe's page; card details never touch this server. On success, Stripe redirects back to the confirmation page with a session ID; on cancel, it returns to checkout with the cart still intact.
6. **Confirmation** (`order-confirmation.html`) — if a Stripe session ID is present, calls `POST /api/orders/:id/confirm-payment`, which verifies with Stripe that the session was actually paid (and that it matches the order and belongs to you) before marking it paid — only then is the cart cleared and the order shown.
7. **My Orders** (`orders.html`) — logged-in customers see their full order history (`GET /api/auth/orders`), most recent first.
8. **Admin** (`admin.html`) — staff log in with a separate shared password (`POST /api/admin/login` issues a short-lived JWT), then see all orders (polled every 15s), with a payment-status badge and a dropdown to update each order's kitchen status.

## Customizing

- **Menu photos:** the easiest way is the admin dashboard's **Menu Images** tab — log in to `/admin.html`, pick any item, and upload a photo straight from your computer; it's saved on the server and shown immediately, no code changes or re-seeding needed. Alternatively, edit the `ITEM_IMAGE_OVERRIDE`/`CATEGORY_IMAGE` maps in `server/seed/seedData.js` and re-run `npm run seed`.
- **Menu items:** edit `server/seed/seedData.js` and re-run `npm run seed`. Each item has a `variants` array (at least one `{label, price}`), an optional `optionGroups` array — each group is `{label, choices, max, required}` where `choices` is a list of `{label, price}` (set `price: 0` for a free choice) — for one or more independent option pickers per item (e.g. a burger can have a Salad group and a Sauce group at once), an optional `customization` (`{defaultToppings, extraToppingPrice, availableToppings}`) for the pizza remove/add-topping modal, and an `image` URL (overridden automatically once you upload a real photo via the admin dashboard).
- **Extra topping price:** the `EXTRA_TOPPING_PRICE` constant near the top of `server/seed/seedData.js` (currently £1.00), re-seed after changing it.
- **Branding/colors:** CSS variables are defined at the top of `public/css/style.css` (`:root`).
- **Online discount / delivery fee / free delivery threshold:** constants at the top of `server/utils/pricing.js` (used by order creation) and the matching ones in `public/js/checkout.js` / `public/js/cart-page.js` (used for the live on-page preview before the server recomputes the real total).

## Notes / Scope

The menu photos start out as free-to-use stock photography (Pexels) chosen to match each dish as closely as possible, rather than actual photos of your specific dishes. Use the admin dashboard's **Menu Images** tab to upload your own real photos whenever you have them — uploaded photos are stored in `server/uploads/menu-images/` and immediately replace the stock photo everywhere the item appears, no code changes needed.

The cart lives in the browser's `localStorage`, not on the server, so it isn't synced between devices — and since it's cleared on logout (so the next person to log in on a shared device never sees a previous customer's cart), a customer who wants to keep shopping across devices would need to add items again after switching. A fuller fix (a server-side cart tied to the account) is a reasonable next step if that matters for how customers actually use the site.

Payment confirmation happens when the customer's browser returns from Stripe rather than via a Stripe webhook, which is simpler to run locally but means a payment that succeeds right as the customer closes the tab before redirecting back could leave an order stuck as "Unpaid" in the admin page even though Stripe charged the card — a production deployment would add a webhook (`checkout.session.completed`) as a backstop. The admin page uses a single shared staff password rather than per-staff accounts (no rate-limiting on login attempts either). Pizza base upgrades (garlic/BBQ base) and stuffed crust are mentioned on the real leaflet but aren't sold as priced add-ons here, since their price depends on the pizza size — these would be natural next features to add if extending the project.

Reviews are open to anyone (no login required) so genuine walk-in/phone customers can leave feedback too, which also means they aren't tied to a verified order — that's why every review is held for staff approval on the **Reviews** tab before it appears on `contact.html`, as a basic spam/abuse safeguard.
