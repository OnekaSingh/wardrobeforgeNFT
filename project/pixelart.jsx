/* ============= Pixel art renderer ============= */
/* Render small pixel art via CSS box-shadows from a 2D string array.
   Each character = a color key in the supplied palette.
   '.' = transparent. */

const PixelArt = ({ data, palette, scale = 4, style = {} }) => {
  const rows = data.length;
  const cols = data[0].length;
  // build box-shadow string
  const shadows = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const ch = data[y][x];
      if (ch === '.' || ch === ' ') continue;
      const c = palette[ch];
      if (!c) continue;
      shadows.push(`${x * scale}px ${y * scale}px 0 ${c}`);
    }
  }
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'relative',
        width: cols * scale,
        height: rows * scale,
        ...style,
      }}
    >
      <div
        style={{
          width: scale,
          height: scale,
          boxShadow: shadows.join(','),
          background: 'transparent',
        }}
      />
    </div>
  );
};

/* ===== Chibi avatar =====
   Pixel keys (one char each):
     H = hair dark, h = hair mid
     S = skin mid, s = skin shadow
     L = lash line (top, dark)
     I = iris (eye color)
     W = highlight (white)
     R = lower lash rim (dark)
     n = nose dot
     M = mouth dark/lip, m = mouth inside light, T = tooth (white)
     K = body outline
     C = shirt placeholder
     P = pants placeholder
     X = shoe placeholder
*/
const CHIBI_DATA = [
  '.........YY.YY.YY........',
  '........YWWYWWYWWY.......',
  '.......HHHHHHHHHHHH......',
  '......HHSSSSSSSSSSHH.....',
  '.....HHSSSSSSSSSSSSHH....',
  '.....HSSSSSSSSSSSSSSH....',
  '....HHSSBBSSSSSSBBSSHH...',
  '....HSSBIIBSSSSBIIBSSH...',
  '....HSSBIIWBSSSBIIWBSSH..',
  '....HSSBIIIBSSSBIIIBSSH..',
  '....HSSBRRRBSSSBRRRBSSH..',
  '....HSSSSSSSSnSSSSSSSSH..',
  '....HSSSSSSMmTmMSSSSSSH..',
  '....HHSSSSSSMMMMSSSSHH...',
  '.....HSSSSSSSSSSSSSSH....',
  '.....HHSSSSSSSSSSSSHH....',
  '......HKKKKKKKKKKKKH.....',
  '......KCCCCCCCCCCCCK.....',
  '.....KCCCCCCCCCCCCCCK....',
  '.....KCCCCCCCCCCCCCCK....',
  '.....KCCCCCCCCCCCCCCK....',
  '......KSSSSSSSSSSSSK.....',
  '......KPPPPPPPPPPPPK.....',
  '......KPPPPPPPPPPPPK.....',
  '......KPPPPPPPPPPPPK.....',
  '......KPPPPPPPPPPPPK.....',
  '......KPPPPPPPPPPPPK.....',
  '......KPPPPPPPPPPPPK.....',
  '......KPPPP....PPPPK.....',
  '......KPPPP....PPPPK.....',
  '......KPPPP....PPPPK.....',
  '......KXXXX....XXXXK.....',
  '......KXXXX....XXXXK.....',
  '......KXXXXK..KXXXXK.....',
  '.......KKKK....KKKK......',
];

/* Skin tone presets — keys map to swatches in tweaks UI */
const SKIN_TONES = {
  porcelain: { mid: '#FFF0DF', shadow: '#F2DCC4' },
  light:     { mid: '#FCDEBD', shadow: '#E9C49B' },
  warm:      { mid: '#F9CD9C', shadow: '#E0AE76' },
  tan:       { mid: '#D4AD81', shadow: '#A88254' },
  deep:      { mid: '#6E4A22', shadow: '#4A2F12', border: '#1E1205' },
  rich:      { mid: '#472F14', shadow: '#2F1D0B', border: '#1E1205' },
};

const EYE_COLORS = {
  black:    '#000000',
  brown:    '#833303',
  blue:     '#333CE0',
  red:      '#E42A2A',
  green:    '#3AE25B',
  cyan:     '#67FFF0',
  sky:      '#55D2FF',
  pink:     '#FEA0CD',
  lilac:    '#F1CFFF',
  amber:    '#FBC01F',
  gradient: 'gradient',
  hetero:   'hetero',
};

