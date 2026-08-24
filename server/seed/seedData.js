function freeChoices(labels) {
  return labels.map((label) => ({ label, price: 0 }));
}

function pricedChoice(label, price) {
  return { label, price };
}

const FLAVOUR_OPTIONS = {
  label: 'Choose your flavour',
  choices: freeChoices(['Mild', 'Peri Peri', 'Hot', 'Lemon & Herb']),
  max: 1,
  required: true,
};

const GRILL_SIDE_CHOICE = {
  label: 'Choose your side',
  choices: freeChoices(['Fries', 'Naan', 'Steamed Rice', 'Spicy Rice']),
  max: 1,
  required: true,
};

const STANDARD_DRINKS = [
  ...freeChoices([
    'Coke',
    'Sprite',
    'Coke Zero',
    'Rubican Mango',
    'Rubican Passion',
    'Rubican Guava',
    'Fanta Orange',
    'Diet Coke',
    'Fanta Fruit Twist',
    'Ayran',
    'Water',
  ]),
  pricedChoice('Red Bull', 1),
  pricedChoice('Oasis Citrus', 1),
  pricedChoice('Oasis Summer Fruit', 1),
];

const DRINK_CHOICE_1 = { label: 'Choose your drink', choices: STANDARD_DRINKS, max: 1, required: true };
const DRINK_CHOICE_2 = { label: 'Choose your 2 drinks', choices: STANDARD_DRINKS, max: 2, required: true };

const BOTTLE_DRINK_CHOICE = {
  label: 'Choose your 1.5L drink',
  choices: freeChoices(['Coke', 'Diet Coke', 'Tango Orange', '7up']),
  max: 1,
  required: true,
};

const SALAD_OPTIONS = {
  label: 'Choose your salad',
  choices: freeChoices(['Lettuce', 'Onion', 'Tomato', 'Green Chili', 'Cucumber', 'Gherkins', 'Crispy Onion', 'Jalapenos']),
  max: 8,
  required: false,
};

const SAUCE_OPTIONS = {
  label: 'Choose your sauces',
  choices: freeChoices([
    'Smoky BBQ',
    'Garlic Mayo',
    'Mayo',
    'Mint Yogurt',
    'Inferno',
    'Spicy Algerian',
    'Sweet Chili',
    'Ketchup',
    'Hot Stuff',
    'Ranch',
  ]),
  max: 10,
  required: false,
};

const EXTRA_PATTY_OPTION = {
  label: 'Extras',
  choices: [pricedChoice('Extra Patty', 1.5)],
  max: 1,
  required: false,
};

const BURGER_OPTION_GROUPS = [SALAD_OPTIONS, SAUCE_OPTIONS];

const KIDS_MEAL_BURGER_CHOICE = {
  label: 'Choose your burger',
  choices: freeChoices(['Zinger Burger', 'Cheeseburger']),
  max: 1,
  required: true,
};

const MAIN_CHOICE = {
  label: 'Choose your main',
  choices: freeChoices(['Burger', 'Kebab', 'Wrap']),
  max: 1,
  required: true,
};

const SIDES_PICK_TWO = {
  label: 'Choose 2 sides',
  choices: freeChoices([
    'Naan',
    'Steamed Rice',
    'Saffron Rice',
    'Spicy Rice',
    'Onion Rings (8)',
    'Chilli Cheesy Bites (6)',
    'Samosa',
    'Mozzarella Sticks (6)',
    '1 Pc Chicken',
    '2 Pcs Chicken',
    '3 Pcs Chicken',
    'Fries',
    'Cheesy Fries',
    'Peri Fries',
    'Garlic Bread',
    'Fried Wings',
    'Tenders',
  ]),
  max: 2,
  required: true,
};

const PIZZA_TOPPINGS = [
  'Red Onions',
  'Mixed Peppers',
  'Sweetcorn',
  'Green Chillies',
  'Olives',
  'Mushrooms',
  'Jalapenos',
  'Pineapple',
  'Pepperoni',
  'Turkey Ham',
  'Tandoori Chicken',
  'Lamb Donner',
  'Chicken Donner',
  'Minced Meat',
  'Mediterranean Chicken',
];

const PIZZA_SIZES = [
  { label: '8" Regular', price: 5.99 },
  { label: '12" Large', price: 9.99 },
  { label: '16" X-Large', price: 12.99 },
  { label: '20" Ultimate', price: 17.99 },
];

// The Crown Pizza is its own signature line with its own sizes (no Regular) and its own topping
// list, separate from the standard PIZZA_TOPPINGS used by the build-your-own-style pizzas above.
const CROWN_PIZZA_SIZES = [
  { label: 'Large', price: 11.99 },
  { label: 'Extra Large', price: 15.99 },
  { label: 'Ultimate', price: 19.99 },
];

