const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_OUTFIT_INVENTORY_DIR = path.join(ROOT, 'NFTs', 'outfits');
const SOURCE_OUTFIT_AVATAR_DIR = path.join(SOURCE_OUTFIT_INVENTORY_DIR, 'final_outfit');
const SOURCE_BOOTS_INVENTORY_DIR = path.join(ROOT, 'NFTs', 'boots');
const SOURCE_BOOTS_AVATAR_DIR = path.join(SOURCE_BOOTS_INVENTORY_DIR, 'final_boots');
const SOURCE_HEADS_INVENTORY_DIR = path.join(ROOT, 'NFTs', 'heads');
const SOURCE_HEADS_AVATAR_DIR = path.join(SOURCE_HEADS_INVENTORY_DIR, 'final_heads');
const SOURCE_ITEMS_INVENTORY_DIR = path.join(ROOT, 'NFTs', 'items');
const PROJECT_DIR = path.join(ROOT, 'project');
const TARGET_OUTFIT_INVENTORY_DIR = path.join(PROJECT_DIR, 'assets', 'outfits', 'inventory');
const TARGET_OUTFIT_AVATAR_DIR = path.join(PROJECT_DIR, 'assets', 'outfits', 'avatar');
const TARGET_BOOTS_INVENTORY_DIR = path.join(PROJECT_DIR, 'assets', 'boots', 'inventory');
const TARGET_BOOTS_AVATAR_DIR = path.join(PROJECT_DIR, 'assets', 'boots', 'avatar');
const TARGET_HEADS_INVENTORY_DIR = path.join(PROJECT_DIR, 'assets', 'heads', 'inventory');
const TARGET_HEADS_AVATAR_DIR = path.join(PROJECT_DIR, 'assets', 'heads', 'avatar');
const TARGET_ITEMS_INVENTORY_DIR = path.join(PROJECT_DIR, 'assets', 'items', 'inventory');
const OUTPUT_FILE = path.join(PROJECT_DIR, 'generated-outfits.js');

const COMMON_COLOR_NAMES = [
  { label: 'Coral', hue: 8, saturation: 0.75, lightness: 0.58 },
  { label: 'Amber', hue: 36, saturation: 0.76, lightness: 0.58 },
  { label: 'Lime', hue: 92, saturation: 0.7, lightness: 0.52 },
  { label: 'Mint', hue: 148, saturation: 0.52, lightness: 0.66 },
  { label: 'Sky', hue: 200, saturation: 0.73, lightness: 0.64 },
  { label: 'Cobalt', hue: 225, saturation: 0.66, lightness: 0.46 },
  { label: 'Violet', hue: 266, saturation: 0.62, lightness: 0.6 },
  { label: 'Magenta', hue: 318, saturation: 0.7, lightness: 0.58 },
  { label: 'Rose', hue: 346, saturation: 0.58, lightness: 0.66 },
  { label: 'Ivory', hue: 48, saturation: 0.18, lightness: 0.92 },
  { label: 'Stone', hue: 30, saturation: 0.08, lightness: 0.58 },
  { label: 'Graphite', hue: 220, saturation: 0.08, lightness: 0.24 },
];

const RARITY_SUPPLY = {
  Common: 10000,
  Rare: 2500,
  Epic: 500,
  Legendary: 50,
};

const POINTS_BY_RARITY = {
  Common: 100,
  Rare: 125,
  Epic: 175,
  Legendary: 250,
};

