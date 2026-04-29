/* ============= Avatar page ============= */

const HAIRSTYLES = [
  { id: 'hair-1', src: 'hairstyles/hair-1.png', thumb: 'hairstyle_props/4.png', name: 'Style 1', offsetX: -12, offsetY: 0 },
  { id: 'hair-2', src: 'hairstyles/hair-2.png', thumb: 'hairstyle_props/3.png', name: 'Style 2', offsetX: -40, offsetY: 0 },
  { id: 'hair-3', src: 'hairstyles/hair-3.png', thumb: 'hairstyle_props/6.png', name: 'Style 3', offsetX: 18, offsetY: -12 },
  { id: 'hair-4', src: 'hairstyles/hair-4.png', thumb: 'hairstyle_props/5.png', name: 'Style 4', offsetX: 18, offsetY: -78, drawW: 1080 },
  { id: 'hair-5', src: 'hairstyles/hair-5.png', thumb: 'hairstyle_props/1.png', name: 'Style 5', offsetX: 6, offsetY: -18 },
  { id: 'hair-6', src: 'hairstyles/hair-6.png', thumb: 'hairstyle_props/2.png', name: 'Style 6', offsetX: 18, offsetY: -18 },
];

const EAR_OVERLAY_BY_SKIN = {
  porcelain: 'hairstyles/ears_1.png',
  light: 'hairstyles/ears_2.png',
  warm: null,
  tan: 'hairstyles/ears_4.png',
  deep: 'hairstyles/ears_5.png',
  rich: 'hairstyles/ears_6.png',
};

const AVATAR_LOADOUT_STORAGE_KEY = 'wardrobeforge-avatar-loadout-v1';

