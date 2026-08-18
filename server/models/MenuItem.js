const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const optionChoiceSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    price: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const optionGroupSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    choices: { type: [optionChoiceSchema], required: true, validate: (v) => Array.isArray(v) && v.length > 0 },
    max: { type: Number, required: true, min: 1 },
    required: { type: Boolean, default: false },
  },
  { _id: false }
);

const customizationSchema = new mongoose.Schema(
  {
    defaultToppings: { type: [String], default: [] },
    extraToppingPrice: { type: Number, required: true, min: 0 },
    availableToppings: { type: [String], default: [] },
  },
  { _id: false }
);

const menuItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    icon: { type: String, default: '🍽️' },
    image: { type: String },
    variants: { type: [variantSchema], required: true, validate: (v) => Array.isArray(v) && v.length > 0 },
    optionGroups: { type: [optionGroupSchema], default: [] },
    customization: { type: customizationSchema, default: undefined },
    badge: { type: String, trim: true },
    popular: { type: Boolean, default: false },
    available: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MenuItem', menuItemSchema);