const RARITY_PYRAMID_TARGETS = {
  Common: 0.45,
  Rare: 0.30,
  Epic: 0.17,
  Legendary: 0.08,
};

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readPng(filePath) {
  return PNG.sync.read(fs.readFileSync(filePath));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function rgbToHsl(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const lightness = (max + min) / 2;
  if (max === min) {
    return { hue: 0, saturation: 0, lightness };
  }
  const delta = max - min;
  const saturation = lightness > 0.5
    ? delta / (2 - max - min)
    : delta / (max + min);
  let hue;
  switch (max) {
    case rn:
      hue = ((gn - bn) / delta) + (gn < bn ? 6 : 0);
      break;
    case gn:
      hue = ((bn - rn) / delta) + 2;
      break;
    default:
      hue = ((rn - gn) / delta) + 4;
      break;
  }
  hue /= 6;
  return { hue: hue * 360, saturation, lightness };
}

function hueDistance(a, b) {
  const diff = Math.abs(a - b) % 360;
  return Math.min(diff, 360 - diff);
}

function nearestColorLabel(hue, saturation, lightness) {
  let bestLabel = 'Spectrum';
  let bestScore = Infinity;
  for (const swatch of COMMON_COLOR_NAMES) {
    const score = hueDistance(hue, swatch.hue)
      + Math.abs(saturation - swatch.saturation) * 120
      + Math.abs(lightness - swatch.lightness) * 80;
    if (score < bestScore) {
      bestScore = score;
      bestLabel = swatch.label;
    }
  }
  return bestLabel;
}

function filenameNumber(name) {
  return parseInt(path.basename(name, '.png'), 10);
}

function padNumber(value, size) {
  return String(value).padStart(size, '0');
}

function analyzeImage(filePath) {
  const png = readPng(filePath);
  let minX = png.width;
  let minY = png.height;
  let maxX = -1;
  let maxY = -1;
  let pixelCount = 0;
  let brightnessCount = 0;
  let darkCount = 0;
  let sumHueX = 0;
  let sumHueY = 0;
  let sumSaturation = 0;
  let sumLightness = 0;
  let sumLightnessSquared = 0;
  let weightedR = 0;
  let weightedG = 0;
  let weightedB = 0;
  let edgeDelta = 0;
  const quantizedColors = new Map();
  const hueBuckets = new Array(12).fill(0);
  const previousRow = new Array(png.width).fill(null);

  for (let y = 0; y < png.height; y += 1) {
    let previousPixel = null;
    for (let x = 0; x < png.width; x += 1) {
      const idx = (y * png.width + x) * 4;
      const alpha = png.data[idx + 3];
      if (alpha < 32) {
        previousPixel = null;
        previousRow[x] = null;
        continue;
      }

      const r = png.data[idx];
      const g = png.data[idx + 1];
      const b = png.data[idx + 2];
      const { hue, saturation, lightness } = rgbToHsl(r, g, b);

      pixelCount += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      sumHueX += Math.cos((hue * Math.PI) / 180);
      sumHueY += Math.sin((hue * Math.PI) / 180);
      sumSaturation += saturation;
      sumLightness += lightness;
      sumLightnessSquared += lightness * lightness;
      weightedR += r;
      weightedG += g;
      weightedB += b;
      if (lightness > 0.78) brightnessCount += 1;
      if (lightness < 0.28) darkCount += 1;

      const bucketIndex = Math.floor(hue / 30) % hueBuckets.length;
      hueBuckets[bucketIndex] += 1;
      const quantizedKey = [
        Math.round(r / 32) * 32,
        Math.round(g / 32) * 32,
        Math.round(b / 32) * 32,
      ].join(',');
      quantizedColors.set(quantizedKey, (quantizedColors.get(quantizedKey) || 0) + 1);

      if (previousPixel) {
        edgeDelta += Math.abs(r - previousPixel[0]) + Math.abs(g - previousPixel[1]) + Math.abs(b - previousPixel[2]);
      }
      if (previousRow[x]) {
        edgeDelta += Math.abs(r - previousRow[x][0]) + Math.abs(g - previousRow[x][1]) + Math.abs(b - previousRow[x][2]);
      }

      previousPixel = [r, g, b];
      previousRow[x] = previousPixel;
    }
  }

  const bboxWidth = pixelCount ? maxX - minX + 1 : 0;
  const bboxHeight = pixelCount ? maxY - minY + 1 : 0;
  const dominantColors = [...quantizedColors.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key, count]) => {
      const [r, g, b] = key.split(',').map(Number);
      const hsl = rgbToHsl(r, g, b);
      return { rgb: [r, g, b], count, ...hsl };
    });

  const meanLightness = pixelCount ? sumLightness / pixelCount : 0;
  const variance = pixelCount
    ? Math.max(0, (sumLightnessSquared / pixelCount) - (meanLightness * meanLightness))
    : 0;
  const dominantHue = Math.atan2(sumHueY, sumHueX) * (180 / Math.PI);
  const normalizedHue = dominantHue < 0 ? dominantHue + 360 : dominantHue;
  const hueSpread = dominantColors.length > 1
    ? dominantColors.reduce((maxSpread, color) => Math.max(maxSpread, hueDistance(normalizedHue, color.hue)), 0)
    : 0;

  return {
    width: png.width,
    height: png.height,
    pixelCount,
    coverage: pixelCount / (png.width * png.height),
    bboxWidthRatio: bboxWidth / png.width,
    bboxHeightRatio: bboxHeight / png.height,
    bboxAspectRatio: bboxHeight ? bboxWidth / bboxHeight : 0,
    averageSaturation: pixelCount ? sumSaturation / pixelCount : 0,
    averageLightness: meanLightness,
    contrast: Math.sqrt(variance),
    brightRatio: pixelCount ? brightnessCount / pixelCount : 0,
    darkRatio: pixelCount ? darkCount / pixelCount : 0,
    edgeDensity: pixelCount ? edgeDelta / pixelCount : 0,
    uniqueQuantizedColorCount: quantizedColors.size,
    dominantHue: normalizedHue,
    hueSpread,
    dominantLabel: nearestColorLabel(
      normalizedHue,
      pixelCount ? sumSaturation / pixelCount : 0,
      meanLightness,
    ),
    averageRgb: [
      Math.round(weightedR / pixelCount),
      Math.round(weightedG / pixelCount),
      Math.round(weightedB / pixelCount),
    ],
    dominantColors,
    hueBuckets,
  };
}

