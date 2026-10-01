// First-run menu + FAQ, transcribed from the printed in-store menu (Oct 2026).
// After first boot, edit everything in /admin.

import type { Art, MenuItem, OptionGroup } from "./menu-types.ts";

type SeedItem = Omit<MenuItem, "categoryId" | "sort" | "image" | "soldOut" | "active" | "posPlu" | "tags" | "optionGroups" | "popular" | "verified"> & {
  tags?: string[];
  optionGroups?: OptionGroup[];
  popular?: boolean;
};

const c = (dollars: number) => Math.round(dollars * 100);
const free = (id: string, name: string) => ({ id, name, priceCents: 0 });

// "Extras" panel of the printed menu, offered on every ramen bowl.
const RAMEN_ADDONS: OptionGroup = {
  id: "ramen-addons",
  name: "Add extras",
  min: 0,
  max: 9,
  choices: [
    { id: "chashu-pork", name: "Pork chashu", priceCents: c(3.99) },
    { id: "chashu-chicken", name: "Chicken chashu", priceCents: c(3.99) },
    { id: "katsu", name: "Katsu", priceCents: c(4.99) },
    { id: "tofu", name: "Extra tofu", priceCents: c(2.99) },
    { id: "egg", name: "Soft-boiled egg", priceCents: c(3.25) },
    { id: "noodle", name: "Extra noodles", priceCents: c(3.25) },
    { id: "broth", name: "Extra broth", priceCents: c(4.99) },
    { id: "kimchi", name: "Kimchi", priceCents: c(1.99) },
    { id: "fishcake", name: "Extra fish cake", priceCents: c(1.5) },
  ],
};

const EXTRA_VEG: OptionGroup = {
  id: "extra-veg",
  name: "Extra vegetables ($1.50 each)",
  min: 0,
  max: 8,
  choices: [
    { id: "corn", name: "Corn", priceCents: c(1.5) },
    { id: "woodear", name: "Wood ear mushroom", priceCents: c(1.5) },
    { id: "bamboo", name: "Bamboo shoot", priceCents: c(1.5) },
    { id: "green-onion", name: "Green onion", priceCents: c(1.5) },
    { id: "garlic-chip", name: "Garlic chips", priceCents: c(1.5) },
    { id: "cabbage", name: "Cabbage", priceCents: c(1.5) },
    { id: "nori", name: "Nori (seaweed sheet)", priceCents: c(1.5) },
    { id: "onion", name: "Onion", priceCents: c(1.5) },
  ],
};

const RAMEN_OPTIONS = [RAMEN_ADDONS, EXTRA_VEG];

// "ADD-ON Toppings: available for all drinks"
const DRINK_TOPPINGS: OptionGroup = {
  id: "toppings",
  name: "Add toppings",
  min: 0,
  max: 3,
  choices: [
    { id: "brown-sugar-boba", name: "Brown sugar boba", priceCents: c(0.99) },
    { id: "lychee-jelly", name: "Lychee jelly", priceCents: c(0.99) },
    { id: "strawberry-popping", name: "Strawberry popping boba", priceCents: c(0.99) },
  ],
};

const MILK: OptionGroup = {
  id: "milk",
  name: "Milk",
  min: 1,
  max: 1,
  choices: [free("lactose-free", "Lactose-free milk"), { id: "oat", name: "Oat milk", priceCents: c(0.99) }],
};

const MAKE_SPICY: OptionGroup = { id: "spicy", name: "Make it spicy?", min: 0, max: 1, choices: [free("spicy", "Yes, make it spicy")] };

const OMURICE_SAUCE: OptionGroup = {
  id: "sauce",
  name: "Sauce",
  min: 1,
  max: 1,
  choices: [free("black-pepper", "Black pepper sauce"), free("demi", "Demi-glace")],
};

const OMURICE_RICE: OptionGroup = {
  id: "rice",
  name: "Rice",
  min: 1,
  max: 1,
  choices: [free("chicken-fried", "Chicken fried rice"), free("white", "White rice")],
};

const BOBA = (id: string, name: string, price: number, extra: Partial<SeedItem> = {}): SeedItem => ({
  id,
  name,
  description: "",
  priceCents: c(price),
  optionGroups: [DRINK_TOPPINGS],
  ...extra,
});

const FRUIT_TEA = (id: string, name: string): SeedItem => ({
  id,
  name,
  description: "Refreshing fruit tea. Add popping boba +$0.99.",
  priceCents: c(6.26),
  optionGroups: [DRINK_TOPPINGS],
});

