/* ============= Avatar page ============= */

const HAIRSTYLES = [
  { id: 'hair-1', src: 'hairstyles/hair-1.png', thumb: 'hairstyle_props/1.png', name: 'Style 1', offsetX: -12, offsetY: 0 },
  { id: 'hair-2', src: 'hairstyles/hair-2.png', thumb: 'hairstyle_props/2.png', name: 'Style 2', offsetX: -40, offsetY: 0 },
  { id: 'hair-3', src: 'hairstyles/hair-3.png', thumb: 'hairstyle_props/3.png', name: 'Style 3', offsetX: 18, offsetY: -12 },
  { id: 'hair-4', src: 'hairstyles/hair-4.png', thumb: 'hairstyle_props/4.png', name: 'Style 4', offsetX: 18, offsetY: -78, drawW: 1080 },
  { id: 'hair-5', src: 'hairstyles/hair-5.png', thumb: 'hairstyle_props/5.png', name: 'Style 5', offsetX: 6, offsetY: -18 },
  { id: 'hair-6', src: 'hairstyles/hair-6.png', thumb: 'hairstyle_props/6.png', name: 'Style 6', offsetX: 18, offsetY: -18 },
];

const AvatarPage = ({ initialEquip }) => {
  const [skin, setSkin] = useState('light');
  const [eye, setEye] = useState('brown');
  const [hair, setHair] = useState('hair-1');
  const [equipped, setEquipped] = useState(initialEquip || {
    head: 'starCrown',
    outfit: 'cropPink',
    item: 'starWand',
    boots: null,
  });
  const [activeSlot, setActiveSlot] = useState('head');
  const [bg, setBg] = useState('cloud');

  const ownedNFTs = NFT_LIBRARY.filter(n => n.owned);
  const slotItems = ownedNFTs.filter(n => n.slot === activeSlot);
  const bootsItems = [
    { id: 'BOOTS-001', name: 'Stardust Boots', art: 'starAura', slot: 'boots', rarity: 'Epic', serial: '#0007 / 50' },
    { id: 'BOOTS-002', name: 'Ember Greaves', art: 'emberAura', slot: 'boots', rarity: 'Legendary', serial: '#0001 / 10' },
  ];

  const totalPoints = (equipped.head ? CLOTHING[equipped.head] && (NFT_LIBRARY.find(n => n.art === equipped.head)?.pointsBonus || 0) : 0)
    + (equipped.outfit ? (NFT_LIBRARY.find(n => n.art === equipped.outfit)?.pointsBonus || 0) : 0)
    + (equipped.item ? (NFT_LIBRARY.find(n => n.art === equipped.item)?.pointsBonus || 0) : 0);

  const equip = (artId) => setEquipped(e => ({ ...e, [activeSlot]: e[activeSlot] === artId ? null : artId }));

  const stageStyle = {
    cloud: { background: 'linear-gradient(to bottom, #A8DEFF 0%, #FFB8C8 60%, #FFE9A8 100%)' },
    night: { background: 'linear-gradient(to bottom, #1A1330 0%, #4A2C5E 60%, #8E5CF7 100%)' },
    dojo: { background: 'linear-gradient(to bottom, #F8E9E5 0%, #DCC7C7 100%)' },
    void: { background: 'radial-gradient(ellipse at center, #4A3838 0%, #2A1B1B 100%)' },
  }[bg];

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <h1 className="pixel" style={{ fontSize: 26 }}>MY AVATAR</h1>
        <span className="mono" style={{ fontSize: 20, opacity: .6 }}>// dress your chibi. earn your points.</span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          <span className="chip">VTO POINTS</span>
          <span className="pixel" style={{ fontSize: 18, color: 'var(--coral)' }}>{totalPoints.toLocaleString()}</span>
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
        {/* STAGE */}
        <div className="pxl-box scanlines" style={{ ...stageStyle, position: 'relative', minHeight: 600, overflow: 'hidden' }}>
          {/* sky stars */}
          <PixelStar size={4} color="#FFFFFF" style={{ top: 30, left: 40 }} />
          <PixelStar size={3} color="#FFE9A8" style={{ top: 70, left: '70%' }} />
          <PixelStar size={5} color="#FFFFFF" style={{ top: 120, left: '40%' }} />
          <SparkleDot color="#FFFFFF" size={3} style={{ top: 60, left: '85%' }} />
          <SparkleDot color="#FFE9A8" size={4} style={{ top: 200, left: 90 }} />

          {/* gridfloor */}
          <div className="gridfloor" />

          {/* Avatar */}
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
            <div className="float">
              <AvatarImageWithEyeOverlay eye={eye} hair={hair} skin={skin} width={220} />
            </div>
          </div>

          {/* nameplate */}
          <div style={{ position: 'absolute', bottom: 20, left: 20, right: 20, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div className="pxl-box dark" style={{ padding: '10px 14px', boxShadow: '0 0 0 4px var(--ink), 0 0 0 6px #fff' }}>
              <div className="pixel" style={{ fontSize: 12, color: 'var(--coral-soft)' }}>WANDERER · LV 14</div>
              <div className="mono" style={{ fontSize: 18 }}>WardrobeForge.eth</div>
            </div>
            <div className="pxl-box dark" style={{ padding: '10px 14px', minWidth: 220 }}>
              <div className="pixel" style={{ fontSize: 9, marginBottom: 6, color: 'var(--pink-neon)' }}>WARDROBE XP</div>
              <div className="bar"><i style={{ width: '72%' }} /></div>
              <div className="mono" style={{ fontSize: 14, marginTop: 4 }}>1,420 / 2,000 XP</div>
            </div>
          </div>

          {/* Background switcher */}
          <div style={{ position: 'absolute', top: 14, right: 14, display: 'flex', gap: 6 }}>
            {['cloud', 'night', 'dojo', 'void'].map(b => (
              <button key={b} className={`opt ${bg === b ? 'active' : ''}`} onClick={() => setBg(b)}>{b}</button>
            ))}
          </div>

          <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SkinEyeSelectors skin={skin} eye={eye} hair={hair} setSkin={setSkin} setEye={setEye} setHair={setHair} />
          </div>

        </div>

        {/* LOADOUT PANEL */}
        <div className="pxl-box" style={{ background: '#fff', padding: 22 }}>
          <div className="pixel" style={{ fontSize: 14, marginBottom: 14 }}>LOADOUT</div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 18 }}>
            {['head', 'outfit', 'item', 'boots'].map(slot => (
              <SlotCell
                key={slot}
                slot={slot}
                active={activeSlot === slot}
                equippedArt={equipped[slot]}
                onClick={() => setActiveSlot(slot)}
              />
            ))}
          </div>

          <hr className="pxl-hr" />

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
            <div className="pixel" style={{ fontSize: 12 }}>INVENTORY</div>
            <div className="mono" style={{ fontSize: 16, opacity: .6 }}>// {activeSlot.toUpperCase()} SLOT</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, maxHeight: 380, overflowY: 'auto', paddingRight: 6 }}>
            {(activeSlot === 'boots' ? bootsItems : slotItems).map(item => {
              const isEquipped = equipped[activeSlot] === item.art;
              return (
                <div
                  key={item.id}
                  className="pxl-box no-drop"
                  onClick={() => equip(item.art)}
                  style={{
                    background: isEquipped ? 'var(--ink)' : '#fff',
                    color: isEquipped ? '#fff' : 'var(--ink)',
                    padding: 8, cursor: 'pointer',
                    position: 'relative',
                  }}
                >
                  {isEquipped && <span className="chip coral" style={{ position: 'absolute', top: 4, right: 4, fontSize: 8 }}>ON</span>}
                  <div style={{ background: isEquipped ? '#3D2828' : 'var(--paper-2)', height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                    <ClothingArt id={item.art} scale={2.5} />
                  </div>
                  <div className="pixel" style={{ fontSize: 8, lineHeight: 1.3 }}>{item.name}</div>
                  <div className="mono" style={{ fontSize: 13, opacity: .7 }}>{item.serial}</div>
                </div>
              );
            })}
            {(activeSlot === 'boots' ? bootsItems : slotItems).length === 0 && (
              <div style={{ gridColumn: '1 / -1', padding: 24, textAlign: 'center', color: 'var(--ink)', opacity: .5 }} className="mono">
                Nothing here yet. Buy a piece to mint a twin.
              </div>
            )}
          </div>

          <hr className="pxl-hr" />

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="pxl-btn ghost" style={{ flex: 1 }} onClick={() => setEquipped({ head: null, outfit: null, item: null, boots: null })}>UNEQUIP ALL</button>
            <button className="pxl-btn" style={{ flex: 1 }}>SAVE LOOK</button>
          </div>
        </div>
      </div>

      {/* equipped detail strip */}
      <div style={{ marginTop: 24 }} className="pxl-box no-drop" >
        <div style={{ background: 'var(--ink)', color: '#fff', padding: '10px 16px' }}>
          <div className="pixel" style={{ fontSize: 11, color: 'var(--pink-neon)' }}>CURRENTLY EQUIPPED</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--ink)' }}>
          {['head', 'outfit', 'item', 'boots'].map(slot => {
            const art = equipped[slot];
            const nft = art ? NFT_LIBRARY.find(n => n.art === art) || bootsItems.find(a => a.art === art) : null;
            return (
              <div key={slot} style={{ background: '#fff', padding: 14 }}>
                <div className="pixel" style={{ fontSize: 9, opacity: .6, marginBottom: 6 }}>{slot.toUpperCase()}</div>
                {nft ? (
                  <>
                    <div className="pixel" style={{ fontSize: 12, marginBottom: 4 }}>{nft.name}</div>
                    <div className="mono" style={{ fontSize: 16, opacity: .7 }}>{nft.serial || '?'}</div>
                  </>
                ) : (
                  <div className="mono" style={{ fontSize: 16, opacity: .4 }}>— empty —</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
);
};

const SkinEyeSelectors = ({ skin, eye, hair, setSkin, setEye, setHair }) => (
  <>
    <div className="pxl-box no-drop" style={{ background: 'rgba(255,255,255,.92)', padding: 8 }}>
      <div className="pixel" style={{ fontSize: 8, marginBottom: 6 }}>SKIN</div>
      <div style={{ display: 'flex', gap: 4 }}>
        {Object.keys(SKIN_TONES).map((skinKey) => (
          <button
            key={skinKey}
            onClick={() => setSkin(skinKey)}
            title={skinKey}
            style={{
              width: 22,
              height: 22,
              border: skin === skinKey ? '3px solid var(--ink)' : '3px solid transparent',
              background: SKIN_TONES[skinKey].mid,
              cursor: 'pointer',
              boxShadow: '0 0 0 2px var(--ink)',
              padding: 0,
            }}
          />
        ))}
      </div>
    </div>
    <div className="pxl-box no-drop" style={{ background: 'rgba(255,255,255,.92)', padding: 8 }}>
      <div className="pixel" style={{ fontSize: 8, marginBottom: 6 }}>EYES</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 22px)', gap: 4 }}>
        {Object.keys(EYE_COLORS).map((eyeKey) => {
          const swatchStyle = eyeKey === 'gradient'
            ? { background: 'linear-gradient(135deg, #F85646, #DCC7C7)' }
            : eyeKey === 'hetero'
              ? { background: 'linear-gradient(135deg, #833303 50%, #333CE0 50%)' }
              : { background: EYE_COLORS[eyeKey] };
          return (
            <button
              key={eyeKey}
              onClick={() => setEye(eyeKey)}
              title={eyeKey}
              style={{
                width: 22,
                height: 22,
                border: eye === eyeKey ? '3px solid var(--ink)' : '3px solid transparent',
                cursor: 'pointer',
                boxShadow: '0 0 0 2px var(--ink)',
                padding: 0,
                ...swatchStyle,
              }}
            />
          );
        })}
      </div>
    </div>
    <div className="pxl-box no-drop" style={{ background: 'rgba(255,255,255,.92)', padding: 8 }}>
      <div className="pixel" style={{ fontSize: 8, marginBottom: 6 }}>HAIR</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
        {HAIRSTYLES.map((h) => (
          <button
            key={h.id}
            onClick={() => setHair(h.id)}
            title={h.name}
            style={{
              width: 44,
              height: 44,
              border: hair === h.id ? '3px solid var(--ink)' : '3px solid transparent',
              background: 'var(--paper-2)',
              cursor: 'pointer',
              boxShadow: '0 0 0 2px var(--ink)',
              padding: 0,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={h.thumb}
              alt={h.name}
              style={{ width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated' }}
            />
          </button>
        ))}
      </div>
    </div>
  </>
);

const SlotCell = ({ slot, active, equippedArt, onClick }) => (
  <div
    onClick={onClick}
    className="pxl-box no-drop"
    style={{
      background: active ? 'var(--coral)' : '#fff',
      cursor: 'pointer',
      padding: 10,
      textAlign: 'center',
      boxShadow: active
        ? '0 -4px 0 0 var(--ink), 0 4px 0 0 var(--ink), -4px 0 0 0 var(--ink), 4px 0 0 0 var(--ink), 0 8px 0 0 var(--coral-deep)'
        : '0 -4px 0 0 var(--ink), 0 4px 0 0 var(--ink), -4px 0 0 0 var(--ink), 4px 0 0 0 var(--ink)',
    }}
  >
    <div className="pixel" style={{ fontSize: 8, marginBottom: 6, color: active ? '#fff' : 'var(--ink)' }}>{slot.toUpperCase()}</div>
    <div style={{ background: active ? '#fff' : 'var(--paper-2)', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {equippedArt ? <ClothingArt id={equippedArt} scale={2} /> : <span className="mono" style={{ fontSize: 14, opacity: .4 }}>empty</span>}
    </div>
  </div>
);

const AVATAR_SOURCE_WIDTH = 1276;
const AVATAR_SOURCE_HEIGHT = 1359;
const LEFT_EYE_IRIS = [
  '.....I...............',
  '.....III.............',
  '.....II..I...........',
  '.....IIIIIIII........',
  '.....IIII.II.........',
  'IIIIII.III.II........',
  'IIIIIII.I...I........',
  'IIII....II.II........',
  'IIIIII.IIIIII........',
  'IIIIIIIIIIIII........',
  'IIIIIIIIIIIIIIIIIIIII',
  'IIIIIIIIIIIIIIIII.II.',
  'IIIIIIIIIIIIIIIIIIII.',
  'IIIIIIIIIIIIIIIIIIII.',
  'IIIIIIIIIIIIIIIIIIII.',
  'IIIIIIIIIIIIIIIIIIIII',
  'IIIIIIIIIIIIIIIIIIIII',
  'IIIIIIIIIIIIIIIIIIIII',
  'IIIIIIIIIIIIIIIIIIIII',
  'IIIIIIIIIIIIIIIIIIIII',
  'IIIIIIIIIIIIIIIIIIIII',
  'IIIIIIIIIIIIIIIIIIII.',
  'IIIIIIIIIIIIIIIIIIII.',
  'IIIIIIIIIIIIIIIIIIII.',
  'IIIIIIIIIIIIIIIIIIII.',
  'IIIIIIIIIIIIIIIIIIII.',
  'IIIIIIIIIIIIIIIIIIII.',
  '....IIIIIIIIIIIIIIIII',
  '....IIIIIIIIIIIIIII..',
  '....IIIIIIIIIIIIIIII.',
  '....IIIIIIIIIIIIIIII.',
  '....IIIIIIIIIIIIIIII.',
  '....IIIIIIIIIIIIIIII.',
  '....IIIIIIIIIIIIIIII.',
  '.....I...III.........',
];
const RIGHT_EYE_IRIS = [
  '...........I.........',
  '........IIIIII.......',
  '........IIII.I.......',
  '........IIIIIII......',
  '........IIIIIII......',
  '........IIIIIIII..I..',
  '........IIIIIIIIIIII.',
  '........IIIIIIIIIIII.',
  '........IIIIIIIIIIIII',
  '........IIIIIIIIIIIII',
  '.IIIIIIIIIIIIIIIIIIII',
  'IIIIIIIIIIIIIIIIIIIII',
  'IIIIIIIIIIIIIIIIIIIII',
  'IIIIIIIIIIIIIIIIIIIII',
  'IIIIIIIIIIIIIIIIIIII.',
  'IIIIIIIIIIIIIIIIIIII.',
  'IIIIIIIIIIIIIIIIIIII.',
  'IIIIIIIIIIIIIIIIIIII.',
  'IIIIIIIIIIIIIIIIIIII.',
  'IIIIIIIIIIIIIIIIIIIII',
  'IIIIIIIIIIIIIIIIIIIII',
  'IIIIIIIIIIIIIIIIIIIII',
  'IIIIIIIIIIIIIIIIIIIII',
  'IIIIIIIIIIIIIIIIIIIII',
  'IIIIIIIIIIIIIIIIIIII.',
  'IIIIIIIIIIIIIIIIIIII.',
  'IIIIIIIIIIIIIIIIIIII.',
  'IIIIIIIIIIIIIIII.....',
  'IIIIIIIIIIIIIII......',
  'IIIIIIIIIIIIIII......',
  'IIIIIIIIIIIIIII......',
  'IIIIIIIIIIIIIII......',
  'IIIIIIIIIIIIIII......',
  'IIIIIIIIIIIIIII......',
  '.I..I...III..........',
];

const HAIR_SOURCE_WIDTH = 1216;
const HAIR_SOURCE_HEIGHT = 1024;
const CANVAS_TOP_PADDING = 200;

const EARS_BY_SKIN = {
  porcelain: 'hairstyles/ears_1.png',
  light:     'hairstyles/ears_2.png',
  warm:      null,
  tan:       'hairstyles/ears_4.png',
  deep:      'hairstyles/ears_5.png',
  lavender:  'hairstyles/ears_6.png',
};

const AvatarImageWithEyeOverlay = ({ eye = 'brown', hair = null, skin = 'light', width = 220 }) => {
  const canvasRef = React.useRef(null);
  const irisColor = EYE_COLORS[eye] || EYE_COLORS.brown;
  const scale = width / AVATAR_SOURCE_WIDTH;
  const hairStyle = hair ? HAIRSTYLES.find(h => h.id === hair) : null;
  const earsSrc = EARS_BY_SKIN[skin] || null;

  const redraw = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const drawEarsOverlay = (onDone) => {
      if (!earsSrc) { onDone(); return; }
      const earsImg = new Image();
      earsImg.onload = () => {
        const drawW = AVATAR_SOURCE_WIDTH;
        const drawH = Math.round(earsImg.naturalHeight * (AVATAR_SOURCE_WIDTH / earsImg.naturalWidth));
        ctx.drawImage(earsImg, 0, CANVAS_TOP_PADDING + 190, drawW, drawH);
        onDone();
      };
      earsImg.onerror = onDone;
      earsImg.src = earsSrc;
    };

    const drawHairThenEars = () => {
      if (!hairStyle) { drawEarsOverlay(() => {}); return; }
      const hairImg = new Image();
      hairImg.onload = () => {
        const drawW = hairStyle.drawW || 950;
        const drawH = HAIR_SOURCE_HEIGHT * (drawW / HAIR_SOURCE_WIDTH);
        const x = (AVATAR_SOURCE_WIDTH - drawW) / 2 - 10 + (hairStyle.offsetX || 0);
        const y = CANVAS_TOP_PADDING - 60 + (hairStyle.offsetY || 0);
        ctx.drawImage(hairImg, x, y, drawW, drawH);
        drawEarsOverlay(() => {});
      };
      hairImg.src = hairStyle.src;
    };

    const img = new Image();
    img.onload = () => {
      canvas.width = AVATAR_SOURCE_WIDTH;
      canvas.height = AVATAR_SOURCE_HEIGHT + CANVAS_TOP_PADDING;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, CANVAS_TOP_PADDING, AVATAR_SOURCE_WIDTH, AVATAR_SOURCE_HEIGHT);

      if (eye !== 'brown') {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const leftRegion  = { x1: 410, y1: 370 + CANVAS_TOP_PADDING, x2: 560, y2: 510 + CANVAS_TOP_PADDING };
        const rightRegion = { x1: 720, y1: 370 + CANVAS_TOP_PADDING, x2: 905, y2: 510 + CANVAS_TOP_PADDING };
        if (eye === 'hetero') {
          applyEyeColorByRegion(imageData.data, canvas.width, [leftRegion],  '#833303');
          applyEyeColorByRegion(imageData.data, canvas.width, [rightRegion], '#333CE0');
        } else if (eye === 'gradient') {
          applyEyeGradientByRegion(imageData.data, canvas.width, [leftRegion, rightRegion], '#F85646', '#DCC7C7');
        } else {
          applyEyeColorByRegion(imageData.data, canvas.width, [leftRegion, rightRegion], irisColor);
        }
        ctx.putImageData(imageData, 0, 0);
      }

      drawHairThenEars();
    };
    img.src = 'avatar.png?v=7';
  }, [eye, irisColor, hairStyle, earsSrc]);

  React.useEffect(() => {
    redraw();
  }, [redraw]);

  return (
    <canvas
      ref={canvasRef}
      aria-label="WardrobeForge avatar"
      role="img"
      style={{
        display: 'block',
        width,
        height: (AVATAR_SOURCE_HEIGHT + CANVAS_TOP_PADDING) * scale,
        imageRendering: 'pixelated',
      }}
    />
  );
};

const applyEyeColorByRegion = (data, canvasWidth, regions, color) => {
  const rgb = hexToRgb(color);
  if (!rgb) return;
  for (const { x1, y1, x2, y2 } of regions) {
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        const idx = (y * canvasWidth + x) * 4;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
        if (a < 50) continue;
        // Only target pixels close to the base iris color #773604 (119,54,4)
        const dr = r - 119, dg = g - 54, db = b - 4;
        const dist = Math.sqrt(dr*dr + dg*dg + db*db);
        if (dist > 55) continue;
        // Preserve relative brightness within the iris (base lum ~75)
        const pixelLum = 0.299 * r + 0.587 * g + 0.114 * b;
        const scale = Math.min(1.5, pixelLum / 75);
        data[idx]     = Math.min(255, Math.round(rgb.r * scale));
        data[idx + 1] = Math.min(255, Math.round(rgb.g * scale));
        data[idx + 2] = Math.min(255, Math.round(rgb.b * scale));
      }
    }
  }
};

const applyEyeGradientByRegion = (data, canvasWidth, regions, colorA, colorB) => {
  const rgbA = hexToRgb(colorA);
  const rgbB = hexToRgb(colorB);
  if (!rgbA || !rgbB) return;
  for (const { x1, y1, x2, y2 } of regions) {
    const spanX = x2 - x1 || 1;
    const spanY = y2 - y1 || 1;
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        const idx = (y * canvasWidth + x) * 4;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
        if (a < 50) continue;
        const dr = r - 119, dg = g - 54, db = b - 4;
        if (Math.sqrt(dr*dr + dg*dg + db*db) > 55) continue;
        // Diagonal gradient t: 0 = top-left (colorA), 1 = bottom-right (colorB)
        const t = ((x - x1) / spanX + (y - y1) / spanY) / 2;
        const gr = Math.round(rgbA.r + (rgbB.r - rgbA.r) * t);
        const gg = Math.round(rgbA.g + (rgbB.g - rgbA.g) * t);
        const gb = Math.round(rgbA.b + (rgbB.b - rgbA.b) * t);
        const pixelLum = 0.299 * r + 0.587 * g + 0.114 * b;
        const scale = Math.min(1.5, pixelLum / 75);
        data[idx]     = Math.min(255, Math.round(gr * scale));
        data[idx + 1] = Math.min(255, Math.round(gg * scale));
        data[idx + 2] = Math.min(255, Math.round(gb * scale));
      }
    }
  }
};

const hexToRgb = (hex) => {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return null;
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
};

window.AvatarPage = AvatarPage;