function classifyColor(metrics) {
  const topShare = metrics.dominantColors.length
    ? metrics.dominantColors[0].count / metrics.pixelCount
    : 0;
  const activeHues = metrics.hueBuckets.filter(count => count > metrics.pixelCount * 0.03).length;
  const label = metrics.dominantLabel;

  if (activeHues >= 4 || (metrics.uniqueQuantizedColorCount > 165 && metrics.hueSpread > 75 && topShare < 0.28)) {
    return 'Pattern (Prism)';
  }
  if (metrics.hueSpread > 55 && topShare < 0.42) {
    return `Gradient (${label})`;
  }
  if (metrics.uniqueQuantizedColorCount > 140 && activeHues >= 3) {
    return `Pattern (${label})`;
  }
  return `Solid (${label})`;
}

function classifyFinish(metrics, colorStat) {
  if (metrics.brightRatio > 0.22 && metrics.contrast > 0.22 && metrics.averageSaturation > 0.45) {
    return 'Metallic threading';
  }
  if (metrics.brightRatio > 0.16 && metrics.contrast > 0.17) {
    return 'Reflective';
  }
  if (metrics.edgeDensity > 42 || (metrics.darkRatio > 0.28 && metrics.contrast > 0.18)) {
    return 'Distressed';
  }
  if (metrics.averageLightness > 0.6 && metrics.averageSaturation < 0.28) {
    return 'Washed';
  }
  if (colorStat.startsWith('Pattern') || metrics.averageSaturation > 0.62) {
    return 'Glossy';
  }
  return 'Matte';
}

function classifyFabric(metrics, colorStat, finish) {
  if (finish === 'Metallic threading') return 'Silk';
  if (finish === 'Reflective') return 'Techwear';
  if (finish === 'Distressed' && metrics.darkRatio > 0.22) return 'Leather';
  if (metrics.dominantLabel === 'Sky' || metrics.dominantLabel === 'Cobalt') return 'Denim';
  if (colorStat.startsWith('Pattern') && metrics.averageSaturation > 0.58) return 'Techwear';
  if (finish === 'Washed') return 'Cotton';
  if (metrics.averageSaturation < 0.24 && metrics.contrast < 0.16) return 'Cotton';
  return 'Cotton';
}

function classifyFit(metrics) {
  if (metrics.bboxHeightRatio < 0.54) return 'Cropped';
  if (metrics.bboxWidthRatio > 0.55 || metrics.bboxAspectRatio > 0.9) return 'Oversized';
  if (metrics.bboxWidthRatio < 0.44 && metrics.bboxHeightRatio > 0.64) return 'Slim';
  return 'Structured';
}

function classifyRarity(metrics, finish, colorStat) {
  if (finish === 'Metallic threading' || (metrics.hueSpread > 95 && metrics.brightRatio > 0.16)) {
    return 'Legendary';
  }
  if (finish === 'Reflective' || metrics.uniqueQuantizedColorCount > 175) {
    return 'Epic';
  }
  if (finish === 'Glossy' || colorStat.startsWith('Pattern') || colorStat.startsWith('Gradient')) {
    return 'Rare';
  }
  return 'Common';
}

