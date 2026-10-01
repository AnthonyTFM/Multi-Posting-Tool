// First-run menu + FAQ. After first boot, edit everything in /admin.
//
// `verified: true`  = price/description found on omuriceramen.com.
// `verified: false` = estimated (DoorDash price ÷ 1.2 markup) or placeholder.
// Unverified items show an amber "verify" badge in /admin/menu. Confirm or fix
// every one before launch.

import type { Art, MenuItem, OptionGroup } from "./menu-types.ts";

type SeedItem = Omit<MenuItem, "categoryId" | "sort" | "image" | "soldOut" | "active" | "posPlu" | "tags" | "optionGroups" | "popular"> & {
  tags?: string[];
  optionGroups?: OptionGroup[];
  popular?: boolean;
};

const c = (dollars: number) => Math.round(dollars * 100);

const SPICE: OptionGroup = {
  id: "spice",
  name: "Spice level",
  min: 1,
  max: 1,
  choices: [
    { id: "mild", name: "Mild", priceCents: 0 },
    { id: "medium", name: "Medium", priceCents: 0 },
    { id: "spicy", name: "Spicy", priceCents: 0 },
    { id: "extra-spicy", name: "Extra spicy", priceCents: 0 },
  ],
};

const RAMEN_ADDONS: OptionGroup = {
  id: "ramen-addons",
  name: "Add toppings",
  min: 0,
  max: 6,
  choices: [
    { id: "chashu", name: "Extra pork chashu", priceCents: c(3) },
    { id: "egg", name: "Marinated soft egg", priceCents: c(1.5) },
    { id: "noodles", name: "Extra noodles", priceCents: c(2.5) },
    { id: "corn", name: "Sweet corn", priceCents: c(1) },
    { id: "bamboo", name: "Bamboo shoots", priceCents: c(1) },
    { id: "nori", name: "Extra nori", priceCents: c(1) },
  ],
};

const SUGAR: OptionGroup = {
  id: "sugar",
  name: "Sweetness",
  min: 1,
  max: 1,
  choices: [
    { id: "100", name: "100% (regular)", priceCents: 0 },
    { id: "75", name: "75%", priceCents: 0 },
    { id: "50", name: "50%", priceCents: 0 },
    { id: "25", name: "25%", priceCents: 0 },
    { id: "0", name: "0% (no sugar)", priceCents: 0 },
  ],
};

const ICE: OptionGroup = {
  id: "ice",
  name: "Ice",
  min: 1,
  max: 1,
  choices: [
    { id: "regular", name: "Regular ice", priceCents: 0 },
    { id: "less", name: "Less ice", priceCents: 0 },
    { id: "none", name: "No ice", priceCents: 0 },
  ],
};

const TOPPINGS: OptionGroup = {
  id: "toppings",
  name: "Toppings",
  min: 0,
  max: 3,
  choices: [
    { id: "tapioca", name: "Tapioca pearls", priceCents: c(0.75) },
    { id: "strawberry-pop", name: "Strawberry popping boba", priceCents: c(0.75) },
    { id: "mango-pop", name: "Mango popping boba", priceCents: c(0.75) },
    { id: "lychee-jelly", name: "Lychee jelly", priceCents: c(0.75) },
    { id: "pudding", name: "Egg pudding", priceCents: c(0.75) },
  ],
};

const DRINK_OPTIONS = [SUGAR, ICE, TOPPINGS];

