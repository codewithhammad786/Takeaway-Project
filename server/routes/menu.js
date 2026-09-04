const express = require('express');
const MenuItem = require('../models/MenuItem');

const router = express.Router();

// Swaps in the Stoke-on-Trent branch's override prices (by variant label) where one exists, so the
// frontend never has to know about stokeVariants at all — it just always renders `variants` as
// normal. Birmingham (or any branch value we don't recognise) gets the item back untouched.
function applyBranchPricing(item, branch) {
  const plain = item.toObject ? item.toObject() : item;
  if (branch !== 'Stoke-on-Trent' || !plain.stokeVariants || !plain.stokeVariants.length) {
    return plain;
  }
  const overrideByLabel = new Map(plain.stokeVariants.map((v) => [v.label, v.price]));
  plain.variants = plain.variants.map((v) => (overrideByLabel.has(v.label) ? { ...v, price: overrideByLabel.get(v.label) } : v));
  return plain;
}

// GET /api/menu?category=Pizzas&popular=true&branch=Stoke-on-Trent
router.get('/', async (req, res, next) => {
  try {
    const filter = { available: true };
    if (req.query.category) filter.category = req.query.category;
    if (req.query.popular === 'true') filter.popular = true;

    const items = await MenuItem.find(filter).sort({ category: 1, name: 1 });
    res.json(items.map((item) => applyBranchPricing(item, req.query.branch)));
  } catch (err) {
    next(err);
  }
});

// GET /api/menu/categories
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await MenuItem.distinct('category', { available: true });
    res.json(categories);
  } catch (err) {
    next(err);
  }
});

// GET /api/menu/:id
router.get('/:id', async (req, res, next) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Menu item not found' });
    res.json(applyBranchPricing(item, req.query.branch));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
