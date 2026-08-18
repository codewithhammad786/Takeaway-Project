require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const MenuItem = require('../models/MenuItem');
const seedData = require('./seedData');

async function seed() {
  try {
    await connectDB();
    await MenuItem.deleteMany({});
    await MenuItem.insertMany(seedData);
    console.log(`Seeded ${seedData.length} menu items.`);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seed();