const CROWN_PIZZA_TOPPINGS = [
  "Bun 'n Dough Signature Sauce",
  'Mediterranean Chicken',
  'Crispy Chicken',
  'Red Onion',
  'Black Olives',
  'Sweetcorn',
  'Mixed Pepper',
  'Red Chilli Flakes',
  'Jalapenos',
];

const EXTRA_TOPPING_PRICE = 1.0;

function pizzaCustomization(defaultToppings) {
  return {
    defaultToppings,
    extraToppingPrice: EXTRA_TOPPING_PRICE,
    availableToppings: PIZZA_TOPPINGS.filter((t) => !defaultToppings.includes(t)),
  };
}

const DONNER_CHOICE = {
  label: 'Choose your donner',
  choices: freeChoices(['Chicken Donner', 'Lamb Donner']),
  max: 1,
  required: true,
};

const GRILL_STRIPS_OR_WINGS = {
  label: 'Choose your side',
  choices: freeChoices(['3 Grill Strips', '3 Grill Wings']),
  max: 1,
  required: true,
};

const SPICY_STRIPS_OR_WINGS = {
  label: 'Choose your side',
  choices: freeChoices(['2 Chicken Strips', '5 Chicken Wings']),
  max: 1,
  required: true,
};

function singlePrice(price) {
  return [{ label: 'Regular', price }];
}

function singleMeal(single, meal) {
  return [
    { label: 'Single', price: single },
    { label: 'Meal', price: meal },
  ];
}