export const SEED_CATEGORIES: { id: string; name: string; description: string; art: Art; items: SeedItem[] }[] = [
  {
    id: "omurice",
    name: "Omurice & Omusoba",
    description: "Our namesake: a fluffy Japanese omelet draped over savory fried rice.",
    art: "omurice",
    items: [
      {
        id: "classic-omurice",
        name: "Classic Omurice",
        description:
          "A delicate, fluffy Japanese omelet draped over savory house chicken fried rice, finished with your choice of bold black pepper sauce or rich demi-glace. White rice available on request.",
        priceCents: c(17.99),
        popular: true,
        optionGroups: [OMURICE_SAUCE, OMURICE_RICE],
      },
      {
        id: "katsu-omurice",
        name: "Katsu Omurice",
        description: "Our classic omurice topped with a golden, crispy pork cutlet.",
        priceCents: c(19.99),
        optionGroups: [OMURICE_SAUCE, OMURICE_RICE],
      },
      {
        id: "omusoba",
        name: "Omusoba (No Broth)",
        description:
          "Japanese-style stir-fried noodles with fresh cabbage, carrots, red onions, green onions and egg, wok-tossed in our rich, savory house sauce.",
        priceCents: c(14.99),
        optionGroups: [
          {
            id: "protein",
            name: "Protein",
            min: 1,
            max: 1,
            choices: [free("veggie", "Vegetables"), free("chicken", "Chicken"), { id: "shrimp", name: "Shrimp", priceCents: c(2) }],
          },
        ],
      },
    ],
  },
  {
    id: "ramen",
    name: "Ramen",
    description: "Slow-simmered broths, fresh noodles, generous toppings. Add extras to any bowl.",
    art: "ramen",
    items: [
      {
        id: "classic-tonkotsu",
        name: "Classic Tonkotsu Ramen",
        description:
          "A slow-simmered, rich and velvety pork bone broth layered with deep umami flavor. Topped with tender pork chashu, bamboo shoots, wakame seaweed, sweet corn, fresh green onions, roasted nori and a marinated soft-boiled egg.",
        priceCents: c(16.99),
        popular: true,
        tags: ["pork"],
        optionGroups: RAMEN_OPTIONS,
      },
      {
        id: "spicy-tonkotsu",
        name: "Spicy Tonkotsu Ramen",
        description: "All the richness of our classic tonkotsu, elevated with a house chili blend that adds a bold, warming heat.",
        priceCents: c(17.99),
        tags: ["pork", "spicy"],
        optionGroups: RAMEN_OPTIONS,
      },
      {
        id: "tokyo-shoyu",
        name: "Tokyo Shoyu Ramen",
        description:
          "A classic Tokyo-style ramen with a savory shoyu pork broth. Served with bamboo shoots, wood ear mushroom, half marinated egg, nori, sweet corn and scallions, topped with pork chashu or tonkatsu.",
        priceCents: c(16.99),
        tags: ["pork"],
        optionGroups: [
          { id: "topping", name: "Choice of topping", min: 1, max: 1, choices: [free("chashu", "Pork chashu"), { id: "katsu", name: "Tonkatsu", priceCents: c(2) }] },
          ...RAMEN_OPTIONS,
        ],
      },
      {
        id: "karaage-ramen",
        name: "Karaage Ramen",
        description:
          "Crispy Japanese fried chicken over a comforting, savory chicken broth, topped with a marinated soft-boiled egg, fish cake, nori, sweet corn, wood ear mushrooms, fresh green onions and bamboo shoots.",
        priceCents: c(16.99),
        tags: ["chicken"],
        optionGroups: RAMEN_OPTIONS,
      },
      {
        id: "kimchi-ramen",
        name: "Korean Kimchi Ramen",
        description:
          "A deeply savory pork broth layered with the bold, tangy heat of fermented kimchi. Finished with tender pork chashu, bamboo shoots, wood ear mushroom, sweet corn, fresh green onions, roasted nori and a marinated soft-boiled egg half. Naturally spicy.",
        priceCents: c(16.99),
        tags: ["pork", "spicy"],
        optionGroups: RAMEN_OPTIONS,
      },
      {
        id: "vegetable-ramen",
        name: "Gourmet Vegetable Ramen",
        description:
          "100% vegan. Rich, umami-packed vegetarian miso broth with vegetarian ramen noodles, delicate vegetable dumplings, golden crispy tofu, wood ear mushrooms, fresh broccoli, bamboo shoots, sweet corn, green onions and roasted nori.",
        priceCents: c(15.99),
        tags: ["vegan"],
        optionGroups: RAMEN_OPTIONS,
      },
      {
        id: "hokkaido-beef-shoyu",
        name: "Hokkaido Beef Shoyu Ramen",
        description:
          "A delicate, slow-simmered chicken broth with thinly sliced beef, marinated half soft-boiled egg, sweet corn, bamboo shoots, wood ear mushrooms, scallions and nori over fresh ramen noodles.",
        priceCents: c(18.99),
        tags: ["beef"],
        optionGroups: RAMEN_OPTIONS,
      },
      {
        id: "black-garlic-tonkotsu",
        name: "Black Garlic Tonkotsu Ramen",
        description:
          "Rich pork bone broth infused with black garlic oil, topped with pork chashu, bamboo shoots, wood ear mushrooms, half marinated egg, nori, sweet corn and scallions.",
        priceCents: c(16.99),
        popular: true,
        tags: ["pork"],
        optionGroups: RAMEN_OPTIONS,
      },
      {
        id: "sapporo-spicy-miso",
        name: "Sapporo Spicy Miso Ramen",
        description:
          "Savory, rich fermented miso pork broth with a warming spicy kick. Topped with pork chashu, bamboo shoots, wood ear mushrooms, half marinated egg, nori, sweet corn and scallions.",
        priceCents: c(16.99),
        tags: ["pork", "spicy"],
        optionGroups: RAMEN_OPTIONS,
      },
      {
        id: "osaka-shrimp",
        name: "Osaka Shrimp Ramen",
        description:
          "A savory pork broth topped with grilled shrimp, marinated half soft-boiled egg, sweet corn, bamboo shoots, wood ear mushrooms, nori, scallions and fish cake.",
        priceCents: c(19.99),
        tags: ["seafood"],
        optionGroups: RAMEN_OPTIONS,
      },
      {
        id: "shizuoka-chicken",
        name: "Shizuoka Chicken Ramen",
        description:
          "Light golden chicken broth topped with tender sliced chicken, marinated soft-boiled egg, sweet corn, bamboo shoots, wood ear mushrooms, nori and fresh green onions. Pure, balanced and deeply comforting.",
        priceCents: c(17.99),
        tags: ["chicken"],
        optionGroups: RAMEN_OPTIONS,
      },
    ],
  },
  {
    id: "combos",
    name: "Ramen Combos",
    description: "A bowl, a bite and a drink, for less.",
    art: "ramen",
    items: [
      {
        id: "ramen-crush-combo",
        name: "Ramen Crush Combo",
        description: "Pork Bao Bun (2 pc) + Sapporo Spicy Miso Ramen + Thai Iced Tea.",
        priceCents: c(28.99),
        tags: ["spicy"],
      },
      {
        id: "ramen-pop-combo",
        name: "Ramen Pop Combo",
        description: "Classic Tonkotsu Ramen + Popcorn Chicken + Strawberry Fruit Tea.",
        priceCents: c(27.99),
        popular: true,
      },
    ],
  },
  {
    id: "appetizers",
    name: "Appetizers",
    description: "Made to share. Or not.",
    art: "appetizer",
    items: [
      {
        id: "popcorn-chicken",
        name: "Popcorn Chicken",
        description: "Crispy bite-sized chicken tossed in savory salt and pepper seasoning. Spicy option available.",
        priceCents: c(8.49),
        popular: true,
        optionGroups: [MAKE_SPICY],
      },
      {
        id: "omurice-bao",
        name: "Omurice Bao Bun",
        description:
          "Soft steamed bao filled with your choice of braised pork or chicken, fresh vegetables and our signature Omurice sauce. Spicy option available.",
        priceCents: c(4.5),
        optionGroups: [
          { id: "size", name: "Size", min: 1, max: 1, choices: [free("1pc", "1 piece"), { id: "2pc", name: "2 pieces", priceCents: c(4.49) }] },
          { id: "filling", name: "Filling", min: 1, max: 1, choices: [free("pork", "Braised pork"), free("chicken", "Chicken")] },
          MAKE_SPICY,
        ],
      },
      {
        id: "takoyaki",
        name: "Takoyaki Octopus Balls (6 pc)",
        description: "Classic Japanese octopus fritters topped with bonito flakes, aonori seaweed, mayo and savory takoyaki sauce.",
        priceCents: c(8.99),
        tags: ["seafood"],
      },
      {
        id: "edamame",
        name: "Edamame",
        description: "Spicy garlic or simply steamed.",
        priceCents: c(5.99),
        optionGroups: [{ id: "style", name: "Style", min: 1, max: 1, choices: [free("spicy-garlic", "Spicy garlic"), free("steamed", "Steamed")] }],
      },
      {
        id: "shrimp-swirl-pops",
        name: "Shrimp Swirl Pops (3 pc)",
        description: "Golden, crispy panko-crusted shrimp skewers with our house-made dipping sauce and a fresh lemon wedge.",
        priceCents: c(8.99),
        tags: ["seafood"],
      },
      {
        id: "fried-gyoza",
        name: "Deep Fried Gyoza Dumplings (6 pc)",
        description: "Golden crispy gyoza topped with scallions, nori flakes and toasted sesame seeds, served with house-made dumpling sauce.",
        priceCents: c(7.49),
        optionGroups: [
          { id: "filling", name: "Filling", min: 1, max: 1, choices: [free("pork-chicken", "Pork & chicken"), free("vegetable", "Seasoned vegetable medley")] },
        ],
      },
      {
        id: "spring-rolls",
        name: "Vegetable Spring Rolls (5 pc)",
        description: "Crispy vegetable spring rolls served with sweet chili sauce.",
        priceCents: c(6.99),
        tags: ["vegetarian"],
      },
      {
        id: "fried-oyster",
        name: "Fried Oyster (5 pc)",
        description: "Fresh breaded oysters, deep-fried to golden perfection and served with dipping sauce.",
        priceCents: c(9.99),
        tags: ["seafood"],
      },
      {
        id: "cheese-sticks",
        name: "Fried Cheese Sticks (6 pc)",
        description: "Golden fried mozzarella sticks served with marinara sauce.",
        priceCents: c(6.5),
      },
      {
        id: "teppanyaki-squid",
        name: "Spicy Teppanyaki Squid",
        description: "Japanese-style sizzling grilled squid tossed in our house spicy sauce, topped with scallions and sesame.",
        priceCents: c(13.5),
        tags: ["seafood", "spicy"],
      },
      {
        id: "chicken-yakitori",
        name: "Chicken Yakitori (2 pc)",
        description: "Grilled chicken skewers brushed with house tare sauce.",
        priceCents: c(8.99),
      },
      {
        id: "spicy-chili-dumpling",
        name: "Spicy Chili Dumplings",
        description: "",
        priceCents: c(7.49),
        tags: ["spicy"],
      },
    ],
  },
  {
    id: "sides",
    name: "Sides & Extras",
    description: "Round out your bowl.",
    art: "appetizer",
    items: [
      { id: "green-salad", name: "Fresh Green Salad", description: "", priceCents: c(3.99) },
      {
        id: "side-rice",
        name: "Fried Rice or White Rice",
        description: "",
        priceCents: c(4.75),
        optionGroups: [{ id: "rice", name: "Rice", min: 1, max: 1, choices: [free("fried", "Fried rice"), free("white", "White rice")] }],
      },
      { id: "plain-ramen", name: "Plain Ramen", description: "", priceCents: c(7.99) },
    ],
  },
  {
    id: "signature-boba",
    name: "Signature Boba Tea",
    description: "Handcrafted brown sugar boba drinks. Add toppings to any drink.",
    art: "boba",
    items: [
      BOBA("brown-sugar-boba-fresh-milk", "Brown Sugar Boba w/ Fresh Milk", 7.75, {
        description: "Made with lactose-free milk (oat milk +$0.99). Gluten-free friendly.",
        popular: true,
        tags: ["gluten-free-friendly"],
        optionGroups: [MILK, DRINK_TOPPINGS],
      }),
      BOBA("brown-sugar-boba-matcha", "Brown Sugar Boba w/ Matcha", 7.5),
      BOBA("brown-sugar-boba-coffee", "Brown Sugar Boba w/ Blue Mountain Coffee", 7.95),
      BOBA("brown-sugar-boba-taro", "Brown Sugar Boba w/ Taro", 7.5),
      BOBA("brown-sugar-boba-mango", "Brown Sugar Boba w/ Mango", 7.5),
      BOBA("strawberry-tornado", "Strawberry Tornado", 7.75, {
        description: "Made with lactose-free milk (oat milk +$0.99). Gluten-free friendly.",
        popular: true,
        tags: ["gluten-free-friendly"],
        optionGroups: [MILK, DRINK_TOPPINGS],
      }),
      BOBA("brown-sugar-boba-straw-nana", "Brown Sugar Boba w/ Straw-Nana", 7.75),
      BOBA("brown-sugar-boba-thai", "Brown Sugar Boba w/ Thai Tea", 7.5),
      BOBA("brown-sugar-boba-banana", "Brown Sugar Boba w/ Banana", 7.5),
      BOBA("brown-sugar-boba-honeydew", "Brown Sugar Boba w/ Honeydew", 7.5),
      BOBA("brown-sugar-boba-coconut", "Brown Sugar Boba w/ Tropical Coconut", 7.5),
    ],
  },
  {
    id: "fruit-tea",
    name: "Fruit Tea",
    description: "Bright, refreshing teas. Add popping boba +$0.99.",
    art: "boba",
    items: [
      FRUIT_TEA("mango-fruit-tea", "Mango Fruit Tea"),
      FRUIT_TEA("pineapple-jasmine", "Pineapple Jasmine Tea"),
      FRUIT_TEA("green-apple-fruit-tea", "Green Apple Fruit Tea"),
      FRUIT_TEA("peach-fruit-tea", "Peach Fruit Tea"),
      FRUIT_TEA("strawberry-fruit-tea", "Strawberry Fruit Tea"),
      FRUIT_TEA("passion-fruit-jasmine", "Passion Fruit Jasmine Tea"),
    ],
  },
  {
    id: "yakult-tea",
    name: "Fruit Yakult Tea",
    description: "Naturally caffeine-free. Perfect for all ages.",
    art: "boba",
    items: [
      {
        id: "fruit-yakult-tea",
        name: "Fruit Yakult Tea",
        description: "Fruit tea shaken with tangy Yakult. Naturally caffeine-free. Add lychee jelly +$0.99.",
        priceCents: c(6.26),
        tags: ["caffeine-free"],
        optionGroups: [
          {
            id: "flavor",
            name: "Flavor",
            min: 1,
            max: 1,
            choices: [
              free("strawberry", "Strawberry"),
              free("peach", "Peach"),
              free("passion-fruit", "Passion fruit"),
              free("mango", "Mango"),
              free("pineapple", "Pineapple"),
              free("green-apple", "Green apple"),
            ],
          },
          DRINK_TOPPINGS,
        ],
      },
    ],
  },
  {
    id: "dessert",
    name: "Dessert",
    description: "Something sweet to finish.",
    art: "dessert",
    items: [
      {
        id: "mille-crepe",
        name: "Mille Crepe Cake",
        description: "Layers of delicate crepes and cream.",
        priceCents: c(7.99),
        optionGroups: [{ id: "flavor", name: "Flavor", min: 1, max: 1, choices: [free("mango", "Mango"), free("strawberry", "Strawberry"), free("matcha", "Matcha")] }],
      },
      { id: "strawberry-snow-bar", name: "Strawberry Snow Ice Bar", description: "", priceCents: c(7.99) },
      { id: "golden-mango-bar", name: "Golden Mango Ice Bar", description: "", priceCents: c(7.99) },
      { id: "white-peach-bar", name: "White Peach Blossom Ice Bar", description: "", priceCents: c(7.99) },
      { id: "mochi-ice-cream", name: "Mochi Ice Cream", description: "", priceCents: c(6.95) },
      { id: "brown-sugar-rice-cake", name: "Brown Sugar Rice Cake (5 pc)", description: "", priceCents: c(6.99) },
      { id: "taiyaki-ice-cream", name: "Taiyaki Ice Cream Sandwich", description: "Fish-shaped waffle filled with ice cream.", priceCents: c(6.99) },
    ],
  },
  {
    id: "drinks",
    name: "Soda & Ramune",
    description: "",
    art: "drink",
    items: [
      {
        id: "soda",
        name: "Soda",
        description: "",
        priceCents: c(2.99),
        optionGroups: [{ id: "soda", name: "Choose", min: 1, max: 1, choices: [free("coke", "Coke"), free("diet-coke", "Diet Coke"), free("sprite", "Sprite")] }],
      },
      {
        id: "ramune",
        name: "Japanese Ramune",
        description: "Classic Japanese marble soda. Multiple flavors available; add your favorite in the special requests.",
        priceCents: c(4.5),
      },
    ],
  },
];

