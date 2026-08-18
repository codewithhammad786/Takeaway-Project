const express = require('express');
const Review = require('../models/Review');

const router = express.Router();

// GET /api/reviews — public, approved reviews only
router.get('/', async (req, res, next) => {
  try {
    const reviews = await Review.find({ approved: true }).sort({ createdAt: -1 }).limit(50);
    res.json(reviews);
  } catch (err) {
    next(err);
  }
});

// POST /api/reviews — anyone can submit; goes live only after admin approval
router.post('/', async (req, res, next) => {
  try {
    const { name, rating, comment } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Please enter your name' });
    }
    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ message: 'Please choose a rating between 1 and 5' });
    }
    if (!comment || !comment.trim()) {
      return res.status(400).json({ message: 'Please write a short review' });
    }
    if (comment.trim().length > 600) {
      return res.status(400).json({ message: 'Review is too long (max 600 characters)' });
    }

    await Review.create({
      name: name.trim().slice(0, 60),
      rating: ratingNum,
      comment: comment.trim().slice(0, 600),
    });

    res.status(201).json({ message: 'Thanks for your review! It will appear on the site once approved.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