function pexels(id) {
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=600`;
}

const CATEGORY_IMAGE = {
  'Popular Deals': pexels(1435907),
  Grilled: pexels(106343),
  Persian: pexels(53148),
  Parmesan: pexels(17429243),
  'Meal Deals': pexels(1435907),
  'Grill Munch Boxes': pexels(27703379),
  Pizza: pexels(1435907),
  'Build Your Own Pizza': pexels(1435907),
  Calzone: pexels(1435907),
  'Combo Munch Boxes': pexels(32991898),
  Burgers: pexels(2119758),
  Kebabs: pexels(53148),
  Wraps: pexels(4955219),
  Sides: pexels(12946719),
  'Sweet Treats': pexels(5386663),
  Milkshakes: pexels(3727250),
};

// Items that get a more specific photo than their category default.
const ITEM_IMAGE_OVERRIDE = {
  'Fried Wings': pexels(10648394),

  // Popular Deals
  'Tandoori Twist Pizza': pexels(315755),
  'Garlic Bread Pizza': pexels(1435907),
  'Margherita Pizza': pexels(14590497),
  '6 Wings': pexels(10648394),
  "Kid's Meal": pexels(32991898),

  // Pizzas — a distinct photo per pizza reflecting its actual toppings where a good match exists.
  Pollo: pexels(2619970),
  'Tandoori Twist': pexels(315755),
  'Fiery Chicken Fusion': pexels(1435907),
  'Heat & Meat': pexels(2619970),
  'Chicken Coma': pexels(315755),
  'Mexican Heatwave': pexels(1435907),
  Hawaiian: pexels(11710527),
  'Loaded Pepperoni': pexels(708587),
  'Meat Feast': pexels(2619970),
  'Chicken Crunch': pexels(315755),
  'Veggie Primo': pexels(1527602),
  'Veggie Inferno': pexels(1527602),
  Margherita: pexels(14590497),

  // Burgers — matched to each burger's actual patty.
  'Zinger Burger': pexels(11354334), // crispy chicken zinger patty
  Cheeseburger: pexels(7816894), // beef patty with cheese slice
  'Grilled Peri Peri Chicken': pexels(15029502), // grilled chicken patty with cheese
  'Veggie Burger': pexels(2300034),

  // Kebabs — loaded doner meat.
  'Chicken Donner (Kebab)': pexels(29306498),
  'Lamb Donner (Kebab)': pexels(29306499),
};

const rawItems = [
  // ---------- Popular Deals ----------
  {
    name: 'Tandoori Twist Pizza',
    description: 'Tandoori chicken, mixed peppers, red onion and sweetcorn on a 12" pizza — today\'s deal price.',
    category: 'Popular Deals',
    icon: '🍕',
    variants: [{ label: '12"', price: 9.99 }],
    customization: pizzaCustomization(['Tandoori Chicken', 'Mixed Peppers', 'Red Onions', 'Sweetcorn']),
    badge: '20% OFF',
  },
  {
    name: 'Garlic Bread Pizza',
    description: 'Garlic butter base with melted mozzarella and a sprinkle of herbs, on a 12" pizza.',
    category: 'Popular Deals',
    icon: '🍕',
    variants: [{ label: '12"', price: 9.99 }],
    customization: pizzaCustomization([]),
    badge: '20% OFF',
  },
  {
    name: 'Margherita Pizza',
    description: 'Tomato sauce, mozzarella cheese and herbs on a 12" pizza — today\'s deal price.',
    category: 'Popular Deals',
    icon: '🍕',
    variants: [{ label: '12"', price: 9.99 }],
    customization: pizzaCustomization([]),
    badge: '20% OFF',
  },
  {
    name: '6 Wings',
    description: 'Six flame-grilled wings tossed in your choice of flavour.',
    category: 'Popular Deals',
    icon: '🍗',
    variants: singlePrice(8.99),
    optionGroups: [FLAVOUR_OPTIONS],
    badge: 'BUY 1 GET 1',
  },
  {
    name: "Kid's Meal",
    description: '4 onion rings, 4 chilli cheese bites, a regular fries and your choice of Zinger or Cheeseburger.',
    category: 'Popular Deals',
    icon: '🍔',
    variants: singlePrice(11.99),
    optionGroups: [KIDS_MEAL_BURGER_CHOICE],
    badge: 'GREAT VALUE',
  },

  // ---------- Grilled (single/meal + flavour, side, and drink choice) ----------
  { name: 'Quarter Peri Peri Chicken', description: 'Meals are served with a choice of fries, naan or steamed rice and a drink.', category: 'Grilled', icon: '🍗', variants: singleMeal(5.99, 8.99), optionGroups: [FLAVOUR_OPTIONS, GRILL_SIDE_CHOICE, DRINK_CHOICE_1], popular: true },
  { name: 'Half Peri Peri Chicken', description: 'Meals are served with a choice of fries, naan or steamed rice and a drink.', category: 'Grilled', icon: '🍗', variants: singleMeal(7.99, 10.99), optionGroups: [FLAVOUR_OPTIONS, GRILL_SIDE_CHOICE, DRINK_CHOICE_1] },
  { name: 'Whole Peri Peri Chicken', description: 'Meals are served with a choice of fries, naan or steamed rice and a drink.', category: 'Grilled', icon: '🍗', variants: singleMeal(12.99, 15.99), optionGroups: [FLAVOUR_OPTIONS, GRILL_SIDE_CHOICE, DRINK_CHOICE_1], popular: true },
  { name: 'Grilled Chicken Wings x6', description: 'Meals are served with a choice of fries, naan or steamed rice and a drink.', category: 'Grilled', icon: '🍗', variants: singleMeal(4.99, 7.99), optionGroups: [FLAVOUR_OPTIONS, GRILL_SIDE_CHOICE, DRINK_CHOICE_1] },
  { name: 'Grilled Chicken Strips x6', description: 'Meals are served with a choice of fries, naan or steamed rice and a drink.', category: 'Grilled', icon: '🍗', variants: singleMeal(7.99, 10.99), optionGroups: [FLAVOUR_OPTIONS, GRILL_SIDE_CHOICE, DRINK_CHOICE_1] },
  { name: 'Lamb Chops x3', description: 'Meals are served with a choice of fries, naan or steamed rice and a drink.', category: 'Grilled', icon: '🍖', variants: singleMeal(9.99, 12.99), optionGroups: [FLAVOUR_OPTIONS, GRILL_SIDE_CHOICE, DRINK_CHOICE_1] },
  { name: 'Lamb Chops x5', description: 'Meals are served with a choice of fries, naan or steamed rice and a drink.', category: 'Grilled', icon: '🍖', variants: singleMeal(14.99, 17.99), optionGroups: [FLAVOUR_OPTIONS, GRILL_SIDE_CHOICE, DRINK_CHOICE_1] },
  { name: "Chick 'n' Rice", description: 'Meals are served with a choice of fries, naan or steamed rice and a drink.', category: 'Grilled', icon: '🍗', variants: singleMeal(4.99, 7.99), optionGroups: [FLAVOUR_OPTIONS, GRILL_SIDE_CHOICE, DRINK_CHOICE_1] },
  { name: 'Grilled Chicken Salad', description: 'Meals are served with a choice of fries, naan or steamed rice and a drink.', category: 'Grilled', icon: '🥗', variants: singleMeal(4.99, 7.99), optionGroups: [FLAVOUR_OPTIONS, GRILL_SIDE_CHOICE, DRINK_CHOICE_1] },

  // ---------- Persian (small = 1 skewer / large = 2 skewers) ----------
  { name: 'Kebab Koobideh', description: 'Seasoned lamb skewers (lamb & beef) served with saffron rice and a grilled tomato.', category: 'Persian', icon: '🍢', variants: [{ label: 'Small (1 skewer)', price: 7.99 }, { label: 'Large (2 skewers)', price: 12.99 }], popular: true },
  { name: 'Joojeh Kebab', description: 'Marinated grilled chicken skewers served with saffron rice and a side salad.', category: 'Persian', icon: '🍢', variants: [{ label: 'Small (1 skewer)', price: 7.99 }, { label: 'Large (2 skewers)', price: 12.99 }] },
  { name: 'Makhloot Kebab', description: 'Persian Mixed Grill — 1 Koobideh, 1 Joojeh skewer & 3 Lamb Chops served with saffron rice and a grilled tomato.', category: 'Persian', icon: '🍢', variants: [{ label: 'Small (1 skewer)', price: 13.99 }, { label: 'Large (2 skewers)', price: 21.99 }] },
  { name: 'Ghormeh Sabzi', description: 'A Persian herb stew with lamb, kidney beans and dried lime, served with saffron rice.', category: 'Persian', icon: '🍲', variants: singlePrice(10.99) },

  // ---------- Parmesan (loaded fries-style melts; can upgrade to a meal for +£2.99 via notes) ----------
  { name: 'Inferno', description: 'Topped with peppers, jalapeños and chilli flakes, inferno sauce finished with a double cheese melt. Upgrade to a meal (fries & a drink) for +£2.99 — mention it in your order notes.', category: 'Parmesan', icon: '🧀', variants: singlePrice(9.99), popular: true },
  { name: 'Sweet Chilli', description: 'Topped with onions, peppers and jalapeños, sweet chilli sauce finished with a cheese melt. Upgrade to a meal (fries & a drink) for +£2.99 — mention it in your order notes.', category: 'Parmesan', icon: '🧀', variants: singlePrice(9.99) },
  { name: 'Pepperoni Melt', description: 'Topped with pepperoni sauce and crispy beef pepperoni, finished with a double cheese melt. Upgrade to a meal (fries & a drink) for +£2.99 — mention it in your order notes.', category: 'Parmesan', icon: '🧀', variants: singlePrice(9.99) },
  { name: 'BBQ Donner Melt', description: 'Topped with grilled donner, mushrooms and barbecue sauce, finished with a double cheese melt. Upgrade to a meal (fries & a drink) for +£2.99 — mention it in your order notes.', category: 'Parmesan', icon: '🧀', variants: singlePrice(9.99) },
  { name: 'Loaded Shroom', description: 'Topped with grilled chicken and mushrooms. Upgrade to a meal (fries & a drink) for +£2.99 — mention it in your order notes.', category: 'Parmesan', icon: '🧀', variants: singlePrice(9.99) },
  { name: 'Algerian', description: 'Topped with smoked brisket with a double cheese melt. Upgrade to a meal (fries & a drink) for +£2.99 — mention it in your order notes.', category: 'Parmesan', icon: '🧀', variants: singlePrice(9.99) },

  // ---------- Meal Deals ----------
  { name: 'Solo Pizza Feast', description: '8" small pizza, regular fries and a drink.', category: 'Meal Deals', icon: '🎉', variants: singlePrice(8.99), optionGroups: [DRINK_CHOICE_1] },
  { name: 'Duo Delight', description: '12" medium pizza, a kebab, 2 drinks. Add your kebab choice in the order notes.', category: 'Meal Deals', icon: '🎉', variants: singlePrice(12.99), popular: true, optionGroups: [DRINK_CHOICE_2] },
  { name: 'Ultimate Feast', description: '16" pizza, choice of burger, kebab or wrap, choice of any 2 sides, and a 1.5L bottle of drink.', category: 'Meal Deals', icon: '🎉', variants: singlePrice(21.99), optionGroups: [MAIN_CHOICE, SIDES_PICK_TWO, BOTTLE_DRINK_CHOICE] },

  // ---------- Grill Munch Boxes ----------
  {
    name: 'Classic Munch Box',
    description: 'Our signature burger with 3 crispy chicken strips, your choice of chicken or lamb donner, golden fries and a drink — a hearty classic done right.',
    category: 'Grill Munch Boxes',
    icon: '📦',
    variants: singlePrice(10.99),
    optionGroups: [DONNER_CHOICE],
  },
  {
    name: 'Grill Munch Box',
    description: 'A flame-grilled burger paired with your choice of 3 Grill Strips or 3 Grill Wings, served with golden fries and a drink.',
    category: 'Grill Munch Boxes',
    icon: '📦',
    variants: singlePrice(10.99),
    optionGroups: [GRILL_STRIPS_OR_WINGS],
    popular: true,
  },
  {
    name: 'Spicy Munch Box',
    description: 'Our fiery spicy dip burger with your choice of 2 chicken strips or 5 chicken wings, served alongside spicy rice and a drink.',
    category: 'Grill Munch Boxes',
    icon: '📦',
    variants: singlePrice(10.99),
    optionGroups: [SPICY_STRIPS_OR_WINGS],
  },
  {
    name: 'BBQ Munch Box',
    description: 'A smoky BBQ dip burger served with your choice of chicken or lamb donner, golden fries and a drink.',
    category: 'Grill Munch Boxes',
    icon: '📦',
    variants: singlePrice(10.99),
    optionGroups: [DONNER_CHOICE],
  },
  {
    name: 'Cheat Day Munch Box',
    description: 'Go all in — our indulgent cheat day burger, 3 crispy chicken strips, your choice of chicken or lamb donner, golden fries and a drink.',
    category: 'Grill Munch Boxes',
    icon: '📦',
    variants: singlePrice(12.99),
    optionGroups: [DONNER_CHOICE],
  },
  {
    name: 'Loaded Parmesan Box',
    description: 'Loaded parmesan fries piled high, with your choice of chicken or lamb donner and golden fries on the side.',
    category: 'Grill Munch Boxes',
    icon: '📦',
    variants: singlePrice(12.99),
    optionGroups: [DONNER_CHOICE],
  },
  {
    name: 'Smash Munch Box',
    description: 'Our house special smash burger with 3 crispy chicken strips, your choice of chicken or lamb donner, golden fries and a drink.',
    category: 'Grill Munch Boxes',
    icon: '📦',
    variants: singlePrice(12.99),
    optionGroups: [DONNER_CHOICE],
  },
  {
    name: 'Pizza Munch Box',
    description: 'Any regular 8" pizza paired with 2 crispy chicken strips, a burger and golden fries — the ultimate sharer for pizza and grill lovers.',
    category: 'Grill Munch Boxes',
    icon: '📦',
    variants: singlePrice(12.99),
  },

  // ---------- Pizza (fixed toppings, sizes 8"-20"; remove defaults free, add extras for £1 each) ----------
  { name: 'Pollo', description: 'Tomato sauce, mozzarella cheese, mediterranean chicken and sweetcorn.', category: 'Pizza', icon: '🍕', variants: PIZZA_SIZES, customization: pizzaCustomization(['Mediterranean Chicken', 'Sweetcorn']) },
  { name: 'Tandoori Twist', description: 'Tomato sauce, mozzarella cheese, tandoori chicken, mixed peppers, red onion and sweetcorn.', category: 'Pizza', icon: '🍕', variants: PIZZA_SIZES, popular: true, customization: pizzaCustomization(['Tandoori Chicken', 'Mixed Peppers', 'Red Onions', 'Sweetcorn']) },
  { name: 'Fiery Chicken Fusion', description: 'Tomato sauce, mozzarella cheese, tandoori chicken, chicken donner, mixed peppers, green chilli and jalapeno.', category: 'Pizza', icon: '🍕', variants: PIZZA_SIZES, customization: pizzaCustomization(['Tandoori Chicken', 'Chicken Donner', 'Mixed Peppers', 'Green Chillies', 'Jalapenos']) },
  { name: 'Heat & Meat', description: 'Tomato sauce, mozzarella cheese, lamb donner, chicken donner, mixed peppers, red onion and jalapeno.', category: 'Pizza', icon: '🍕', variants: PIZZA_SIZES, customization: pizzaCustomization(['Lamb Donner', 'Chicken Donner', 'Mixed Peppers', 'Red Onions', 'Jalapenos']) },
  { name: 'Chicken Coma', description: 'Tandoori chicken, mediterranean chicken, mixed peppers, olives and red onion.', category: 'Pizza', icon: '🍕', variants: PIZZA_SIZES, customization: pizzaCustomization(['Tandoori Chicken', 'Mediterranean Chicken', 'Mixed Peppers', 'Olives', 'Red Onions']) },
  { name: 'Mexican Heatwave', description: 'Tomato sauce, mozzarella cheese, minced meat, mushrooms, green chilli, red onion and jalapeño.', category: 'Pizza', icon: '🍕', variants: PIZZA_SIZES, customization: pizzaCustomization(['Minced Meat', 'Mushrooms', 'Green Chillies', 'Red Onions', 'Jalapenos']) },
  { name: 'Hawaiian', description: 'Tomato sauce, mozzarella cheese, turkey ham, pineapple and herbs.', category: 'Pizza', icon: '🍕', variants: PIZZA_SIZES, customization: pizzaCustomization(['Turkey Ham', 'Pineapple']) },
  { name: 'Loaded Pepperoni', description: 'Tomato sauce, mozzarella cheese, pepperoni and basil.', category: 'Pizza', icon: '🍕', variants: PIZZA_SIZES, popular: true, customization: pizzaCustomization(['Pepperoni']) },
  { name: 'Meat Feast', description: 'Tomato sauce, mozzarella cheese, lamb donner, turkey ham, pepperoni and minced meat.', category: 'Pizza', icon: '🍕', variants: PIZZA_SIZES, popular: true, customization: pizzaCustomization(['Lamb Donner', 'Turkey Ham', 'Pepperoni', 'Minced Meat']) },
  { name: 'Chicken Crunch', description: 'Tomato sauce, mozzarella cheese, crispy chicken, mixed peppers, sweetcorn, onion and green chilli.', category: 'Pizza', icon: '🍕', variants: PIZZA_SIZES, customization: pizzaCustomization(['Mixed Peppers', 'Sweetcorn', 'Red Onions', 'Green Chillies']) },
  { name: 'Veggie Primo', description: 'Tomato sauce, mozzarella cheese, mushrooms, mixed peppers, red onion and sweetcorn.', category: 'Pizza', icon: '🍕', variants: PIZZA_SIZES, customization: pizzaCustomization(['Mushrooms', 'Mixed Peppers', 'Red Onions', 'Sweetcorn']) },
  { name: 'Veggie Inferno', description: 'Tomato sauce, mozzarella cheese, mushrooms, mixed peppers, red onion, green chilli and jalapeno.', category: 'Pizza', icon: '🍕', variants: PIZZA_SIZES, customization: pizzaCustomization(['Mushrooms', 'Mixed Peppers', 'Red Onions', 'Green Chillies', 'Jalapenos']) },
  { name: 'Margherita', description: 'Tomato sauce, mozzarella cheese and herbs.', category: 'Pizza', icon: '🍕', variants: PIZZA_SIZES, customization: pizzaCustomization([]) },
  {
    name: "Bun 'n Dough Crown Pizza",
    description: "Our signature crown pizza — topped with Bun 'n Dough sauce and your choice of extras.",
    category: 'Pizza',
    icon: '🍕',
    variants: CROWN_PIZZA_SIZES,
    optionGroups: [
      { label: 'Choose your toppings', choices: freeChoices(CROWN_PIZZA_TOPPINGS), max: CROWN_PIZZA_TOPPINGS.length, required: false },
    ],
  },

  // ---------- Build Your Own Pizza ----------
  {
    name: 'Build Your Own Pizza',
    description: 'Choose your size and up to 4 toppings.',
    category: 'Build Your Own Pizza',
    icon: '🍕',
    variants: PIZZA_SIZES,
    optionGroups: [{ label: 'Choose up to 4 toppings', choices: freeChoices(PIZZA_TOPPINGS), max: 4, required: false }],
  },

  // ---------- Calzone (with any 3 toppings) ----------
  {
    name: 'Calzone',
    description: 'Folded pizza with any 3 toppings of your choice.',
    category: 'Calzone',
    icon: '🥟',
    variants: [
      { label: 'Regular', price: 6.99 },
      { label: 'Large', price: 10.99 },
    ],
    optionGroups: [{ label: 'Choose 3 toppings', choices: freeChoices(PIZZA_TOPPINGS), max: 3, required: false }],
  },

  // ---------- Combo Munch Boxes (pizza-based combos) ----------
  { name: 'Regular Munch Box', description: 'Any regular pizza served alongside a burger, 2 crispy chicken strips, golden fries and a drink.', category: 'Combo Munch Boxes', icon: '📦', variants: singlePrice(12.99) },
  { name: 'Large Munch Box', description: 'Any large pizza served alongside a burger, 2 crispy chicken strips, golden fries and a drink — perfect for sharing.', category: 'Combo Munch Boxes', icon: '📦', variants: singlePrice(16.99), popular: true },
  { name: 'Supreme Munch Box', description: 'An extra large pizza paired with a burger, 2 crispy chicken strips, golden fries and a drink.', category: 'Combo Munch Boxes', icon: '📦', variants: singlePrice(18.99) },
  { name: 'Family Size Munch Box', description: 'Our biggest box — a 16" extra large pizza, 2 burgers, 4 crispy chicken strips, golden fries and a 1.5L bottle of drink, built to feed the whole family.', category: 'Combo Munch Boxes', icon: '📦', variants: singlePrice(24.99) },

  // ---------- Burgers (single/meal; meals served with fries and a drink; salad + sauce on every burger) ----------
  { name: 'Cheeseburger', description: 'A juicy beef patty topped with a melted cheese slice, fresh lettuce and tomato. Meals are served with fries and a drink.', category: 'Burgers', icon: '🍔', variants: singleMeal(4.99, 7.99), popular: true, optionGroups: [SALAD_OPTIONS, SAUCE_OPTIONS, EXTRA_PATTY_OPTION] },
  { name: 'Zinger Burger', description: 'A crispy chicken zinger patty in a soft bun with fresh salad. Meals are served with fries and a drink.', category: 'Burgers', icon: '🍔', variants: singleMeal(5.49, 8.49), optionGroups: BURGER_OPTION_GROUPS },
  { name: 'Donner Burger', description: 'Meals are served with fries and a drink.', category: 'Burgers', icon: '🍔', variants: singleMeal(5.49, 8.49), optionGroups: BURGER_OPTION_GROUPS },
  { name: 'Grilled Peri Peri Chicken', description: 'A flame-grilled peri peri chicken patty topped with a melted cheese slice. Meals are served with fries and a drink.', category: 'Burgers', icon: '🍔', variants: singleMeal(6.49, 9.49), optionGroups: BURGER_OPTION_GROUPS },
  { name: 'Mixed Donner Burger', description: 'Meals are served with fries and a drink.', category: 'Burgers', icon: '🍔', variants: singleMeal(6.49, 9.49), optionGroups: BURGER_OPTION_GROUPS },
  { name: 'Cheat Day Burger', description: 'Meals are served with fries and a drink.', category: 'Burgers', icon: '🍔', variants: singleMeal(8.49, 11.49), popular: true, optionGroups: BURGER_OPTION_GROUPS },
  { name: 'Veggie Burger', description: 'A plant-based patty with fresh salad in a soft bun. Meals are served with fries and a drink.', category: 'Burgers', icon: '🥬', variants: singleMeal(4.99, 7.99), optionGroups: BURGER_OPTION_GROUPS },

  // ---------- Kebabs (regular served with fries, large served with fries and a drink) ----------
  { name: 'Chicken Donner (Kebab)', description: 'Sliced chicken donner meat, regular served with fries, large served with fries and a drink.', category: 'Kebabs', icon: '🍢', variants: [{ label: 'Regular', price: 4.99 }, { label: 'Large', price: 7.99 }] },
  { name: 'Lamb Donner (Kebab)', description: 'Sliced lamb donner meat, regular served with fries, large served with fries and a drink.', category: 'Kebabs', icon: '🍢', variants: [{ label: 'Regular', price: 4.99 }, { label: 'Large', price: 7.99 }] },
  { name: 'Donner Combo (Kebab)', description: 'A mix of chicken and lamb donner, regular served with fries, large served with fries and a drink.', category: 'Kebabs', icon: '🍢', variants: [{ label: 'Regular', price: 5.99 }, { label: 'Large', price: 8.99 }], popular: true },

  // ---------- Wraps (single/meal; meals served with fries and a drink) ----------
  { name: 'Chicken Donner Wrap', description: 'Meals are served with fries and a drink.', category: 'Wraps', icon: '🌯', variants: singleMeal(4.99, 7.99) },
  { name: 'Lamb Donner Wrap', description: 'Meals are served with fries and a drink.', category: 'Wraps', icon: '🌯', variants: singleMeal(4.99, 7.99) },
  { name: 'Donner Combo Wrap', description: 'Meals are served with fries and a drink.', category: 'Wraps', icon: '🌯', variants: singleMeal(5.99, 8.99) },
  { name: 'Peri Peri Chicken Wrap', description: 'Meals are served with fries and a drink.', category: 'Wraps', icon: '🌯', variants: singleMeal(4.99, 7.49), popular: true },
  { name: 'Vegie Wrap', description: 'Meals are served with fries and a drink.', category: 'Wraps', icon: '🥬', variants: singleMeal(4.99, 7.49) },

  // ---------- Sides ----------
  { name: 'Naan', description: 'Freshly baked naan bread.', category: 'Sides', icon: '🫓', variants: singlePrice(1.99) },
  { name: 'Steamed Rice', description: 'Steamed white rice.', category: 'Sides', icon: '🍚', variants: singlePrice(2.99) },
  { name: 'Saffron Rice', description: 'Fragrant saffron rice.', category: 'Sides', icon: '🍚', variants: singlePrice(2.99) },
  { name: 'Spicy Rice', description: 'Rice cooked with a spicy kick.', category: 'Sides', icon: '🍚', variants: singlePrice(2.99) },
  { name: 'Onion Rings (8)', description: 'Battered onion rings, fried until crunchy.', category: 'Sides', icon: '🧅', variants: singlePrice(2.99) },
  { name: 'Chilli Cheesy Bites (6)', description: 'Cheese-filled bites with a chilli kick.', category: 'Sides', icon: '🌶️', variants: singlePrice(3.99) },
  { name: 'Samosa', description: 'Crispy pastry parcel.', category: 'Sides', icon: '🥟', variants: singlePrice(1.79) },
  { name: 'Mozzarella Sticks (6)', description: 'Golden fried mozzarella sticks.', category: 'Sides', icon: '🧀', variants: singlePrice(3.99) },
  { name: '1 Pc Chicken', description: 'Crispy fried chicken piece.', category: 'Sides', icon: '🍗', variants: singlePrice(2.99) },
  { name: '2 Pcs Chicken', description: 'Crispy fried chicken pieces.', category: 'Sides', icon: '🍗', variants: singlePrice(4.99) },
  { name: '3 Pcs Chicken', description: 'Crispy fried chicken pieces.', category: 'Sides', icon: '🍗', variants: singlePrice(6.99) },
  { name: 'Fries', description: 'Crispy golden fries.', category: 'Sides', icon: '🍟', variants: [{ label: 'Regular', price: 2.99 }, { label: 'Large', price: 3.99 }], popular: true },
  { name: 'Cheesy Fries', description: 'Fries loaded with melted cheese.', category: 'Sides', icon: '🍟', variants: singlePrice(3.99) },
  { name: 'Peri Fries', description: 'Fries tossed in peri peri seasoning.', category: 'Sides', icon: '🍟', variants: singlePrice(3.99) },
  { name: 'Garlic Bread', description: 'Toasted bread with garlic butter.', category: 'Sides', icon: '🍞', variants: [{ label: 'Regular', price: 4.99 }, { label: 'Large', price: 7.99 }] },
  { name: 'Fried Wings', description: 'Crispy fried chicken wings.', category: 'Sides', icon: '🍗', variants: [{ label: '6 Wings', price: 5.0 }, { label: '10 Wings', price: 8.0 }] },
  { name: 'Tenders', description: 'Hand-breaded chicken tenders.', category: 'Sides', icon: '🍗', variants: [{ label: '4 Tenders', price: 3.99 }, { label: '10 Tenders', price: 7.99 }] },

  // ---------- Sweet Treats ----------
  { name: 'Concrete Cake', description: 'Rich, dense chocolate cake.', category: 'Sweet Treats', icon: '🍰', variants: singlePrice(4.99) },
  { name: 'Sprinkle Cake', description: 'Vanilla sponge topped with sprinkles.', category: 'Sweet Treats', icon: '🍰', variants: singlePrice(4.99) },
  { name: 'Ultimate Brownie', description: 'Warm fudge brownie with a gooey center.', category: 'Sweet Treats', icon: '🍫', variants: singlePrice(4.99), popular: true },
  { name: 'Double Chocolate Fudge Cake', description: 'Layered chocolate fudge cake.', category: 'Sweet Treats', icon: '🍫', variants: singlePrice(4.99) },
  { name: 'White Chocolate Cookie Dough', description: 'Warm cookie dough loaded with white chocolate.', category: 'Sweet Treats', icon: '🍪', variants: singlePrice(4.99) },
  { name: 'Milk Chocolate Cookie Dough', description: 'Warm cookie dough loaded with milk chocolate.', category: 'Sweet Treats', icon: '🍪', variants: singlePrice(6.49) },
  { name: 'Ferrero Rocher Cookie Dough', description: 'Warm cookie dough topped with Ferrero Rocher.', category: 'Sweet Treats', icon: '🍪', variants: singlePrice(7.99) },
  { name: 'Kinder Bueno Cookie Dough', description: 'Warm cookie dough topped with Kinder Bueno.', category: 'Sweet Treats', icon: '🍪', variants: singlePrice(7.99) },

  // ---------- Milkshakes ----------
  { name: 'Oreo Milkshake', description: 'Thick and creamy Oreo milkshake.', category: 'Milkshakes', icon: '🥤', variants: singlePrice(4.99), popular: true },
  { name: 'Kinder Bueno Milkshake', description: 'Thick and creamy Kinder Bueno milkshake.', category: 'Milkshakes', icon: '🥤', variants: singlePrice(4.99) },
  { name: 'Ferrero Rocher Milkshake', description: 'Thick and creamy Ferrero Rocher milkshake.', category: 'Milkshakes', icon: '🥤', variants: singlePrice(4.99) },
  { name: 'Biscoff Milkshake', description: 'Thick and creamy Biscoff milkshake.', category: 'Milkshakes', icon: '🥤', variants: singlePrice(4.99) },
];

module.exports = rawItems.map((item) => ({
  ...item,
  image: ITEM_IMAGE_OVERRIDE[item.name] || CATEGORY_IMAGE[item.category],
}));