export const SEED_CATEGORIES: { id: string; name: string; description: string; art: Art; items: SeedItem[] }[] = [
  {
    id: "omurice",
    name: "Omurice",
    description: "Our namesake: silky Japanese omelet folded over seasoned fried rice.",
    art: "omurice",
    items: [
      {
        id: "classic-omurice",
        name: "Classic Omurice",
        description: "Fluffy omelet over chicken fried rice, finished with your choice of sauce.",
        priceCents: c(14.99),
        verified: false,
        popular: true,
        optionGroups: [
          {
            id: "sauce",
            name: "Sauce",
            min: 1,
            max: 1,
            choices: [
              { id: "seal", name: "Classic seal", priceCents: 0 },
              { id: "demi", name: "Demi-glace", priceCents: 0 },
              { id: "curry", name: "Japanese curry", priceCents: c(1) },
            ],
          },
        ],
      },
      {
        id: "katsu-omurice",
        name: "Chicken Katsu Omurice",
        description: "Crispy panko chicken cutlet on our signature omurice with demi-glace.",
        priceCents: c(16.99),
        verified: false,
      },
      {
        id: "curry-omurice",
        name: "Japanese Curry Omurice",
        description: "Omurice smothered in rich, slow-cooked Japanese curry.",
        priceCents: c(15.99),
        verified: false,
      },
      {
        id: "omusoba",
        name: "Omusoba (No Broth)",
        description:
          "Japanese-style stir-fried noodles with fresh cabbage, carrot, red onions, green onions and egg.",
        priceCents: c(14.99),
        verified: false,
        optionGroups: [
          {
            id: "protein",
            name: "Protein",
            min: 1,
            max: 1,
            choices: [
              { id: "veggie", name: "Veggies", priceCents: 0 },
              { id: "chicken", name: "Chicken", priceCents: 0 },
              { id: "shrimp", name: "Shrimp", priceCents: c(2) },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "ramen",
    name: "Ramen",
    description: "Broths simmered for hours. Fresh noodles. Generous toppings.",
    art: "ramen",
    items: [
      {
        id: "classic-tonkotsu",
        name: "Classic Tonkotsu Ramen",
        description:
          "Slow-simmered, rich pork bone broth topped with tender pork chashu, bamboo shoots, wakame seaweed, sweet corn, green onions, roasted nori and a marinated soft-boiled egg.",
        priceCents: c(16.99),
        verified: true,
        popular: true,
        tags: ["pork"],
        optionGroups: [RAMEN_ADDONS],
      },
      {
        id: "spicy-tonkotsu",
        name: "Spicy Tonkotsu Ramen",
        description: "Our classic tonkotsu with a house chili blend. Pick your heat.",
        priceCents: c(17.99),
        verified: false,
        tags: ["pork", "spicy"],
        optionGroups: [SPICE, RAMEN_ADDONS],
      },
      {
        id: "black-garlic-tonkotsu",
        name: "Black Garlic Tonkotsu Ramen",
        description: "Creamy tonkotsu finished with smoky roasted black garlic oil.",
        priceCents: c(16.99),
        verified: false,
        popular: true,
        tags: ["pork"],
        optionGroups: [RAMEN_ADDONS],
      },
      {
        id: "tokyo-shoyu",
        name: "Tokyo Shoyu Ramen",
        description: "Clear, savory soy-sauce broth in the classic Tokyo style.",
        priceCents: c(17.99),
        verified: true,
        optionGroups: [RAMEN_ADDONS],
      },
      {
        id: "hokkaido-beef-shoyu",
        name: "Hokkaido Beef Shoyu Ramen",
        description: "Shoyu broth loaded with tender braised beef.",
        priceCents: c(18.99),
        verified: false,
        tags: ["beef"],
        optionGroups: [RAMEN_ADDONS],
      },
      {
        id: "shizuoka-chicken",
        name: "Shizuoka Chicken Ramen",
        description: "Light, golden chicken broth with tender chicken.",
        priceCents: c(17.99),
        verified: false,
        tags: ["chicken"],
        optionGroups: [RAMEN_ADDONS],
      },
      {
        id: "karaage-ramen",
        name: "Karaage Ramen",
        description:
          "Crispy Japanese fried chicken over savory chicken broth, topped with a marinated soft-boiled egg, fish cake, nori, sweet corn, wood ear mushrooms, green onion and bamboo shoots.",
        priceCents: c(16.99),
        verified: true,
        tags: ["chicken"],
        optionGroups: [RAMEN_ADDONS],
      },
      {
        id: "kimchi-ramen",
        name: "Korean Kimchi Ramen",
        description: "Tangy, spicy kimchi broth with a kick.",
        priceCents: c(16.99),
        verified: true,
        tags: ["spicy"],
        optionGroups: [SPICE, RAMEN_ADDONS],
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
        description: "Crispy bite-sized chicken tossed in savory salt & pepper seasoning.",
        priceCents: c(8.49),
        verified: true,
        popular: true,
      },
      {
        id: "omurice-bao",
        name: "Omurice Bao Bun (1)",
        description: "Soft steamed bao filled with braised pork or chicken, fresh vegetables and our signature Omurice sauce.",
        priceCents: c(4.5),
        verified: true,
        optionGroups: [
          {
            id: "filling",
            name: "Filling",
            min: 1,
            max: 1,
            choices: [
              { id: "pork", name: "Braised pork", priceCents: 0 },
              { id: "chicken", name: "Chicken", priceCents: 0 },
            ],
          },
        ],
      },
      {
        id: "takoyaki",
        name: "Takoyaki (6 pcs)",
        description: "Classic octopus fritters topped with bonito flakes, aonori seaweed, mayo and takoyaki sauce.",
        priceCents: c(8.99),
        verified: true,
        tags: ["seafood"],
      },
      {
        id: "fried-gyoza",
        name: "Deep Fried Gyoza (6 pcs)",
        description: "Golden crispy gyoza topped with scallions, nori flakes and toasted sesame seeds.",
        priceCents: c(7.49),
        verified: true,
      },
    ],
  },
  {
    id: "signature-boba",
    name: "Signature Boba",
    description: "Handcrafted milk teas. Customize sweetness, ice and toppings.",
    art: "boba",
    items: [
      { id: "classic-milk-tea", name: "Classic Milk Tea", description: "Black tea, creamy milk, chewy tapioca pearls.", priceCents: c(5.99), verified: false, popular: true, optionGroups: DRINK_OPTIONS },
      { id: "brown-sugar-boba", name: "Brown Sugar Boba Milk", description: "Caramelized brown sugar syrup with fresh milk and warm pearls.", priceCents: c(6.49), verified: false, popular: true, optionGroups: DRINK_OPTIONS },
      { id: "taro-milk-tea", name: "Taro Milk Tea", description: "Nutty, creamy taro with milk tea.", priceCents: c(5.99), verified: false, optionGroups: DRINK_OPTIONS },
      { id: "thai-milk-tea", name: "Thai Milk Tea", description: "Bold spiced Thai tea with a creamy finish.", priceCents: c(5.99), verified: false, optionGroups: DRINK_OPTIONS },
      { id: "matcha-milk-tea", name: "Matcha Milk Tea", description: "Earthy Japanese matcha with milk.", priceCents: c(6.49), verified: false, optionGroups: DRINK_OPTIONS },
    ],
  },
  {
    id: "fruit-tea",
    name: "Fruit Tea",
    description: "Bright, refreshing teas made with real fruit flavor.",
    art: "boba",
    items: [
      { id: "mango-fruit-tea", name: "Mango Fruit Tea", description: "", priceCents: c(5.49), verified: false, optionGroups: DRINK_OPTIONS },
      { id: "pineapple-jasmine", name: "Pineapple Jasmine Tea", description: "", priceCents: c(5.49), verified: false, optionGroups: DRINK_OPTIONS },
      { id: "green-apple-fruit-tea", name: "Green Apple Fruit Tea", description: "", priceCents: c(5.49), verified: false, optionGroups: DRINK_OPTIONS },
      { id: "peach-fruit-tea", name: "Peach Fruit Tea", description: "", priceCents: c(5.49), verified: false, optionGroups: DRINK_OPTIONS },
      { id: "strawberry-fruit-tea", name: "Strawberry Fruit Tea", description: "", priceCents: c(5.49), verified: false, optionGroups: DRINK_OPTIONS },
      { id: "passion-fruit-jasmine", name: "Passion Fruit Jasmine Tea", description: "", priceCents: c(5.49), verified: false, optionGroups: DRINK_OPTIONS },
    ],
  },
  {
    id: "yakult-tea",
    name: "Fruit Yakult Tea",
    description: "Fruit tea shaken with tangy, probiotic Yakult.",
    art: "boba",
    items: [
      { id: "mango-yakult", name: "Mango Yakult Tea", description: "", priceCents: c(5.99), verified: false, optionGroups: DRINK_OPTIONS },
      { id: "strawberry-yakult", name: "Strawberry Yakult Tea", description: "", priceCents: c(5.99), verified: false, optionGroups: DRINK_OPTIONS },
      { id: "green-apple-yakult", name: "Green Apple Yakult Tea", description: "", priceCents: c(5.99), verified: false, optionGroups: DRINK_OPTIONS },
    ],
  },
  {
    id: "dessert",
    name: "Dessert",
    description: "",
    art: "dessert",
    items: [
      { id: "mochi-ice-cream", name: "Mochi Ice Cream (3)", description: "Assorted flavors.", priceCents: c(4.99), verified: false },
    ],
  },
  {
    id: "soda",
    name: "Soda",
    description: "",
    art: "drink",
    items: [
      { id: "ramune", name: "Ramune", description: "Japanese marble soda.", priceCents: c(3.49), verified: false },
      { id: "canned-soda", name: "Canned Soda", description: "", priceCents: c(1.99), verified: false },
    ],
  },
];

// Owners should review every answer in /admin/faq before launch.
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
      "Omurice is a Japanese comfort classic: seasoned fried rice wrapped in a soft, fluffy omelet and finished with a sauce like seal, demi-glace or curry.",
  },
  {
    question: "Do you have vegetarian options?",
    answer:
      "Yes. Our Omusoba can be made with veggies, and our fruit teas and milk teas are vegetarian. Some broths and sauces contain pork, chicken or seafood, so please ask our staff about specific dishes.",
  },
  {
    question: "Do you have gluten-free or allergy-friendly options?",
    answer:
      "Our ramen noodles, gyoza, bao and many sauces contain wheat and soy. Our kitchen also handles egg, pork, shellfish, sesame and milk. We can't guarantee any dish is allergen-free. Please tell us about allergies when you order.",
  },
  {
    question: "Can I adjust the spice level?",
    answer: "Yes. Our spicy dishes come Mild, Medium, Spicy or Extra spicy. Pick when you order.",
  },
  {
    question: "Is there parking?",
    answer: "Yes, there is free parking in the lot right in front of the restaurant.",
  },
  {
    question: "Do you cater or take large orders?",
    answer:
      "Yes! For large or catering orders, please call us at least 24 hours ahead so our kitchen can plan for you.",
  },
];
