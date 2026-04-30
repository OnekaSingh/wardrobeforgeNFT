/* ============= NFT catalog ============= */

const GENERATED_OUTFIT_LIBRARY = window.GENERATED_OUTFIT_LIBRARY || [];
const GENERATED_BOOTS_LIBRARY = window.GENERATED_BOOTS_LIBRARY || [];
const GENERATED_HEAD_LIBRARY = window.GENERATED_HEAD_LIBRARY || [];
const GENERATED_ITEM_LIBRARY = window.GENERATED_ITEM_LIBRARY || [];

const STARTER_GEAR_LIBRARY = [
  {
    id: 'NFT-BASE-0001',
    name: 'Base Outfit',
    art: 'base-outfit',
    slot: 'outfit',
    fabric: 'Cotton',
    fit: 'Structured',
    finish: 'Matte',
    color: 'Solid (White)',
    mint: 'Mint',
    rarity: 'Common',
    serial: '#0001 / 1',
    lore: 'The default uniform used to preview every new look before the relics come out.',
    pointsBonus: 0,
    owned: true,
    inventorySrc: 'assets/starter/final_base_outfit.webp?v=3',
    avatarSrc: 'assets/starter/final_base_outfit.webp?v=3',
  },
  {
    id: 'NFT-BASE-0002',
    name: 'Base Shoes',
    art: 'base-shoes',
    slot: 'boots',
    fabric: 'Leather',
    fit: 'Structured',
    finish: 'Matte',
    color: 'Solid (White)',
    mint: 'Mint',
    rarity: 'Common',
    serial: '#0001 / 1',
    lore: 'Starter shoes forged to anchor every outfit before the flex pieces come in.',
    pointsBonus: 0,
    owned: true,
    inventorySrc: 'assets/starter/final_base_shoes.webp?v=3',
    avatarSrc: 'assets/starter/final_base_shoes.webp?v=3',
  },
];

const IMAGE_GEAR_LIBRARY = [...STARTER_GEAR_LIBRARY, ...GENERATED_OUTFIT_LIBRARY, ...GENERATED_BOOTS_LIBRARY, ...GENERATED_HEAD_LIBRARY, ...GENERATED_ITEM_LIBRARY];
const IMAGE_GEAR_MAP = Object.fromEntries(IMAGE_GEAR_LIBRARY.map(item => [item.art, item]));
const GENERATED_GEAR_LIBRARY = [...GENERATED_OUTFIT_LIBRARY, ...GENERATED_BOOTS_LIBRARY, ...GENERATED_HEAD_LIBRARY, ...GENERATED_ITEM_LIBRARY];
const NFT_LIBRARY = [...STARTER_GEAR_LIBRARY, ...GENERATED_GEAR_LIBRARY];
const NON_STARTER_NFT_LIBRARY = [...GENERATED_GEAR_LIBRARY];
const HIDDEN_BROWSE_NFT_IDS = new Set(STARTER_GEAR_LIBRARY.map((item) => item.id));
const BROWSABLE_NFT_LIBRARY = GENERATED_GEAR_LIBRARY.filter(item => !HIDDEN_BROWSE_NFT_IDS.has(item.id));

const CRATE_PRICE_VTO = 100;
const CRATE_DEFINITIONS = [
  {
    id: 'crate-sunflare',
    name: 'Sunflare Crate',
    tone: 'sunflare',
    lore: 'A warm starter lane with more outfit and item drops pulled from the main forge floor.',
  },
  {
    id: 'crate-nebula',
    name: 'Nebula Crate',
    tone: 'nebula',
    lore: 'A cooler cosmic mix that leans into headwear and accessories with rarer glow pieces.',
  },
  {
    id: 'crate-verdant',
    name: 'Verdant Crate',
    tone: 'verdant',
    lore: 'A bright arcade-green spread with heavier boots coverage and whatever relics remain.',
  },
  {
    id: 'crate-aurora',
    name: 'Aurora Crate',
    tone: 'aurora',
    lore: 'A cooler late-game split that catches the overflow and spreads the rarer forge drops wider.',
  },
];

const RARITY_ORDER = ['Common', 'Rare', 'Epic', 'Legendary'];
const SLOT_ORDER = ['outfit', 'item', 'boots', 'head'];
const RARITY_OFFSET = { Common: 0, Rare: 1, Epic: 2, Legendary: 1 };
const SLOT_OFFSET = { outfit: 0, item: 1, boots: 2, head: 1 };

const createCrateBuckets = () => (
  CRATE_DEFINITIONS.map((crate) => ({
    ...crate,
    priceVto: CRATE_PRICE_VTO,
    contents: [],
    rarityCounts: {},
  }))
);

const buildCratesFromGeneratedGear = () => {
  const buckets = createCrateBuckets();
  const grouped = new Map();

  NON_STARTER_NFT_LIBRARY.forEach((item) => {
    const key = `${item.slot}:${item.rarity}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(item);
  });

  grouped.forEach((items, key) => {
    const [slot, rarity] = key.split(':');
    const startIndex = (RARITY_OFFSET[rarity] || 0) + (SLOT_OFFSET[slot] || 0);
    items.forEach((item, index) => {
      const targetIndex = (startIndex + index) % buckets.length;
      buckets[targetIndex].contents.push({
        ...item,
        crateRarity: item.rarity,
      });
    });
  });

  buckets.forEach((crate) => {
    crate.contents.sort((left, right) => {
      const rarityDelta = RARITY_ORDER.indexOf(left.rarity) - RARITY_ORDER.indexOf(right.rarity);
      if (rarityDelta !== 0) return rarityDelta;

      const slotDelta = SLOT_ORDER.indexOf(left.slot) - SLOT_ORDER.indexOf(right.slot);
      if (slotDelta !== 0) return slotDelta;

      return left.name.localeCompare(right.name);
    });

    crate.rarityCounts = crate.contents.reduce((counts, item) => {
      counts[item.rarity] = (counts[item.rarity] || 0) + 1;
      return counts;
    }, {});
  });

  return buckets;
};

const CRATE_LIBRARY = buildCratesFromGeneratedGear();

const RARITY_COLOR = {
  Common: 'pink',
  Rare: 'sky',
  Epic: 'lavender',
  Legendary: 'coral',
};

window.NFT_LIBRARY = NFT_LIBRARY;
window.BROWSABLE_NFT_LIBRARY = BROWSABLE_NFT_LIBRARY;
window.CRATE_LIBRARY = CRATE_LIBRARY;
window.CRATE_PRICE_VTO = CRATE_PRICE_VTO;
window.RARITY_COLOR = RARITY_COLOR;
window.IMAGE_GEAR_MAP = IMAGE_GEAR_MAP;
