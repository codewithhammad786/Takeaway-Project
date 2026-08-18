// One-off maintenance script: removes the "Falafel Wrap" item and renames the veggie wrap to
// "Vegie Wrap" directly in the live database, without touching any other menu items, images, or
// orders. Run once from the server folder with: node scripts/fix-wraps.js
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const MenuItem = require('../models/MenuItem');

async function run() {
  try {
    await connectDB();

    const deleted = await MenuItem.deleteOne({ name: 'Falafel Wrap' });
    console.log(
      deleted.deletedCount
        ? 'Removed "Falafel Wrap".'
        : 'No item named "Falafel Wrap" found (already removed?).'
    );

    const renamed = await MenuItem.updateOne(
      { name: { $regex: /^grilled\s*veg(gie)?\s*wrap$/i } },
      { $set: { name: 'Vegie Wrap' } }
    );
    console.log(
      renamed.matchedCount
        ? 'Renamed the grilled veg wrap to "Vegie Wrap".'
        : 'No grilled veg/veggie wrap item found to rename.'
    );
  } catch (err) {
    console.error('Failed:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();
