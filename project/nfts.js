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
    inventorySrc: 'assets/starter/base_outfit.png?v=1',
    avatarSrc: 'assets/starter/final_base_outfit.png?v=1',
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
    inventorySrc: 'assets/starter/base_shoes.png?v=1',
    avatarSrc: 'assets/starter/final_base_shoes.png?v=1',
  },
];

const BASE_NFT_LIBRARY = [
  {
    id: 'NFT-0007',
    name: 'Ember Carapace',
    art: 'emberJacket',
    slot: 'outfit',
    fabric: 'Leather',
    fit: 'Structured',
    finish: 'Distressed',
    color: 'Solid (Coral)',
    mint: 'Vintage',
    rarity: 'Legendary',
    serial: '#0003 / 50',
    lore: 'Each scale is hand-stamped by a former blacksmith named Pat.',
    pointsBonus: 250,
    owned: false,
  },
  {
    id: 'NFT-0008',
    name: 'Void Cloak',
    art: 'voidCloak',
    slot: 'outfit',
    fabric: 'Silk',
    fit: 'Oversized',
    finish: 'Reflective',
    color: 'Color-shifting',
    mint: 'Legendary',
    rarity: 'Legendary',
    serial: '#0001 / 25',
    lore: 'Embroidered with the names of stars that have already gone out.',
    pointsBonus: 250,
    owned: false,
  },
  {
    id: 'NFT-0011',
    name: 'Ember Blade',
    art: 'emberBlade',
    slot: 'item',
    fabric: 'Denim',
    fit: 'Slim',
    finish: 'Distressed',
    color: 'Pattern (Camo)',
    mint: 'Vintage',
    rarity: 'Epic',
    serial: '#0044 / 600',
    lore: 'Originally a belt buckle. The blade is pinned to a denim sheath.',
    pointsBonus: 175,
    owned: false,
  },
  {
    id: 'NFT-0012',
    name: 'Void Orb',
    art: 'voidOrb',
    slot: 'item',
    fabric: 'Silk',
    fit: 'Cropped',
    finish: 'Glossy',
    color: 'Color-shifting',
    mint: 'Legendary',
    rarity: 'Legendary',
    serial: '#0002 / 30',
    lore: 'Genuine fabric, painted to look like glass. Weighs nothing.',
    pointsBonus: 250,
    owned: false,
  },
];

const IMAGE_GEAR_LIBRARY = [...STARTER_GEAR_LIBRARY, ...GENERATED_OUTFIT_LIBRARY, ...GENERATED_BOOTS_LIBRARY, ...GENERATED_HEAD_LIBRARY, ...GENERATED_ITEM_LIBRARY];
const IMAGE_GEAR_MAP = Object.fromEntries(IMAGE_GEAR_LIBRARY.map(item => [item.art, item]));
const NFT_LIBRARY = [...BASE_NFT_LIBRARY, ...STARTER_GEAR_LIBRARY, ...GENERATED_OUTFIT_LIBRARY, ...GENERATED_BOOTS_LIBRARY, ...GENERATED_HEAD_LIBRARY, ...GENERATED_ITEM_LIBRARY];

const RARITY_COLOR = {
  Common: 'pink',
  Rare: 'sky',
  Epic: 'lavender',
  Legendary: 'coral',
};

window.NFT_LIBRARY = NFT_LIBRARY;
window.RARITY_COLOR = RARITY_COLOR;
window.IMAGE_GEAR_MAP = IMAGE_GEAR_MAP;