function scoreRarity(metrics, finish, colorStat) {
  let score = 0;

  score += metrics.uniqueQuantizedColorCount * 0.45;
  score += metrics.hueSpread * 1.2;
  score += metrics.brightRatio * 160;
  score += metrics.averageSaturation * 35;
  score += metrics.contrast * 80;
  score += metrics.edgeDensity * 0.12;

  if (finish === 'Metallic threading') score += 140;
  else if (finish === 'Reflective') score += 90;
  else if (finish === 'Glossy') score += 35;

  if (colorStat.startsWith('Gradient')) score += 35;
  else if (colorStat.startsWith('Pattern')) score += 25;

  return Math.round(score * 100) / 100;
}

function buildPyramidCounts(total) {
  if (total <= 0) {
    return { Common: 0, Rare: 0, Epic: 0, Legendary: 0 };
  }

  const counts = {
    Legendary: Math.max(1, Math.round(total * RARITY_PYRAMID_TARGETS.Legendary)),
    Epic: Math.max(1, Math.round(total * RARITY_PYRAMID_TARGETS.Epic)),
    Rare: Math.max(1, Math.round(total * RARITY_PYRAMID_TARGETS.Rare)),
  };

  counts.Common = total - counts.Legendary - counts.Epic - counts.Rare;

  while (counts.Common <= counts.Rare) {
    if (counts.Rare > counts.Epic + 1) counts.Rare -= 1;
    else if (counts.Epic > counts.Legendary + 1) counts.Epic -= 1;
    else if (counts.Legendary > 1) counts.Legendary -= 1;
    counts.Common = total - counts.Legendary - counts.Epic - counts.Rare;
  }

  while (counts.Rare <= counts.Epic) {
    if (counts.Epic > counts.Legendary + 1) counts.Epic -= 1;
    else if (counts.Legendary > 1) counts.Legendary -= 1;
    else counts.Rare += 1;
    counts.Common = total - counts.Legendary - counts.Epic - counts.Rare;
  }

  while (counts.Epic <= counts.Legendary) {
    if (counts.Legendary > 1) counts.Legendary -= 1;
    else counts.Epic += 1;
    counts.Common = total - counts.Legendary - counts.Epic - counts.Rare;
  }

  return counts;
}

function applyRarityPyramid(entries) {
  const sorted = [...entries].sort((a, b) => {
    if (b.__rarityScore !== a.__rarityScore) return b.__rarityScore - a.__rarityScore;
    return a.__number - b.__number;
  });
  const counts = buildPyramidCounts(sorted.length);
  let index = 0;

  for (const rarity of ['Legendary', 'Epic', 'Rare', 'Common']) {
    const end = index + counts[rarity];
    for (let i = index; i < end; i += 1) {
      sorted[i].rarity = rarity;
    }
    index = end;
  }

  return entries.map(entry => {
    const mint = classifyMint(entry.__inventoryMetrics, entry.finish, entry.rarity);
    const finalEntry = {
      ...entry,
      mint,
      serial: buildSerial(entry.__number, entry.rarity),
      lore: buildLore(entry.fabric, entry.fit, entry.finish, entry.color, mint),
      pointsBonus: POINTS_BY_RARITY[entry.rarity],
    };

    delete finalEntry.__inventoryMetrics;
    delete finalEntry.__number;
    delete finalEntry.__rarityScore;
    return finalEntry;
  });
}

function classifyMint(metrics, finish, rarity) {
  if (rarity === 'Legendary') return 'Legendary';
  if (finish === 'Distressed' || metrics.darkRatio > 0.3) return 'Vintage';
  if (finish === 'Washed' || metrics.edgeDensity > 26) return 'Worn';
  return 'Mint';
}

function buildName(metrics, fit, finish, number) {
  const styleTail = finish === 'Reflective'
    ? 'Signal'
    : finish === 'Metallic threading'
      ? 'Relic'
      : fit === 'Cropped'
        ? 'Cut'
        : fit === 'Oversized'
          ? 'Drape'
          : fit === 'Slim'
            ? 'Line'
            : 'Form';
  return `${metrics.dominantLabel} ${styleTail} ${padNumber(number, 2)}`;
}