const buildChibiPalette = (skinKey, eyeKey, hairKey = 'brown') => {
  const skin = SKIN_TONES[skinKey] || SKIN_TONES.light;
  const eye = EYE_COLORS[eyeKey] || EYE_COLORS.brown;
  const hairs = {
    brown: { H: '#4B2610', h: '#6E3918' },
    black: { H: '#1A0F0A', h: '#2A1B14' },
    blonde: { H: '#A87332', h: '#D9A35A' },
    pink: { H: '#9B3D6A', h: '#D6739E' },
    silver: { H: '#7A7A8E', h: '#A8A8C0' },
  };
  const hair = hairs[hairKey] || hairs.brown;
  return {
    H: hair.H,
    h: hair.h,
    B: '#4B2610',
    Y: '#F4C53C',
    S: skin.mid,
    s: skin.shadow,
    L: '#1A0F0A',  // upper lash
    I: eye,        // iris
    W: '#FFFFFF',  // highlight
    R: '#3A1F0E',  // lower rim/lash
    n: skin.shadow, // nose dot
    M: '#C73A4A',  // mouth dark/lip
    m: '#F58A8A',  // mouth inside light
    T: '#FFFFFF',  // tooth
    K: '#2A1B1B',  // body outline
    C: '#FFB8C8',  // shirt placeholder
    P: '#A8DEFF',  // pants placeholder
    X: '#3A1F0E',  // shoe placeholder
  };
};

const ChibiAvatar = ({ skin = 'light', eye = 'brown', hair = 'brown', scale = 6, equipped = {}, style = {} }) => {
  const palette = buildChibiPalette(skin, eye, hair);
  return (
    <div style={{ position: 'relative', width: 24 * scale, height: 37 * scale, ...style }}>
      <PixelArt data={CHIBI_DATA} palette={palette} scale={scale} />
      {/* equipped layers positioned over base */}
      {equipped.head && (
        <div style={{ position: 'absolute', left: 0, top: -2 * scale, width: 24 * scale }}>
          <ClothingArt id={equipped.head} scale={scale} />
        </div>
      )}
      {equipped.outfit && (
        <div style={{ position: 'absolute', left: 0, top: 22 * scale, width: 24 * scale }}>
          <ClothingArt id={equipped.outfit} scale={scale} />
        </div>
      )}
      {equipped.item && (
        <div style={{ position: 'absolute', left: 16 * scale, top: 22 * scale }}>
          <ClothingArt id={equipped.item} scale={scale} />
        </div>
      )}
      {equipped.boots && (
        <div style={{ position: 'absolute', left: 0, top: 32 * scale, width: 24 * scale }}>
          <ClothingArt id={equipped.boots} scale={scale} />
        </div>
      )}
    </div>
  );
};

