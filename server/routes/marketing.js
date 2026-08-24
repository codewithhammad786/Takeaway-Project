const express = require('express');
const User = require('../models/User');

const router = express.Router();

function confirmationPage(message) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Unsubscribe | Bun 'n Dough</title>
  <style>
    body { font-family: 'Segoe UI', Roboto, sans-serif; background: #fff8e7; color: #262220; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
    .box { background: #fff; border-radius: 16px; padding: 40px 32px; max-width: 420px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
    h1 { font-size: 1.4rem; margin: 0 0 12px; }
    p { color: #6b6358; line-height: 1.5; }
    a { color: #e6ac00; font-weight: 700; text-decoration: none; }
  </style>
</head>
<body>
  <div class="box">
    <h1>🍔 Bun 'n Dough</h1>
    <p>${message}</p>
    <p><a href="/index.html">Back to the website</a></p>
  </div>
</body>
</html>`;
}

// GET /api/marketing/unsubscribe?token=... — public, no login required, clicked from a deals email.
router.get('/unsubscribe', async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).send(confirmationPage("That unsubscribe link looks incomplete — please use the link exactly as it appeared in the email."));
    }

    const user = await User.findOne({ unsubscribeToken: token });
    if (!user) {
      return res.status(200).send(confirmationPage("This link has already been used or has expired — you're not receiving deal emails."));
    }

    user.marketingOptOut = true;
    await user.save();

    res.send(confirmationPage("You've been unsubscribed from deal emails. You'll still get emails about your own orders."));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