function buildLore(fabric, fit, finish, colorStat, mint) {
  return `${fabric} silhouette scanned as ${fit.toLowerCase()}, finished in ${finish.toLowerCase()}, carrying a ${mint.toLowerCase()} ${colorStat.toLowerCase()} signature.`;
}

function buildSerial(number, rarity) {
  const total = RARITY_SUPPLY[rarity];
  const current = ((number * 37) % total) + 1;
  return `#${padNumber(current, 4)} / ${total.toLocaleString()}`;
}

function buildOutfitEntry(fileName) {
  const number = filenameNumber(fileName);
  const inventorySource = path.join(SOURCE_OUTFIT_INVENTORY_DIR, fileName);
  const avatarSource = path.join(SOURCE_OUTFIT_AVATAR_DIR, fileName);
  const inventoryMetrics = analyzeImage(inventorySource);
  const avatarMetrics = analyzeImage(avatarSource);
  const art = `outfit-${padNumber(number, 2)}`;
  const color = classifyColor(inventoryMetrics);
  const finish = classifyFinish(inventoryMetrics, color);
  const fabric = classifyFabric(inventoryMetrics, color, finish);
  const fit = classifyFit(inventoryMetrics);
  const inventoryTarget = path.join(TARGET_OUTFIT_INVENTORY_DIR, fileName);
  const avatarTarget = path.join(TARGET_OUTFIT_AVATAR_DIR, fileName);

  fs.copyFileSync(inventorySource, inventoryTarget);
  fs.copyFileSync(avatarSource, avatarTarget);

  return {
    id: `NFT-OUTFIT-${padNumber(number, 4)}`,
    name: buildName(inventoryMetrics, fit, finish, number),
    art,
    slot: 'outfit',
    fabric,
    fit,
    finish,
    color,
    rarity: classifyRarity(inventoryMetrics, finish, color),
    owned: true,
    inventorySrc: `assets/outfits/inventory/${fileName.replace(/\.png$/i, '.webp')}?v=2`,
    avatarSrc: `assets/outfits/avatar/${fileName.replace(/\.png$/i, '.webp')}?v=2`,
    inventoryWidth: inventoryMetrics.width,
    inventoryHeight: inventoryMetrics.height,
    avatarWidth: avatarMetrics.width,
    avatarHeight: avatarMetrics.height,
    __inventoryMetrics: inventoryMetrics,
    __number: number,
    __rarityScore: scoreRarity(inventoryMetrics, finish, color),
  };
}

function buildBootsEntry(fileName) {
  const number = filenameNumber(fileName);
  const inventorySource = path.join(SOURCE_BOOTS_INVENTORY_DIR, fileName);
  const avatarSource = path.join(SOURCE_BOOTS_AVATAR_DIR, fileName);
  const inventoryMetrics = analyzeImage(inventorySource);
  const avatarMetrics = analyzeImage(avatarSource);
  const art = `boots-${padNumber(number, 2)}`;
  const color = classifyColor(inventoryMetrics);
  const finish = classifyFinish(inventoryMetrics, color);
  const fabric = classifyFabric(inventoryMetrics, color, finish);
  const fit = classifyFit(inventoryMetrics);
  const inventoryTarget = path.join(TARGET_BOOTS_INVENTORY_DIR, fileName);
  const avatarTarget = path.join(TARGET_BOOTS_AVATAR_DIR, fileName);

  fs.copyFileSync(inventorySource, inventoryTarget);
  fs.copyFileSync(avatarSource, avatarTarget);

  return {
    id: `NFT-BOOTS-${padNumber(number, 4)}`,
    name: `${buildName(inventoryMetrics, fit, finish, number)} Boots`,
    art,
    slot: 'boots',
    fabric,
    fit,
    finish,
    color,
    rarity: classifyRarity(inventoryMetrics, finish, color),
    owned: true,
    inventorySrc: `assets/boots/inventory/${fileName.replace(/\.png$/i, '.webp')}?v=2`,
    avatarSrc: `assets/boots/avatar/${fileName.replace(/\.png$/i, '.webp')}?v=2`,
    inventoryWidth: inventoryMetrics.width,
    inventoryHeight: inventoryMetrics.height,
    avatarWidth: avatarMetrics.width,
    avatarHeight: avatarMetrics.height,
    __inventoryMetrics: inventoryMetrics,
    __number: number,
    __rarityScore: scoreRarity(inventoryMetrics, finish, color),
  };
}