/* ===== Clothing pixel art library ===== */
const CLOTHING = {
  // HEADS
  starCrown: {
    slot: 'head',
    name: 'Stardust Crown',
    palette: { S: '#FFE9A8', s: '#F4C53C', K: '#2A1B1B', G: '#FFFFFF' },
    data: [
      '....S.......S......S....',
      '...SSS.....SSS....SSS...',
      '..SSGSS...SSGSS..SSGSS..',
      '...SSS.....SSS....SSS...',
      '....s.......s......s....',
      '........................',
      '........................',
      '........................',
    ],
  },
  bunnyEars: {
    slot: 'head',
    name: 'Cloudbunny Hood',
    palette: { W: '#FFFFFF', w: '#DCC7C7', P: '#FFB8C8', K: '#2A1B1B' },
    data: [
      '..W..............W......',
      '.WWW............WWW.....',
      '.WPW............WPW.....',
      '.WPW............WPW.....',
      '.WWW............WWW.....',
      '..W..WWWWWWWWWWW.W......',
      '....WWWWWWWWWWWWWW......',
      '....WWWWWWWWWWWWWW......',
    ],
  },
  thunderHelm: {
    slot: 'head',
    name: 'Voltbloom Helm',
    palette: { Y: '#F4C53C', y: '#FFE9A8', K: '#2A1B1B', G: '#A0A0B0' },
    data: [
      '......Y..............Y..',
      '.....YY..............YY.',
      '....YYY..............YYY',
      '...YyY................YY',
      '...GGGGGGGGGGGGGGGGGGGG.',
      '..GGGGGGGGGGGGGGGGGGGGG.',
      '..GG..............GG.GG.',
      '..GGGGGGGGGGGGGGGGGGGGG.',
    ],
  },
  flameTiara: {
    slot: 'head',
    name: 'Ember Tiara',
    palette: { R: '#F85646', r: '#FF7E70', y: '#FFE9A8', K: '#2A1B1B' },
    data: [
      '........R...R...R.......',
      '.......RrR.RrR.RrR......',
      '......RrryR.RyrrR.......',
      '.......RrR.RrR.RrR......',
      '........R...R...R.......',
      '........................',
      '........................',
      '........................',
    ],
  },

  // OUTFIT (shirts/armor)
  cloudHoodie: {
    slot: 'outfit',
    name: 'Nimbus Hoodie',
    palette: { B: '#A8DEFF', b: '#7FC7F0', K: '#2A1B1B', W: '#FFFFFF' },
    data: [
      '.....KBBBBBBBBBBBBBK....',
      '....KBBBWWBBBBWWBBBBK...',
      '....KBBBBBBBBBBBBBBBK...',
      '....KBBBBKKKKKKBBBBBK...',
      '....KBBBBBBBBBBBBBBBK...',
      '....KbbbbbbbbbbbbbbbK...',
      '....KbbbbbbbbbbbbbbbK...',
      '....KbbbbbbbbbbbbbbbK...',
    ],
  },
  cropPink: {
    slot: 'outfit',
    name: 'Glitchcrop Top',
    palette: { P: '#FFB8C8', p: '#F299B0', K: '#2A1B1B', W: '#FFFFFF' },
    data: [
      '.....KPPPPPPPPPPPPPK....',
      '....KPPWPPPPPPPPWPPK....',
      '....KPpPPPPPPPPPpPPK....',
      '....KPpppppppppppPPK....',
      '.....KKKKKKKKKKKKKK.....',
      '........................',
      '........................',
      '........................',
    ],
  },
  emberJacket: {
    slot: 'outfit',
    name: 'Ember Carapace',
    palette: { R: '#F85646', r: '#D43A2C', K: '#2A1B1B', y: '#FFE9A8' },
    data: [
      '.....KRRRRRRRRRRRRRK....',
      '....KRrrRRRRyRRRRrrRK...',
      '....KRRrRRRyyyRRRrRRK...',
      '....KRRRRRRyRRRRRRRK....',
      '....KRrrrrrrrrrrrrRK....',
      '....KRrrrrrrrrrrrrRK....',
      '....KRrrrrrrrrrrrrRK....',
      '....KRrrrrrrrrrrrrRK....',
    ],
  },
  voidCloak: {
    slot: 'outfit',
    name: 'Void Cloak',
    palette: { K: '#2A1B1B', k: '#4A3838', V: '#D4B8FF', s: '#FFFFFF' },
    data: [
      '....KKKKKKKKKKKKKKKKK...',
      '....KkkkVkkkkkkVkkkK....',
      '....KkkkkkkkskkkkkkK....',
      '....KkkVkkkkkkkkVkkK....',
      '....KkkkkkkksVkkkkkK....',
      '....KkkkkVkkkkkkkkkK....',
      '....KkkkkkkkkkkkVkkK....',
      '....KkkkkkkkkkkkkkkK....',
    ],
  },

  // ITEM (right hand)
  iceStaff: {
    slot: 'item',
    name: 'Frostspire Staff',
    palette: { B: '#A8DEFF', W: '#FFFFFF', K: '#2A1B1B', N: '#7FC7F0' },
    data: [
      '..B.....',
      '.BWB....',
      'BWWWB...',
      '.BNB....',
      '..K.....',
      '..K.....',
      '..K.....',
      '..K.....',
      '..K.....',
      '..K.....',
    ],
  },
  starWand: {
    slot: 'item',
    name: 'Stargaze Scepter',
    palette: { Y: '#F4C53C', S: '#FFE9A8', W: '#FFFFFF', K: '#2A1B1B' },
    data: [
      '..Y.....',
      '.YSY....',
      'YSWSY...',
      '.YSY....',
      '..K.....',
      '..K.....',
      '..K.....',
      '..K.....',
      '..K.....',
      '..K.....',
    ],
  },
  emberBlade: {
    slot: 'item',
    name: 'Ember Blade',
    palette: { R: '#F85646', r: '#D43A2C', y: '#FFE9A8', K: '#2A1B1B' },
    data: [
      '..y.....',
      '..R.....',
      '..R.....',
      '..R.....',
      '..R.....',
      '..R.....',
      '.RrR....',
      'KrKrK...',
      '..K.....',
      '..K.....',
    ],
  },
  voidOrb: {
    slot: 'item',
    name: 'Void Orb',
    palette: { V: '#D4B8FF', v: '#8E5CF7', W: '#FFFFFF', K: '#2A1B1B' },
    data: [
      '.VVV....',
      'VWvWV...',
      'VvWvV...',
      '.VVV....',
      '..K.....',
      '..K.....',
      '..K.....',
      '..K.....',
      '..K.....',
      '..K.....',
    ],
  },

  // AURAS (decorative full-frame) — repurposed as boots
  starAura: {
    slot: 'boots',
    name: 'Stardust Boots',
    palette: { Y: '#FFE9A8', S: '#F4C53C', K: '#2A1B1B', W: '#FFFFFF' },
    data: [
      '.....KSSSSK..KSSSSK.....',
      '.....KSYYSK..KSYYSK.....',
      '.....KSYYSK..KSYYSK.....',
      '.....KSWWSK..KSWWSK.....',
      '....KKSSSSKKKKSSSSKK....',
      '....KSSSSSSKKSSSSSSK....',
      '....KKKKKKKKKKKKKKKK....',
    ],
  },
  emberAura: {
    slot: 'boots',
    name: 'Ember Greaves',
    palette: { R: '#F85646', r: '#D43A2C', y: '#FFE9A8', K: '#2A1B1B' },
    data: [
      '.....KRRRRK..KRRRRK.....',
      '.....KRyyRK..KRyyRK.....',
      '.....KRyrRK..KRyrRK.....',
      '.....KRrrRK..KRrrRK.....',
      '....KKRRRRKKKKRRRRKK....',
      '....KRRRRRRKKRRRRRRK....',
      '....KKKKKKKKKKKKKKKK....',
    ],
  },
};