export const CONSUMER_ADVISORY =
  "Consuming raw or undercooked meats, poultry, seafood, shellfish or eggs may increase your risk of foodborne illness. Please tell us about any food allergies.";

// Owners should review every answer in /admin/settings before launch.
export const SEED_FAQS: { question: string; answer: string }[] = [
  {
    question: "Do you take reservations?",
    answer:
      "We take reservations for groups of 6 or more. You can book on our website or by calling us. Parties of 5 or fewer are walk-in. Just come on in!",
  },
  {
    question: "How does online ordering work?",
    answer:
      "Order on our website or call us. Our AI host can take your order 24/7 for pickup during open hours. You pay when you pick up. Most orders are ready in about 20 minutes.",
  },
  {
    question: "How do I pay?",
    answer: "You pay at pickup in the restaurant. We accept cash and all major credit/debit cards.",
  },
  {
    question: "Do you deliver?",
    answer:
      "We don't run our own delivery. You can find us on DoorDash, but ordering pickup directly from us is cheaper than delivery-app prices.",
  },
  {
    question: "What is omurice?",
    answer:
      "Omurice is a Japanese comfort classic: a fluffy omelet draped over savory fried rice. Ours comes with house chicken fried rice (white rice on request) and your choice of black pepper sauce or demi-glace, plain or topped with a crispy pork katsu.",
  },
  {
    question: "Do you have combos?",
    answer:
      "Yes! The Ramen Pop Combo ($27.99) is Classic Tonkotsu Ramen, Popcorn Chicken and a Strawberry Fruit Tea. The Ramen Crush Combo ($28.99) is Sapporo Spicy Miso Ramen, 2 Pork Bao Buns and a Thai Iced Tea.",
  },
  {
    question: "Do you have vegan or vegetarian options?",
    answer:
      "Yes. Our Gourmet Vegetable Ramen is 100% vegan, made with a vegetarian miso broth, vegetarian noodles, vegetable dumplings and crispy tofu. Steamed Edamame, Vegetable Spring Rolls, vegetable gyoza and Omusoba with vegetables are meat-free choices. Our other broths contain pork or chicken. Please ask us to confirm sauces if you avoid animal products.",
  },
  {
    question: "Do you have lactose-free or dairy-free drinks?",
    answer:
      "Our Brown Sugar Boba w/ Fresh Milk and Strawberry Tornado are made with lactose-free milk, and you can switch to oat milk for $0.99. Both are gluten-free friendly. Fruit teas and Fruit Yakult Teas have no added milk.",
  },
  {
    question: "Anything caffeine-free for kids?",
    answer: "Our Fruit Yakult Teas (strawberry, peach, passion fruit, mango, pineapple, green apple) are naturally caffeine-free and perfect for all ages.",
  },
  {
    question: "Do you have gluten-free or allergy-friendly options?",
    answer:
      "Our ramen noodles, gyoza, bao, breaded items and many sauces contain wheat and soy, and our kitchen also handles egg, pork, shellfish, fish, sesame and milk. We can't guarantee any dish is allergen-free. Please tell us about any food allergies when you order. Our marinated eggs are soft-boiled; consuming raw or undercooked meats, poultry, seafood, shellfish or eggs may increase your risk of foodborne illness.",
  },
  {
    question: "Which dishes are spicy?",
    answer:
      "Spicy Tonkotsu, Korean Kimchi, Sapporo Spicy Miso, Spicy Teppanyaki Squid, Spicy Chili Dumplings and Spicy Garlic Edamame. Popcorn Chicken and Omurice Bao Buns can be made spicy on request.",
  },
  {
    question: "Can I add extra toppings to my ramen?",
    answer:
      "Yes: pork or chicken chashu ($3.99), katsu ($4.99), tofu ($2.99), soft-boiled egg ($3.25), extra noodles ($3.25), extra broth ($4.99), kimchi ($1.99), fish cake ($1.50), or extra vegetables ($1.50 each: corn, wood ear mushroom, bamboo shoot, green onion, garlic chips, cabbage, nori, onion).",
  },
  {
    question: "Is there parking?",
    answer: "Yes, there is free parking in the lot right in front of the restaurant.",
  },
  {
    question: "Do you cater or take large orders?",
    answer: "Yes! For large or catering orders, please call us at least 24 hours ahead so our kitchen can plan for you.",
  },
];