function buildHeadEntry(fileName) {
  const number = filenameNumber(fileName);
  const inventorySource = path.join(SOURCE_HEADS_INVENTORY_DIR, fileName);
  const avatarSource = path.join(SOURCE_HEADS_AVATAR_DIR, fileName);
  const inventoryMetrics = analyzeImage(inventorySource);
  const avatarMetrics = analyzeImage(avatarSource);
  const art = `head-${padNumber(number, 2)}`;
  const color = classifyColor(inventoryMetrics);
  const finish = classifyFinish(inventoryMetrics, color);
  const fabric = classifyFabric(inventoryMetrics, color, finish);
  const fit = classifyFit(inventoryMetrics);
  const inventoryTarget = path.join(TARGET_HEADS_INVENTORY_DIR, fileName);
  const avatarTarget = path.join(TARGET_HEADS_AVATAR_DIR, fileName);

  fs.copyFileSync(inventorySource, inventoryTarget);
  fs.copyFileSync(avatarSource, avatarTarget);

  return {
    id: `NFT-HEAD-${padNumber(number, 4)}`,
    name: `${buildName(inventoryMetrics, fit, finish, number)} Headwear`,
    art,
    slot: 'head',
    fabric,
    fit,
    finish,
    color,
    rarity: classifyRarity(inventoryMetrics, finish, color),
    owned: true,
    inventorySrc: `assets/heads/inventory/${fileName.replace(/\.png$/i, '.webp')}?v=2`,
    avatarSrc: `assets/heads/avatar/${fileName.replace(/\.png$/i, '.webp')}?v=2`,
    inventoryWidth: inventoryMetrics.width,
    inventoryHeight: inventoryMetrics.height,
    avatarWidth: avatarMetrics.width,
    avatarHeight: avatarMetrics.height,
    __inventoryMetrics: inventoryMetrics,
    __number: number,
    __rarityScore: scoreRarity(inventoryMetrics, finish, color),
  };
}

function buildItemEntry(fileName) {
  const number = filenameNumber(fileName);
  const inventorySource = path.join(SOURCE_ITEMS_INVENTORY_DIR, fileName);
  const inventoryMetrics = analyzeImage(inventorySource);
  const art = `item-${padNumber(number, 2)}`;
  const color = classifyColor(inventoryMetrics);
  const finish = classifyFinish(inventoryMetrics, color);
  const fabric = classifyFabric(inventoryMetrics, color, finish);
  const fit = classifyFit(inventoryMetrics);
  const inventoryTarget = path.join(TARGET_ITEMS_INVENTORY_DIR, fileName);

  fs.copyFileSync(inventorySource, inventoryTarget);

  return {
    id: `NFT-ITEM-${padNumber(number, 4)}`,
    name: `${buildName(inventoryMetrics, fit, finish, number)} Item`,
    art,
    slot: 'item',
    fabric,
    fit,
    finish,
    color,
    rarity: classifyRarity(inventoryMetrics, finish, color),
    owned: true,
    inventorySrc: `assets/items/inventory/${fileName.replace(/\.png$/i, '.webp')}?v=2`,
    avatarSrc: `assets/items/inventory/${fileName.replace(/\.png$/i, '.webp')}?v=2`,
    inventoryWidth: inventoryMetrics.width,
    inventoryHeight: inventoryMetrics.height,
    avatarWidth: inventoryMetrics.width,
    avatarHeight: inventoryMetrics.height,
    __inventoryMetrics: inventoryMetrics,
    __number: number,
    __rarityScore: scoreRarity(inventoryMetrics, finish, color),
  };
}