const ClothingArt = ({ id, scale = 6, style = {} }) => {
  const item = CLOTHING[id];
  if (!item) return null;
  return <PixelArt data={item.data} palette={item.palette} scale={scale} style={style} />;
};

/* ===== Misc pixel decor (clouds, sparkles) ===== */
const SparkleDot = ({ color = '#FFFFFF', size = 4, style = {} }) => (
  <div className="sparkle" style={{
    width: size * 3, height: size * 3, position: 'absolute',
    boxShadow: `${size}px 0 0 ${color}, 0 ${size}px 0 ${color}, ${size * 2}px ${size}px 0 ${color}, ${size}px ${size * 2}px 0 ${color}`,
    ...style,
  }} />
);

const PixelStar = ({ size = 6, color = '#FFE9A8', style = {} }) => (
  <div style={{
    width: size * 5, height: size * 5, position: 'absolute',
    background: color,
    clipPath: 'polygon(50% 0,61% 38%,100% 38%,68% 60%,80% 100%,50% 76%,20% 100%,32% 60%,0 38%,39% 38%)',
    ...style,
  }} />
);

const PixelHeart = ({ size = 4, color = '#F85646', style = {} }) => {
  const data = [
    '.RR.RR.',
    'RRRRRRR',
    'RRRRRRR',
    '.RRRRR.',
    '..RRR..',
    '...R...',
  ];
  return <PixelArt data={data} palette={{ R: color }} scale={size} style={{ position: 'absolute', ...style }} />;
};

/* ===== Logo (your bow, clean SVG-ish CSS rendition for nav fallback if needed) ===== */
/* We'll just <img> the supplied logo. */

window.PixelArt = PixelArt;
window.ChibiAvatar = ChibiAvatar;
window.ClothingArt = ClothingArt;
window.CLOTHING = CLOTHING;
window.SKIN_TONES = SKIN_TONES;
window.EYE_COLORS = EYE_COLORS;
window.SparkleDot = SparkleDot;
window.PixelStar = PixelStar;
window.PixelHeart = PixelHeart;
