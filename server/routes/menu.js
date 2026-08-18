const express = require('express');
const MenuItem = require('../models/MenuItem');

const router = express.Router();

// GET /api/menu?category=Pizzas&popular=true
router.get('/', async (req, res, next) => {
  try {
    const filter = { available: true };
    if (req.query.category) filter.category = req.query.category;
    if (req.query.popular === 'true') filter.popular = true;

    const items = await MenuItem.find(filter).sort({ category: 1, name: 1 });
    res.json(items);
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
    res.json(item);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
