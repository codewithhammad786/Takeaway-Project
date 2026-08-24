const MenuItem = require('../models/MenuItem');

const FREE_DELIVERY_THRESHOLD = 25;
const DELIVERY_FEE = 2.99;
const ONLINE_DISCOUNT_RATE = 0.15;
const MIN_DELIVERY_ORDER = 15;

class OrderValidationError extends Error {}

function round2(n) {
  return Math.round(n * 100) / 100;
}

async function buildOrderItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new OrderValidationError('Cart is empty');
  }

  const menuItemIds = items.map((i) => i.menuItemId);
  const dbItems = await MenuItem.find({ _id: { $in: menuItemIds }, available: true });
  const dbItemsById = new Map(dbItems.map((i) => [i._id.toString(), i]));

  const orderItems = [];
  for (const cartItem of items) {
    const dbItem = dbItemsById.get(cartItem.menuItemId);
    const quantity = Number(cartItem.quantity);

    if (!dbItem) {
      throw new OrderValidationError(`Menu item unavailable: ${cartItem.menuItemId}`);
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new OrderValidationError(`Invalid quantity for ${dbItem.name}`);
    }

    const variant = dbItem.variants.find((v) => v.label === cartItem.variantLabel);
    if (!variant) {
      throw new OrderValidationError(`Invalid option selected for ${dbItem.name}`);
    }

    let selectedOptions = [];
    let selectedGroups = [];
    let price = variant.price;

    if (dbItem.optionGroups && dbItem.optionGroups.length) {
      const requested = Array.isArray(cartItem.selectedOptions) ? cartItem.selectedOptions : [];

      for (const group of dbItem.optionGroups) {
        const priceByLabel = new Map(group.choices.map((c) => [c.label, c.price || 0]));
        const selectedForGroup = requested.filter((opt) => priceByLabel.has(opt));

        if (selectedForGroup.length > group.max) {
          throw new OrderValidationError(`${dbItem.name}: choose at most ${group.max} for "${group.label}"`);
        }
        if (group.required && selectedForGroup.length === 0) {
          throw new OrderValidationError(`${dbItem.name}: "${group.label}" is required`);
        }

        for (const label of selectedForGroup) {
          price += priceByLabel.get(label);
          selectedOptions.push(label);
        }
        if (selectedForGroup.length) {
          selectedGroups.push({ label: group.label, choices: selectedForGroup });
        }
      }
      price = round2(price);
    } else if (dbItem.customization) {
      const requestedRemoved = Array.isArray(cartItem.removedToppings) ? cartItem.removedToppings : [];
      const requestedAdded = Array.isArray(cartItem.addedToppings) ? cartItem.addedToppings : [];

      const removedToppings = requestedRemoved.filter((t) => dbItem.customization.defaultToppings.includes(t));
      const addedToppings = requestedAdded.filter((t) => dbItem.customization.availableToppings.includes(t));

      price = round2(price + addedToppings.length * dbItem.customization.extraToppingPrice);
      selectedOptions = [
        ...removedToppings.map((t) => `No ${t}`),
        ...addedToppings.map((t) => `Extra ${t} (+£${dbItem.customization.extraToppingPrice.toFixed(2)})`),
      ];
    }

    orderItems.push({
      menuItem: dbItem._id,
      name: dbItem.name,
      variantLabel: variant.label,
      price,
      quantity,
      selectedOptions,
      selectedGroups,
    });
  }

  return orderItems;
}

function computeTotals(orderItems, orderType) {
  const subtotal = round2(orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0));
  const discount = round2(subtotal * ONLINE_DISCOUNT_RATE);
  const deliveryFee = orderType === 'Delivery' && subtotal < FREE_DELIVERY_THRESHOLD ? DELIVERY_FEE : 0;
  const total = round2(subtotal - discount + deliveryFee);
  return { subtotal, discount, deliveryFee, total };
}

module.exports = {
  buildOrderItems,
  computeTotals,
  OrderValidationError,
  FREE_DELIVERY_THRESHOLD,
  DELIVERY_FEE,
  ONLINE_DISCOUNT_RATE,
  MIN_DELIVERY_ORDER,
};