const AvatarPage = ({ initialEquip }) => {
  const defaultGeneratedOutfit = 'base-outfit';
  const defaultBoots = 'base-shoes';
  const defaultHead = 'head-01';
  const defaultItem = 'item-01';
  const validArtIds = new Set(NFT_LIBRARY.map(item => item.art));
  const getValidArt = (artId, fallbackArt) => (artId && validArtIds.has(artId) ? artId : fallbackArt);
  const [skin, setSkin] = useState('light');
  const [eye, setEye] = useState('brown');
  const [hair, setHair] = useState('hair-1');
  const [equipped, setEquipped] = useState(() => {
    const fallback = initialEquip || {
      head: defaultHead,
      outfit: defaultGeneratedOutfit,
      item: defaultItem,
      boots: defaultBoots,
    };

    try {
      const raw = window.localStorage.getItem(AVATAR_LOADOUT_STORAGE_KEY);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return {
        head: getValidArt(parsed.head, fallback.head),
        outfit: getValidArt(parsed.outfit, fallback.outfit),
        item: getValidArt(parsed.item, fallback.item),
        boots: getValidArt(parsed.boots, fallback.boots),
      };
    } catch (error) {
      return fallback;
    }
  });
  const [activeSlot, setActiveSlot] = useState('head');
  const [bg, setBg] = useState('cloud');

  const ownedNFTs = NFT_LIBRARY.filter(n => n.owned);
  const slotItems = ownedNFTs
    .filter(n => n.slot === activeSlot)
    .sort((a, b) => {
      const priority = {
        'head-01': -2,
        'base-outfit': -2,
        'base-shoes': -2,
        'item-01': -2,
      };
      return (priority[a.art] || 0) - (priority[b.art] || 0);
    });

  const totalPoints = (equipped.head ? (NFT_LIBRARY.find(n => n.art === equipped.head)?.pointsBonus || 0) : 0)
    + (equipped.outfit ? (NFT_LIBRARY.find(n => n.art === equipped.outfit)?.pointsBonus || 0) : 0)
    + (equipped.item ? (NFT_LIBRARY.find(n => n.art === equipped.item)?.pointsBonus || 0) : 0)
    + (equipped.boots ? (NFT_LIBRARY.find(n => n.art === equipped.boots)?.pointsBonus || 0) : 0);

  const equip = (artId) => setEquipped(e => ({ ...e, [activeSlot]: e[activeSlot] === artId ? null : artId }));

  React.useEffect(() => {
    window.localStorage.setItem(AVATAR_LOADOUT_STORAGE_KEY, JSON.stringify(equipped));
  }, [equipped]);

  const stageStyle = {
    cloud: { background: 'linear-gradient(to bottom, #A8DEFF 0%, #FFB8C8 60%, #FFE9A8 100%)' },
    dojo: { background: 'linear-gradient(to bottom, #F8E9E5 0%, #DCC7C7 100%)' },
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

      <div className="avatar-page-grid">
        {/* STAGE */}
        <div className="pxl-box scanlines avatar-stage" style={stageStyle}>
          {/* sky stars */}
          <PixelStar size={4} color="#FFFFFF" style={{ top: 30, left: 40 }} />
          <PixelStar size={3} color="#FFE9A8" style={{ top: 70, left: '70%' }} />
          <PixelStar size={5} color="#FFFFFF" style={{ top: 120, left: '40%' }} />
          <SparkleDot color="#FFFFFF" size={3} style={{ top: 60, left: '85%' }} />
          <SparkleDot color="#FFE9A8" size={4} style={{ top: 200, left: 90 }} />

          {/* gridfloor */}
          <div className="gridfloor" />

          {/* Avatar */}
          <div className="avatar-stage-figure">
            <div className="float">
              <AvatarImageWithEyeOverlay skin={skin} eye={eye} hair={hair} head={equipped.head} outfit={equipped.outfit} item={equipped.item} boots={equipped.boots} width={272} />
            </div>
          </div>

          {/* nameplate */}
          <div className="avatar-stage-nameplate" style={{ position: 'absolute', bottom: 20, left: 20, right: 20, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div className="pxl-box dark avatar-stage-identity" style={{ padding: '10px 14px', boxShadow: '0 0 0 4px var(--ink), 0 0 0 6px #fff' }}>
              <div className="pixel" style={{ fontSize: 12, color: 'var(--coral-soft)' }}>WANDERER · LV 14</div>
              <div className="mono" style={{ fontSize: 18 }}>WardrobeForge.eth</div>
            </div>
            <div className="pxl-box dark avatar-stage-xp" style={{ padding: '10px 14px', minWidth: 220 }}>
              <div className="pixel" style={{ fontSize: 9, marginBottom: 6, color: 'var(--pink-neon)' }}>WARDROBE XP</div>
              <div className="bar"><i style={{ width: '72%' }} /></div>
              <div className="mono" style={{ fontSize: 14, marginTop: 4 }}>1,420 / 2,000 XP</div>
            </div>
          </div>

          {/* Background switcher */}
          <div className="avatar-stage-switcher" style={{ position: 'absolute', top: 14, right: 14, display: 'flex', gap: 6 }}>
            {['cloud', 'dojo'].map(b => (
              <button key={b} className={`opt ${bg === b ? 'active' : ''}`} onClick={() => setBg(b)}>{b}</button>
            ))}
          </div>

          <div className="avatar-stage-selectors" style={{ position: 'absolute', top: 14, left: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SkinEyeSelectors skin={skin} eye={eye} hair={hair} setSkin={setSkin} setEye={setEye} setHair={setHair} />
          </div>

        </div>

        {/* LOADOUT PANEL */}
        <div className="pxl-box avatar-loadout-panel" style={{ background: '#fff', padding: 22 }}>
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

          <div className="avatar-inventory-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, maxHeight: 292, overflowY: 'auto', paddingTop: 4, paddingLeft: 4, paddingRight: 10, paddingBottom: 4 }}>
            {slotItems.map(item => {
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
                  <div style={{ background: isEquipped ? '#3D2828' : 'var(--paper-2)', height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                    <ClothingArt id={item.art} scale={3} />
                  </div>
                  <div className="pixel" style={{ fontSize: 8, lineHeight: 1.3 }}>{item.name}</div>
                  <div className="mono" style={{ fontSize: 13, opacity: .7 }}>{item.serial}</div>
                </div>
              );
            })}
            {slotItems.length === 0 && (
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
            const nft = art ? NFT_LIBRARY.find(n => n.art === art) : null;
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
    <div
      className="pxl-box no-drop"
      style={{ background: 'rgba(255,255,255,.92)', padding: 8, alignSelf: 'flex-start' }}
    >
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
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gridTemplateRows: 'repeat(3, 56px)',
          gap: 4,
          width: '100%',
        }}
      >
        {HAIRSTYLES.map((h) => (
          <button
            key={h.id}
            onClick={() => setHair(h.id)}
            title={h.name}
            style={{
              width: '100%',
              height: '100%',
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
              style={{ width: '132%', height: '132%', objectFit: 'contain', imageRendering: 'pixelated' }}
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
    <div style={{ background: active ? '#fff' : 'var(--paper-2)', height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {equippedArt ? <ClothingArt id={equippedArt} scale={3.25} /> : <span className="mono" style={{ fontSize: 14, opacity: .4 }}>empty</span>}
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
const CANVAS_TOP_PADDING = 640;
const HEAD_OVERLAY_BOTTOM_Y = CANVAS_TOP_PADDING + 1387;
const ITEM_HAND_ANCHOR_X = 855;
const ITEM_HAND_ANCHOR_Y = CANVAS_TOP_PADDING + 930;
const ITEM_MAX_DRAW_WIDTH = 430;
const ITEM_MAX_DRAW_HEIGHT = 520;
const EAR_OVERLAY_X = 362;
const EAR_OVERLAY_Y = CANVAS_TOP_PADDING + 382;
const HEAD_OVERLAY_EXTRA_Y = {
  'head-02': -10,
  'head-08': -10,
  'head-11': 40,
  'head-12': 40,
  'head-15': -10,
  'head-16': 30,
  'head-17': 40,
  'head-18': 30,
  'head-19': 40,
  'head-25': 40,
};

const drawBottomAlignedImage = (ctx, image, alignBottomY) => {
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const scale = AVATAR_SOURCE_WIDTH / sourceWidth;
  const destX = 0;
  const destWidth = sourceWidth * scale;
  const destHeight = sourceHeight * scale;
  const destY = alignBottomY - destHeight;
  ctx.drawImage(
    image,
    0,
    0,
    sourceWidth,
    sourceHeight,
    destX,
    destY,
    destWidth,
    destHeight,
  );
};

const getOpaqueBounds = (image) => {
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const probeCanvas = document.createElement('canvas');
  probeCanvas.width = sourceWidth;
  probeCanvas.height = sourceHeight;
  const probeCtx = probeCanvas.getContext('2d');
  probeCtx.drawImage(image, 0, 0, sourceWidth, sourceHeight);
  const { data } = probeCtx.getImageData(0, 0, sourceWidth, sourceHeight);

  let minX = sourceWidth;
  let minY = sourceHeight;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < sourceHeight; y += 1) {
    for (let x = 0; x < sourceWidth; x += 1) {
      const alpha = data[(y * sourceWidth + x) * 4 + 3];
      if (alpha < 16) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) {
    return { x: 0, y: 0, width: sourceWidth, height: sourceHeight };
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
};

const drawHandheldItem = (ctx, image) => {
  const bounds = getOpaqueBounds(image);
  const scale = Math.min(
    ITEM_MAX_DRAW_WIDTH / bounds.width,
    ITEM_MAX_DRAW_HEIGHT / bounds.height,
  );
  const drawWidth = bounds.width * scale;
  const drawHeight = bounds.height * scale;
  const destX = ITEM_HAND_ANCHOR_X - (drawWidth * 0.2);
  const destY = ITEM_HAND_ANCHOR_Y - (drawHeight * 0.88);

  ctx.drawImage(
    image,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
    destX,
    destY,
    drawWidth,
    drawHeight,
  );
};

const AvatarImageWithEyeOverlay = ({ skin = 'light', eye = 'brown', hair = null, head = null, outfit = null, item = null, boots = null, width = 220 }) => {
  const canvasRef = React.useRef(null);
  const irisColor = EYE_COLORS[eye] || EYE_COLORS.brown;
  const skinTone = SKIN_TONES[skin] || SKIN_TONES.light;
  const earOverlaySrc = EAR_OVERLAY_BY_SKIN[skin] || null;
  const scale = width / AVATAR_SOURCE_WIDTH;
  const hairStyle = hair ? HAIRSTYLES.find(h => h.id === hair) : null;
  const imageGearMap = window.IMAGE_GEAR_MAP || {};
  const imageHead = head ? imageGearMap[head] : null;
  const imageOutfit = outfit ? imageGearMap[outfit] : null;
  const imageItem = item ? imageGearMap[item] : null;
  const imageBoots = boots ? imageGearMap[boots] : null;

  const redraw = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const drawEarOverlay = () => {
      if (!earOverlaySrc) {
        drawHeadOverlay();
        return;
      }

      const earImg = new Image();
      earImg.onload = () => {
        ctx.drawImage(earImg, EAR_OVERLAY_X, EAR_OVERLAY_Y);
        drawHeadOverlay();
      };
      earImg.src = earOverlaySrc;
    };

    const drawHairOnTop = () => {
      if (!hairStyle) {
        drawOutfitOverlay();
        return;
      }
      const hairImg = new Image();
      hairImg.onload = () => {
        const drawW = hairStyle.drawW || 950;
        const drawH = HAIR_SOURCE_HEIGHT * (drawW / HAIR_SOURCE_WIDTH);
        const x = (AVATAR_SOURCE_WIDTH - drawW) / 2 - 10 + (hairStyle.offsetX || 0);
        const y = CANVAS_TOP_PADDING - 60 + (hairStyle.offsetY || 0);
        ctx.drawImage(hairImg, x, y, drawW, drawH);
        drawOutfitOverlay();
      };
      hairImg.src = hairStyle.src;
    };

    const drawHeadOverlay = () => {
      if (!imageHead?.avatarSrc) return;

      const headImg = new Image();
      headImg.onload = () => {
        drawBottomAlignedImage(
          ctx,
          headImg,
          HEAD_OVERLAY_BOTTOM_Y + (HEAD_OVERLAY_EXTRA_Y[head] || 0),
        );
      };
      headImg.src = imageHead.avatarSrc;
    };

    const drawItemOverlay = () => {
      if (!imageItem?.avatarSrc) {
        drawBootsOverlay();
        return;
      }

      const itemImg = new Image();
      itemImg.onload = () => {
        drawHandheldItem(ctx, itemImg);
        drawBootsOverlay();
      };
      itemImg.src = imageItem.avatarSrc;
    };

    const drawBootsOverlay = () => {
      if (!imageBoots?.avatarSrc) {
        drawHairOnTop();
        return;
      }

      const bootsImg = new Image();
      bootsImg.onload = () => {
        ctx.drawImage(bootsImg, 0, CANVAS_TOP_PADDING, AVATAR_SOURCE_WIDTH, AVATAR_SOURCE_HEIGHT);
        drawHairOnTop();
      };
      bootsImg.src = imageBoots.avatarSrc;
    };

    const drawOutfitOverlay = () => {
      if (!imageOutfit?.avatarSrc) {
        drawEarOverlay();
        return;
      }

      const outfitImg = new Image();
      outfitImg.onload = () => {
        ctx.drawImage(outfitImg, 0, CANVAS_TOP_PADDING, AVATAR_SOURCE_WIDTH, AVATAR_SOURCE_HEIGHT);
        drawEarOverlay();
      };
      outfitImg.src = imageOutfit.avatarSrc;
    };

    const img = new Image();
    img.onload = () => {
      canvas.width = AVATAR_SOURCE_WIDTH;
      canvas.height = AVATAR_SOURCE_HEIGHT + CANVAS_TOP_PADDING;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, CANVAS_TOP_PADDING, AVATAR_SOURCE_WIDTH, AVATAR_SOURCE_HEIGHT);

      applySkinToneByRegion(ctx, skinTone);

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

      drawItemOverlay();
    };
    img.src = 'clear_avatar.png?v=1';
  }, [boots, earOverlaySrc, eye, hairStyle, head, imageBoots, imageHead, imageItem, imageOutfit, irisColor, item, outfit, skinTone]);

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

const SKIN_MASK_REGION = {
  x1: 250,
  y1: CANVAS_TOP_PADDING + 20,
  x2: 1030,
  y2: CANVAS_TOP_PADDING + AVATAR_SOURCE_HEIGHT - 10,
};

const clampByte = (value) => Math.max(0, Math.min(255, Math.round(value)));

const mixRgb = (colorA, colorB, amount) => ({
  r: clampByte(colorA.r + (colorB.r - colorA.r) * amount),
  g: clampByte(colorA.g + (colorB.g - colorA.g) * amount),
  b: clampByte(colorA.b + (colorB.b - colorA.b) * amount),
});

const isSkinPixel = (r, g, b, a) => {
  if (a < 40) return false;
  if (r < 150 || g < 110 || b < 75) return false;
  if (r > 255 || g > 244 || b > 225) return false;
  if (r <= g || g <= b) return false;
  if ((r - b) < 18 || (r - g) > 85 || (g - b) > 65) return false;
  return true;
};

const isSkinBorderCandidate = (r, g, b, a) => {
  if (a < 40) return false;
  if (r < 95 || r > 205) return false;
  if (g < 45 || g > 150) return false;
  if (b < 10 || b > 100) return false;
  if (r <= g || g < b) return false;
  if ((r - b) < 35 || (r - g) > 85 || (g - b) > 70) return false;
  return true;
};

const touchesSkinPixel = (data, width, height, x, y, radius = 1) => {
  let nearbySkinPixels = 0;
  for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
    for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
      if (offsetX === 0 && offsetY === 0) continue;
      const sampleX = x + offsetX;
      const sampleY = y + offsetY;
      if (sampleX < 0 || sampleY < 0 || sampleX >= width || sampleY >= height) continue;
      const sampleIndex = (sampleY * width + sampleX) * 4;
      if (isSkinPixel(
        data[sampleIndex],
        data[sampleIndex + 1],
        data[sampleIndex + 2],
        data[sampleIndex + 3],
      )) {
        nearbySkinPixels += 1;
      }
    }
  }
  return nearbySkinPixels >= 1;
};

const applySkinToneByRegion = (ctx, tone) => {
  const { x1, y1, x2, y2 } = SKIN_MASK_REGION;
  const width = x2 - x1 + 1;
  const height = y2 - y1 + 1;
  const imageData = ctx.getImageData(x1, y1, width, height);
  const { data } = imageData;
  const originalData = new Uint8ClampedArray(data);
  const shadow = hexToRgb(tone.shadow);
  const mid = hexToRgb(tone.mid);
  const border = tone.border ? hexToRgb(tone.border) : null;
  if (!shadow || !mid) return;

  const highlight = mixRgb(mid, { r: 255, g: 248, b: 238 }, 0.35);

  for (let index = 0; index < data.length; index += 4) {
    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];
    const a = data[index + 3];
    if (!isSkinPixel(r, g, b, a)) continue;

    const luminance = (0.299 * r) + (0.587 * g) + (0.114 * b);
    const toneMix = Math.max(0, Math.min(1, (luminance - 150) / 95));
    const baseColor = toneMix < 0.6
      ? mixRgb(shadow, mid, toneMix / 0.6)
      : mixRgb(mid, highlight, (toneMix - 0.6) / 0.4);

    const warmth = (r - b) / 120;
    const finalColor = mixRgb(baseColor, highlight, Math.max(0, warmth - 0.55) * 0.12);

    data[index] = finalColor.r;
    data[index + 1] = finalColor.g;
    data[index + 2] = finalColor.b;
  }

  if (border) {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = (y * width + x) * 4;
        const r = originalData[index];
        const g = originalData[index + 1];
        const b = originalData[index + 2];
        const a = originalData[index + 3];
        if (!isSkinBorderCandidate(r, g, b, a)) continue;
        if (!touchesSkinPixel(originalData, width, height, x, y, 2)) continue;
        data[index] = border.r;
        data[index + 1] = border.g;
        data[index + 2] = border.b;
      }
    }
  }

  ctx.putImageData(imageData, x1, y1);
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