function main() {
  ensureDir(TARGET_OUTFIT_INVENTORY_DIR);
  ensureDir(TARGET_OUTFIT_AVATAR_DIR);
  ensureDir(TARGET_BOOTS_INVENTORY_DIR);
  ensureDir(TARGET_BOOTS_AVATAR_DIR);
  ensureDir(TARGET_HEADS_INVENTORY_DIR);
  ensureDir(TARGET_HEADS_AVATAR_DIR);
  ensureDir(TARGET_ITEMS_INVENTORY_DIR);

  const outfitFileNames = fs.readdirSync(SOURCE_OUTFIT_INVENTORY_DIR)
    .filter(name => name.endsWith('.png') && name !== 'base_outfit.png')
    .sort((a, b) => filenameNumber(a) - filenameNumber(b));
  const bootsFileNames = fs.readdirSync(SOURCE_BOOTS_INVENTORY_DIR)
    .filter(name => name.endsWith('.png') && name !== 'base_shoes.png')
    .sort((a, b) => filenameNumber(a) - filenameNumber(b));
  const headFileNames = fs.readdirSync(SOURCE_HEADS_INVENTORY_DIR)
    .filter(name => name.endsWith('.png'))
    .sort((a, b) => filenameNumber(a) - filenameNumber(b));
  const itemFileNames = fs.readdirSync(SOURCE_ITEMS_INVENTORY_DIR)
    .filter(name => name.endsWith('.png'))
    .sort((a, b) => filenameNumber(a) - filenameNumber(b));

  const generatedOutfits = applyRarityPyramid(outfitFileNames.map(buildOutfitEntry)).map(entry => ({
    ...entry,
    lore: `Outfit relic woven in ${entry.fabric.toLowerCase()}, cut ${entry.fit.toLowerCase()}, finished in ${entry.finish.toLowerCase()}, carrying a ${entry.mint.toLowerCase()} ${entry.color.toLowerCase()} signature.`,
  }));
  const generatedBoots = applyRarityPyramid(bootsFileNames.map(buildBootsEntry)).map(entry => ({
    ...entry,
    lore: `Footwear relic tuned in ${entry.fabric.toLowerCase()}, cut ${entry.fit.toLowerCase()}, finished in ${entry.finish.toLowerCase()}, with a ${entry.mint.toLowerCase()} ${entry.color.toLowerCase()} signature.`,
  }));
  const generatedHeads = applyRarityPyramid(headFileNames.map(buildHeadEntry)).map(entry => ({
    ...entry,
    lore: `Headwear relic rendered in ${entry.fabric.toLowerCase()}, shaped ${entry.fit.toLowerCase()}, finished in ${entry.finish.toLowerCase()}, with a ${entry.mint.toLowerCase()} ${entry.color.toLowerCase()} signature.`,
  }));
  const generatedItems = applyRarityPyramid(itemFileNames.map(buildItemEntry)).map(entry => ({
    ...entry,
    lore: `Accessory relic cast in ${entry.fabric.toLowerCase()}, shaped ${entry.fit.toLowerCase()}, finished in ${entry.finish.toLowerCase()}, carrying a ${entry.mint.toLowerCase()} ${entry.color.toLowerCase()} signature.`,
  }));
  const outfitMap = Object.fromEntries(generatedOutfits.map(item => [item.art, item]));
  const bootsMap = Object.fromEntries(generatedBoots.map(item => [item.art, item]));
  const headsMap = Object.fromEntries(generatedHeads.map(item => [item.art, item]));
  const itemsMap = Object.fromEntries(generatedItems.map(item => [item.art, item]));
  const output = [
    '/* Auto-generated by scripts/generate-outfit-library.cjs */',
    `window.GENERATED_OUTFIT_LIBRARY = ${JSON.stringify(generatedOutfits, null, 2)};`,
    `window.GENERATED_OUTFIT_MAP = ${JSON.stringify(outfitMap, null, 2)};`,
    `window.GENERATED_BOOTS_LIBRARY = ${JSON.stringify(generatedBoots, null, 2)};`,
    `window.GENERATED_BOOTS_MAP = ${JSON.stringify(bootsMap, null, 2)};`,
    `window.GENERATED_HEAD_LIBRARY = ${JSON.stringify(generatedHeads, null, 2)};`,
    `window.GENERATED_HEAD_MAP = ${JSON.stringify(headsMap, null, 2)};`,
    `window.GENERATED_ITEM_LIBRARY = ${JSON.stringify(generatedItems, null, 2)};`,
    `window.GENERATED_ITEM_MAP = ${JSON.stringify(itemsMap, null, 2)};`,
    '',
  ].join('\n');

  fs.writeFileSync(OUTPUT_FILE, output);
  console.log(`Generated ${generatedOutfits.length} outfits, ${generatedBoots.length} boots, ${generatedHeads.length} heads, and ${generatedItems.length} items in ${OUTPUT_FILE}`);
}

main();
