// 8 Paper Goods SKUs — Dallas/Uptown market
// Aldi/Lidl carry limited name-brand paper goods; null = not stocked

export const SKUS = [
  {
    id: "bounty-sas-12",
    name: "Bounty Select-A-Size 12pk",
    brand: "Bounty",
    subcategory: "Paper Towels",
    segment: "premium",
    baseCost: 8.20,
    elasticity: -1.4,
    baseUnitsPerWeek: 90,
    pricing: {
      walmart: 14.97, kroger: 15.99, tomThumb: 16.49,
      centralMarket: 17.99, aldi: null, lidl: null
    },
    facings: {
      walmart: 6, kroger: 4, tomThumb: 3,
      centralMarket: 2, aldi: 0, lidl: 0
    }
  },
  {
    id: "bounty-ess-6",
    name: "Bounty Essentials 6pk",
    brand: "Bounty",
    subcategory: "Paper Towels",
    segment: "mid",
    baseCost: 4.10,
    elasticity: -1.9,
    baseUnitsPerWeek: 60,
    pricing: {
      walmart: 7.47, kroger: 7.99, tomThumb: 8.29,
      centralMarket: null, aldi: null, lidl: null
    },
    facings: {
      walmart: 4, kroger: 3, tomThumb: 2,
      centralMarket: 0, aldi: 0, lidl: 0
    }
  },
  {
    id: "charmin-ultra-24",
    name: "Charmin Ultra Soft 24-roll",
    brand: "Charmin",
    subcategory: "Toilet Paper",
    segment: "premium",
    baseCost: 10.40,
    elasticity: -1.3,
    baseUnitsPerWeek: 110,
    pricing: {
      walmart: 18.97, kroger: 19.99, tomThumb: 20.49,
      centralMarket: 21.99, aldi: null, lidl: null
    },
    facings: {
      walmart: 6, kroger: 5, tomThumb: 4,
      centralMarket: 3, aldi: 0, lidl: 0
    }
  },
  {
    id: "charmin-basic-20",
    name: "Charmin Basic 20-roll",
    brand: "Charger",
    subcategory: "Toilet Paper",
    segment: "value",
    baseCost: 5.80,
    elasticity: -2.4,
    baseUnitsPerWeek: 75,
    pricing: {
      walmart: 9.97, kroger: 10.49, tomThumb: 10.79,
      centralMarket: null, aldi: null, lidl: null
    },
    facings: {
      walmart: 5, kroger: 3, tomThumb: 2,
      centralMarket: 0, aldi: 0, lidl: 0
    }
  },
  {
    id: "scott-1000-12",
    name: "Scott 1000 12-roll",
    brand: "Scott",
    subcategory: "Toilet Paper",
    segment: "value",
    baseCost: 5.20,
    elasticity: -2.6,
    baseUnitsPerWeek: 85,
    pricing: {
      walmart: 8.97, kroger: 9.49, tomThumb: 9.79,
      centralMarket: null, aldi: 7.99, lidl: 7.79
    },
    facings: {
      walmart: 5, kroger: 4, tomThumb: 2,
      centralMarket: 0, aldi: 3, lidl: 3
    }
  },
  {
    id: "angel-soft-36",
    name: "Angel Soft 36-roll",
    brand: "Angel Soft",
    subcategory: "Toilet Paper",
    segment: "mid",
    baseCost: 9.10,
    elasticity: -1.8,
    baseUnitsPerWeek: 95,
    pricing: {
      walmart: 15.97, kroger: 16.99, tomThumb: 17.29,
      centralMarket: null, aldi: 14.99, lidl: 14.79
    },
    facings: {
      walmart: 5, kroger: 4, tomThumb: 3,
      centralMarket: 0, aldi: 4, lidl: 4
    }
  },
  {
    id: "puffs-plus-3pk",
    name: "Puffs Plus Lotion 3-pk",
    brand: "Puffs",
    subcategory: "Tissues",
    segment: "premium",
    baseCost: 3.80,
    elasticity: -1.2,
    baseUnitsPerWeek: 55,
    pricing: {
      walmart: 6.47, kroger: 6.99, tomThumb: 7.29,
      centralMarket: 7.99, aldi: null, lidl: null
    },
    facings: {
      walmart: 4, kroger: 3, tomThumb: 2,
      centralMarket: 2, aldi: 0, lidl: 0
    }
  },
  {
    id: "kleenex-6pk",
    name: "Kleenex Tissues 6-pk",
    brand: "Kleenex",
    subcategory: "Tissues",
    segment: "mid",
    baseCost: 5.40,
    elasticity: -1.7,
    baseUnitsPerWeek: 70,
    pricing: {
      walmart: 8.97, kroger: 9.49, tomThumb: 9.79,
      centralMarket: 10.49, aldi: 8.29, lidl: 7.99
    },
    facings: {
      walmart: 4, kroger: 3, tomThumb: 3,
      centralMarket: 2, aldi: 3, lidl: 3
    }
  }
];

export const RETAILERS = ["walmart", "kroger", "tomThumb", "centralMarket", "aldi", "lidl"];

export const RETAILER_LABELS = {
  walmart: "Walmart",
  kroger: "Kroger",
  tomThumb: "Tom Thumb",
  centralMarket: "Central Market",
  aldi: "Aldi",
  lidl: "Lidl"
};

export const RETAILER_STRATEGY = {
  walmart:       { type: "EDLP",    priceIndex: 0.93, promoFreq: 0.15 },
  kroger:        { type: "HiLo",    priceIndex: 1.00, promoFreq: 0.30 },
  tomThumb:      { type: "HiLo",    priceIndex: 1.04, promoFreq: 0.25 },
  centralMarket: { type: "Premium", priceIndex: 1.12, promoFreq: 0.10 },
  aldi:          { type: "EDLP",    priceIndex: 0.88, promoFreq: 0.08 },
  lidl:          { type: "EDLP",    priceIndex: 0.86, promoFreq: 0.08 }
};
