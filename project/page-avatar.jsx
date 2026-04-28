/* ============= Avatar page ============= */

const AvatarPage = ({ initialEquip }) => {
  const [skin, setSkin] = useState('light');
  const [eye, setEye] = useState('brown');
  const [equipped, setEquipped] = useState(initialEquip || {
    head: 'starCrown',
    outfit: 'cropPink',
    item: 'starWand',
    boots: null,
  });
  const [activeSlot, setActiveSlot] = useState('head');
  const [bg, setBg] = useState('cloud');

  const [uploadedPixelData, setUploadedPixelData] = useState(null);
  const [editableRegions, setEditableRegions] = useState({ skin: [], eyes: [] });
  const [defaultAvatarAttempted, setDefaultAvatarAttempted] = useState(false);

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

  const uploadedColorMap = uploadedPixelData
    ? buildUploadedAvatarColorMap(editableRegions, SKIN_TONES, EYE_COLORS, skin, eye)
    : {};

  React.useEffect(() => {
    if (defaultAvatarAttempted) return;
    setDefaultAvatarAttempted(true);

    const img = new Image();
    img.onload = async () => {
      const data = await PixelizerUtils.pixelateImage(img, 4, 32);
      setUploadedPixelData(data);
      setEditableRegions(data.suggestedRegions || { skin: [], eyes: [] });
    };
    img.src = 'avatar.png';
  }, [defaultAvatarAttempted]);

  React.useEffect(() => {
    if (!uploadedPixelData) return;
    saveAvatarState({
      pixelData: uploadedPixelData,
      editableRegions,
      skin,
      eye,
    });
  }, [uploadedPixelData, editableRegions, skin, eye]);

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
              {uploadedPixelData ? (
                <PixelizedAvatar 
                  pixelData={uploadedPixelData} 
                  colorMap={uploadedColorMap}
                  scale={8}
                />
              ) : (
                <ChibiAvatar skin={skin} eye={eye} scale={8} equipped={equipped} />
              )}
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

          {/* Skin + Eye switchers OR Color picker for uploaded avatar */}
          <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {uploadedPixelData ? (
              <>
                <SkinEyeSelectors skin={skin} eye={eye} setSkin={setSkin} setEye={setEye} />
                <PixelRegionPicker
                  pixelData={uploadedPixelData}
                  editableRegions={editableRegions}
                  onChange={setEditableRegions}
                />
              </>
            ) : (
              <SkinEyeSelectors skin={skin} eye={eye} setSkin={setSkin} setEye={setEye} />
            )}
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

const SkinEyeSelectors = ({ skin, eye, setSkin, setEye }) => (
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
        {Object.keys(EYE_COLORS).map((eyeKey) => (
          <button
            key={eyeKey}
            onClick={() => setEye(eyeKey)}
            title={eyeKey}
            style={{
              width: 22,
              height: 22,
              border: eye === eyeKey ? '3px solid var(--ink)' : '3px solid transparent',
              background: EYE_COLORS[eyeKey],
              cursor: 'pointer',
              boxShadow: '0 0 0 2px var(--ink)',
              padding: 0,
            }}
          />
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

const PixelRegionPicker = ({ pixelData, editableRegions, onChange }) => {
  const [activeRegion, setActiveRegion] = React.useState('skin');

  if (!pixelData) return null;

  const palette = pixelData.palette || [];

  const toggleColor = (region, color) => {
    const current = editableRegions[region] || [];
    onChange({
      ...editableRegions,
      [region]: current.includes(color)
        ? current.filter((entry) => entry !== color)
        : [...current, color],
    });
  };

  return (
    <>
      <div className="pxl-box no-drop" style={{ background: 'rgba(255,255,255,.92)', padding: 8 }}>
        <div className="pixel" style={{ fontSize: 8, marginBottom: 6 }}>EDITABLE PIXELS</div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
          <button 
            className={`opt ${activeRegion === 'skin' ? 'active' : ''}`}
            onClick={() => setActiveRegion('skin')}
            style={{ fontSize: 8, padding: '4px 8px' }}
          >
            TAG SKIN
          </button>
          <button 
            className={`opt ${activeRegion === 'eyes' ? 'active' : ''}`}
            onClick={() => setActiveRegion('eyes')}
            style={{ fontSize: 8, padding: '4px 8px' }}
          >
            TAG EYES
          </button>
        </div>

        <div className="pixel" style={{ fontSize: 7, marginBottom: 4, opacity: 0.6 }}>
          PICK COLORS FROM THE PIXELIZED AVATAR:
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 22px)', gap: 3, marginBottom: 8 }}>
          {palette.slice(0, 24).map((color, idx) => {
            const selected = (editableRegions[activeRegion] || []).includes(color);
            return (
            <button
              key={idx}
              onClick={() => toggleColor(activeRegion, color)}
              title={color}
              style={{
                width: 22, height: 22,
                border: selected ? '3px solid var(--coral)' : '2px solid var(--ink)',
                background: color,
                cursor: 'pointer',
                padding: 0,
              }}
            />
          )})}
        </div>

        <div className="mono" style={{ fontSize: 13, opacity: 0.7 }}>
          Skin tags: {(editableRegions.skin || []).length} · Eye tags: {(editableRegions.eyes || []).length}
        </div>
      </div>

      {((editableRegions.skin || []).length > 0 || (editableRegions.eyes || []).length > 0) && (
        <button
          className="pxl-btn ghost"
          style={{ fontSize: 8, padding: '6px 10px' }}
          onClick={() => onChange(pixelData.suggestedRegions || { skin: [], eyes: [] })}
        >
          RESET TAGS
        </button>
      )}
    </>
  );
};

window.AvatarPage = AvatarPage;
