/* ============= Avatar page ============= */

const HAIRSTYLE_ASSET_BASE = 'hairstyles';

const HAIRSTYLES = [
  { id: 'hair-1', imageName: '1.webp', thumb: 'hairstyle_props/4.webp', name: 'Style 1', offsetX: -12, offsetY: 0 },
  { id: 'hair-2', imageName: '2.webp', thumb: 'hairstyle_props/3.webp', name: 'Style 2', offsetX: -40, offsetY: 0 },
  { id: 'hair-3', imageName: '3.webp', thumb: 'hairstyle_props/6.webp', name: 'Style 3', offsetX: 18, offsetY: -12 },
  { id: 'hair-4', imageName: '4.webp', thumb: 'hairstyle_props/5.webp', name: 'Style 4', offsetX: 18, offsetY: -78, drawW: 1080 },
  { id: 'hair-5', imageName: '5.webp', thumb: 'hairstyle_props/1.webp', name: 'Style 5', offsetX: 6, offsetY: -18 },
  { id: 'hair-6', imageName: '6.webp', thumb: 'hairstyle_props/2.webp', name: 'Style 6', offsetX: 18, offsetY: -18 },
];

const HAIR_COLORS = [
  { id: 'black', name: 'Black', swatch: `${HAIRSTYLE_ASSET_BASE}/hairstyle_swatches/black.webp` },
  { id: 'brown', name: 'Brown', swatch: `${HAIRSTYLE_ASSET_BASE}/hairstyle_swatches/brown.webp` },
  { id: 'blonde', name: 'Blonde', swatch: `${HAIRSTYLE_ASSET_BASE}/hairstyle_swatches/blonde.webp` },
  { id: 'red', name: 'Red', swatch: `${HAIRSTYLE_ASSET_BASE}/hairstyle_swatches/red.webp` },
  { id: 'pink', name: 'Pink', swatch: `${HAIRSTYLE_ASSET_BASE}/hairstyle_swatches/pink.webp` },
  { id: 'purple', name: 'Purple', swatch: `${HAIRSTYLE_ASSET_BASE}/hairstyle_swatches/purple.webp` },
  { id: 'blue', name: 'Blue', swatch: `${HAIRSTYLE_ASSET_BASE}/hairstyle_swatches/blue.webp` },
  { id: 'cyan', name: 'Cyan', swatch: `${HAIRSTYLE_ASSET_BASE}/hairstyle_swatches/cyan.webp` },
  { id: 'aqua', name: 'Aqua', swatch: `${HAIRSTYLE_ASSET_BASE}/hairstyle_swatches/aqua.webp` },
  { id: 'green', name: 'Green', swatch: `${HAIRSTYLE_ASSET_BASE}/hairstyle_swatches/green.webp` },
  { id: 'cosmo', name: 'Cosmo', swatch: `${HAIRSTYLE_ASSET_BASE}/hairstyle_swatches/cosmo.webp` },
  { id: 'fade', name: 'Fade', swatch: `${HAIRSTYLE_ASSET_BASE}/hairstyle_swatches/fade.webp` },
];

const getHairstyleColorSrc = (hairstyle, hairColor) => (
  hairstyle ? `${HAIRSTYLE_ASSET_BASE}/hairstyle_colors/${hairColor}/${hairstyle.imageName}` : null
);

const EAR_OVERLAY_BY_SKIN = {
  porcelain: 'hairstyles/ears_1.webp',
  light: 'hairstyles/ears_2.webp',
  warm: 'hairstyles/ears_3.webp',
  tan: 'hairstyles/ears_4.webp',
  deep: 'hairstyles/ears_5.webp',
  rich: 'hairstyles/ears_6.webp',
};

const AVATAR_LOADOUT_STORAGE_KEY = 'wardrobeforge-avatar-loadout-v1';
const SAVED_AVATAR_COLLECTION_STORAGE_KEY = 'wardrobeforge-saved-avatar-collection-v1';
const MAX_SAVED_LOOKS = 24;

const getAvatarScopedStorageKey = (baseKey, userId = null) => (
  window.WardrobeForgeAuth?.getScopedStorageKey?.(baseKey, userId) || baseKey
);

const readEquippedLoadout = (storageKey, fallback, getValidArt) => {
  try {
    const raw = window.localStorage.getItem(storageKey);
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
};

const readSavedLooks = (storageKey) => {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((entry) => entry && typeof entry.imageSrc === 'string') : [];
  } catch (error) {
    return [];
  }
};

const persistSavedLooks = (storageKey, looks) => {
  if (!Array.isArray(looks)) return;

  for (let count = looks.length; count >= 0; count -= 1) {
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify(looks.slice(0, count)),
      );
      return looks.slice(0, count);
    } catch (error) {
      if (count === 0) {
        try {
          window.localStorage.removeItem(storageKey);
        } catch (removeError) {
          // Ignore storage cleanup failures and keep the page interactive.
        }
        return [];
      }
    }
  }

  return [];
};

const createSavedLookImage = (sourceCanvas) => {
  const targetWidth = 160;
  const scale = targetWidth / sourceCanvas.width;
  const targetHeight = Math.max(1, Math.round(sourceCanvas.height * scale));
  const previewCanvas = document.createElement('canvas');
  previewCanvas.width = targetWidth;
  previewCanvas.height = targetHeight;

  const previewCtx = previewCanvas.getContext('2d');
  previewCtx.imageSmoothingEnabled = false;
  previewCtx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);

  return previewCanvas.toDataURL('image/png');
};

const getAvatarItemXpBonus = (item) => {
  if (!item || item.pointsBonus === 0) return 0;

  return ({
    Common: 20,
    Rare: 45,
    Epic: 80,
    Legendary: 140,
  }[item.rarity] || 20);
};

const getAvatarItemStars = (itemStars, artId) => (
  artId ? Math.max(1, Math.min(3, Number(itemStars?.[artId]) || 1)) : 0
);

const AvatarPage = ({ initialEquip, currentUser, goto, openAuthModal, equipRequest = null }) => {
  const defaultGeneratedOutfit = 'base-outfit';
  const defaultBoots = 'base-shoes';
  const defaultHead = null;
  const defaultItem = null;
  const validArtIds = React.useMemo(() => new Set(NFT_LIBRARY.map(item => item.art)), []);
  const accountSnapshot = React.useMemo(
    () => window.WardrobeForgeAuth?.getAccountSnapshot?.(currentUser?.id) || { balance: 300, xp: 0, ownedArtIds: ['base-outfit', 'base-shoes'], itemStars: { 'base-outfit': 1, 'base-shoes': 1 } },
    [currentUser],
  );
  const ownedArtIds = React.useMemo(() => new Set(currentUser ? accountSnapshot.ownedArtIds : NFT_LIBRARY.filter(n => n.owned).map(n => n.art)), [accountSnapshot.ownedArtIds, currentUser]);
  const getValidArt = React.useCallback((artId, fallbackArt) => (artId && validArtIds.has(artId) ? artId : fallbackArt), [validArtIds]);
  const sanitizeEquippedArt = React.useCallback((artId, fallbackArt) => {
    const validArt = getValidArt(artId, fallbackArt);
    return validArt && ownedArtIds.has(validArt) ? validArt : fallbackArt;
  }, [getValidArt, ownedArtIds]);
  const fallbackLoadout = React.useMemo(() => (initialEquip || {
    head: defaultHead,
    outfit: defaultGeneratedOutfit,
    item: defaultItem,
    boots: defaultBoots,
  }), [defaultBoots, defaultGeneratedOutfit, defaultHead, defaultItem, initialEquip]);
  const userId = currentUser?.id || null;
  const loadoutStorageKey = React.useMemo(() => getAvatarScopedStorageKey(AVATAR_LOADOUT_STORAGE_KEY, userId), [userId]);
  const savedLooksStorageKey = React.useMemo(() => getAvatarScopedStorageKey(SAVED_AVATAR_COLLECTION_STORAGE_KEY, userId), [userId]);
  const [skin, setSkin] = useState('light');
  const [eye, setEye] = useState('brown');
  const [hair, setHair] = useState('hair-1');
  const [hairColor, setHairColor] = useState('black');
  const [equipped, setEquipped] = useState(() => readEquippedLoadout(loadoutStorageKey, fallbackLoadout, sanitizeEquippedArt));
  const [activeSlot, setActiveSlot] = useState('head');
  const [bg, setBg] = useState('cloud');
  const [openAuthenticityArtId, setOpenAuthenticityArtId] = useState(null);
  const avatarCanvasRef = React.useRef(null);
  const [savedLooks, setSavedLooks] = useState(() => readSavedLooks(savedLooksStorageKey));
  const [avatarStateLoaded, setAvatarStateLoaded] = React.useState(() => !currentUser?.id);
  const avatarSyncTimeoutRef = React.useRef(null);

  const ownedNFTs = NFT_LIBRARY.filter(n => ownedArtIds.has(n.art));
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

  const totalPoints = accountSnapshot.balance;

  const equip = (artId) => setEquipped(e => ({ ...e, [activeSlot]: e[activeSlot] === artId ? null : artId }));

  React.useEffect(() => {
    window.localStorage.setItem(loadoutStorageKey, JSON.stringify(equipped));
  }, [equipped, loadoutStorageKey]);

  React.useEffect(() => {
    let cancelled = false;
    const localEquipped = readEquippedLoadout(loadoutStorageKey, fallbackLoadout, sanitizeEquippedArt);
    const localSavedLooks = readSavedLooks(savedLooksStorageKey);

    setEquipped(localEquipped);
    setSavedLooks(localSavedLooks);
    setAvatarStateLoaded(!currentUser?.id);

    if (!currentUser?.id) return () => {};

    window.WardrobeForgeAuth?.getAvatarState?.({
      userId: currentUser.id,
      fallbackLoadout: localEquipped,
      fallbackSavedLooks: localSavedLooks,
    }).then((avatarState) => {
      if (cancelled || !avatarState) return;
      setEquipped({
        head: sanitizeEquippedArt(avatarState.equipped?.head, fallbackLoadout.head),
        outfit: sanitizeEquippedArt(avatarState.equipped?.outfit, fallbackLoadout.outfit),
        item: sanitizeEquippedArt(avatarState.equipped?.item, fallbackLoadout.item),
        boots: sanitizeEquippedArt(avatarState.equipped?.boots, fallbackLoadout.boots),
      });
      setSavedLooks(Array.isArray(avatarState.savedLooks) ? avatarState.savedLooks : []);
      setAvatarStateLoaded(true);
    }).catch(() => {
      if (cancelled) return;
      setAvatarStateLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, fallbackLoadout, loadoutStorageKey, sanitizeEquippedArt, savedLooksStorageKey]);

  React.useEffect(() => {
    const persistedLooks = persistSavedLooks(savedLooksStorageKey, savedLooks);
    if (persistedLooks.length !== savedLooks.length) {
      setSavedLooks(persistedLooks);
    }
  }, [savedLooks, savedLooksStorageKey]);

  React.useEffect(() => {
    if (!currentUser?.id || !avatarStateLoaded) return () => {};

    if (avatarSyncTimeoutRef.current) {
      window.clearTimeout(avatarSyncTimeoutRef.current);
    }

    avatarSyncTimeoutRef.current = window.setTimeout(() => {
      window.WardrobeForgeAuth?.saveAvatarState?.({
        userId: currentUser.id,
        equipped,
        savedLooks,
      }).catch(() => {});
    }, 250);

    return () => {
      if (avatarSyncTimeoutRef.current) {
        window.clearTimeout(avatarSyncTimeoutRef.current);
        avatarSyncTimeoutRef.current = null;
      }
    };
  }, [avatarStateLoaded, currentUser?.id, equipped, savedLooks]);

  React.useEffect(() => {
    if (!equipRequest?.art || !equipRequest?.slot) return;
    if (!ownedArtIds.has(equipRequest.art)) return;

    setEquipped((current) => ({
      ...current,
      [equipRequest.slot]: equipRequest.art,
    }));
    setActiveSlot(equipRequest.slot);
  }, [equipRequest, ownedArtIds]);

  React.useEffect(() => {
    setOpenAuthenticityArtId(null);
  }, [activeSlot, currentUser?.id]);

  const saveLook = () => {
    const canvas = avatarCanvasRef.current;
    if (!canvas) return;
    if (!currentUser) {
      if (openAuthModal) openAuthModal();
      return;
    }
    const imageSrc = createSavedLookImage(canvas);
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      imageSrc,
    };
    setSavedLooks((current) => [entry, ...current].slice(0, MAX_SAVED_LOOKS));
  };

  const stageStyle = {
    cloud: { background: 'linear-gradient(to bottom, #A8DEFF 0%, #FFB8C8 60%, #FFE9A8 100%)' },
    dojo: { background: 'linear-gradient(to bottom, #F8E9E5 0%, #DCC7C7 100%)' },
  }[bg];
  const accountXp = accountSnapshot.xp || 0;
  const equippedXp = ['head', 'outfit', 'item', 'boots']
    .map((slot) => {
      const item = NFT_LIBRARY.find((entry) => entry.art === equipped[slot]) || null;
      const stars = getAvatarItemStars(accountSnapshot.itemStars, equipped[slot]);
      return getAvatarItemXpBonus(item) * stars;
    })
    .reduce((sum, value) => sum + value, 0);
  const xpPerLevel = 250;
  const currentLevel = Math.max(1, Math.floor(accountXp / xpPerLevel) + 1);
  const wardrobeXp = Math.min(100, (equippedXp / xpPerLevel) * 100);
  const profileLabel = currentUser ? `${currentUser.displayName} · LV ${currentLevel}` : 'GUEST MODE';
  const profileSubLabel = currentUser ? currentUser.email : 'Test your fit. Save requires sign in.';

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <h1 className="pixel" style={{ fontSize: 26 }}>MY AVATAR</h1>
        <span className="mono" style={{ fontSize: 20, opacity: .6 }}>// dress your chibi. earn your points.</span>
        {currentUser && (
          <div className="vto-balance-actions">
            <span className="vto-balance-badge">
              <span className="chip">VTO POINTS</span>
              <img className="vto-token-icon" src="assets/token.webp" alt="VTO token" decoding="async" />
              <span className="pixel" style={{ fontSize: 18, color: 'var(--coral)' }}>{totalPoints.toLocaleString()}</span>
            </span>
            <button className="pxl-btn ghost vto-balance-topup-btn" onClick={() => goto('topup')}>TOP UP</button>
          </div>
        )}
      </div>

      <div className="avatar-page-grid">
        <div className="pxl-box scanlines avatar-stage" style={stageStyle}>
          <PixelStar size={4} color="#FFFFFF" style={{ top: 30, left: 40 }} />
          <PixelStar size={3} color="#FFE9A8" style={{ top: 70, left: '70%' }} />
          <PixelStar size={5} color="#FFFFFF" style={{ top: 120, left: '40%' }} />
          <SparkleDot color="#FFFFFF" size={3} style={{ top: 60, left: '85%' }} />
          <SparkleDot color="#FFE9A8" size={4} style={{ top: 200, left: 90 }} />

          <div className="gridfloor" />

          <div className="avatar-stage-figure">
            <div className="float">
              <AvatarImageWithEyeOverlay
                canvasRef={avatarCanvasRef}
                skin={skin}
                eye={eye}
                hair={hair}
                hairColor={hairColor}
                head={equipped.head}
                outfit={equipped.outfit}
                item={equipped.item}
                boots={equipped.boots}
                width={272}
              />
            </div>
          </div>

          <div className="avatar-stage-switcher" style={{ position: 'absolute', top: 14, right: 14, display: 'flex', gap: 6 }}>
            {['cloud', 'dojo'].map(b => (
              <button key={b} className={`opt ${bg === b ? 'active' : ''}`} onClick={() => setBg(b)}>{b}</button>
            ))}
          </div>

          <div className="avatar-stage-sidebar">
            <div className="avatar-stage-selectors">
              <SkinEyeSelectors
                skin={skin}
                eye={eye}
                hair={hair}
                hairColor={hairColor}
                setSkin={setSkin}
                setEye={setEye}
                setHair={setHair}
                setHairColor={setHairColor}
              />
            </div>

            <div className="avatar-stage-nameplate">
              <div className="pxl-box dark avatar-stage-identity" style={{ padding: '10px 14px', boxShadow: '0 0 0 4px var(--ink), 0 0 0 6px #fff' }}>
                <div className="pixel" style={{ fontSize: 12, color: 'var(--coral-soft)' }}>{profileLabel.toUpperCase()}</div>
                <div className="mono" style={{ fontSize: 18 }}>{profileSubLabel}</div>
              </div>
              <div className="pxl-box dark avatar-stage-xp" style={{ padding: '10px 14px', minWidth: 220 }}>
                <div className="pixel" style={{ fontSize: 9, marginBottom: 6, color: 'var(--pink-neon)' }}>WARDROBE XP</div>
                <div className="bar"><i style={{ width: `${wardrobeXp}%` }} /></div>
                <div className="mono" style={{ fontSize: 14, marginTop: 4 }}>{equippedXp.toLocaleString()} / {xpPerLevel.toLocaleString()} XP</div>
              </div>
            </div>
          </div>
        </div>

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
              const authenticityCode = accountSnapshot.authenticityCodes?.[item.art] || '';
              const isAuthenticityOpen = openAuthenticityArtId === item.art;
              return (
                <div
                  key={item.id}
                  className="pxl-box no-drop"
                  onClick={() => equip(item.art)}
                  style={{
                    background: isEquipped ? 'var(--ink)' : '#fff',
                    color: isEquipped ? '#fff' : 'var(--ink)',
                    padding: 8,
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                >
                  {currentUser && authenticityCode && (
                    <button
                      type="button"
                      className={`inventory-auth-id-btn ${isAuthenticityOpen ? 'active' : ''}`}
                      aria-label={`View authenticity ID for ${item.name}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        setOpenAuthenticityArtId((current) => (current === item.art ? null : item.art));
                      }}
                    >
                      ID
                    </button>
                  )}
                  {isEquipped && <span className="chip coral" style={{ position: 'absolute', top: 4, right: 4, fontSize: 8 }}>ON</span>}
                  {currentUser && authenticityCode && isAuthenticityOpen && (
                    <div
                      className="inventory-auth-id-popover"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="pixel inventory-auth-id-label">AUTHENTICITY ID</div>
                      <div className="mono inventory-auth-id-value">{authenticityCode}</div>
                    </div>
                  )}
                  <div style={{ background: isEquipped ? '#3D2828' : 'var(--paper-2)', height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                    <GearInventoryArt id={item.art} size={96} />
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
            <button className="pxl-btn" style={{ flex: 1, whiteSpace: 'nowrap' }} onClick={saveLook}>{currentUser ? 'SAVE LOOK' : 'SAVE LOOK / SIGN IN'}</button>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24 }} className="pxl-box no-drop">
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

        <div style={{ borderTop: '1px solid var(--ink)', padding: 16, background: '#fff' }}>
          <div className="pixel" style={{ fontSize: 11, marginBottom: 12, color: 'var(--pink-neon)' }}>{currentUser ? 'SAVED COLLECTION' : 'GUEST COLLECTION PREVIEW'}</div>
          {savedLooks.length ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
              {savedLooks.map((look, index) => (
                <div key={look.id} className="pxl-box no-drop" style={{ background: 'var(--paper-2)', padding: 10 }}>
                  <div style={{ background: '#fff', marginBottom: 8, padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 150 }}>
                    <img
                      src={look.imageSrc}
                      alt={`Saved look ${savedLooks.length - index}`}
                      loading="lazy"
                      decoding="async"
                      style={{ width: '100%', height: 'auto', display: 'block', imageRendering: 'pixelated' }}
                    />
                  </div>
                  <div className="mono" style={{ fontSize: 14, opacity: .7 }}>LOOK {savedLooks.length - index}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mono" style={{ fontSize: 16, opacity: .5 }}>
              {currentUser ? 'Save a look to start your collection.' : 'You can test outfits freely. Sign in when you want to save one.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SkinEyeSelectors = ({ skin, eye, hair, hairColor, setSkin, setEye, setHair, setHairColor }) => (
  <>
    <div className="pxl-box no-drop" style={{ background: 'rgba(255,255,255,.92)', padding: 8, alignSelf: 'flex-start' }}>
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
              loading="lazy"
              decoding="async"
              style={{ width: '132%', height: '132%', objectFit: 'contain', imageRendering: 'pixelated' }}
            />
          </button>
        ))}
      </div>
      <div className="pixel" style={{ fontSize: 8, marginTop: 8, marginBottom: 6 }}>COLOR</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 22px)', gap: 4 }}>
        {HAIR_COLORS.map((color) => (
          <button
            key={color.id}
            onClick={() => setHairColor(color.id)}
            title={color.name}
            style={{
              width: 22,
              height: 22,
              appearance: 'none',
              WebkitAppearance: 'none',
              border: hairColor === color.id ? '3px solid var(--ink)' : '3px solid transparent',
              borderRadius: 0,
              cursor: 'pointer',
              boxShadow: '0 0 0 2px var(--ink)',
              padding: 0,
              backgroundColor: 'var(--paper-2)',
              backgroundImage: `url(${color.swatch})`,
              backgroundSize: '100% 100%',
              backgroundOrigin: 'border-box',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              backgroundClip: 'border-box',
            }}
            aria-label={color.name}
          />
        ))}
      </div>
    </div>
  </>
);

const GearInventoryArt = ({ id, size = 96 }) => {
  const imageGearMap = window.IMAGE_GEAR_MAP || {};
  const gear = id ? imageGearMap[id] : null;
  if (!gear?.inventorySrc) {
    return <span className="mono" style={{ fontSize: 14, opacity: .4 }}>empty</span>;
  }

  return (
    <img
      src={gear.inventorySrc}
      alt={gear.name || id}
      loading="lazy"
      decoding="async"
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        imageRendering: 'pixelated',
        display: 'block',
      }}
    />
  );
};

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
      <GearInventoryArt id={equippedArt} size={72} />
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
const EAR_OVERLAY_X = 370;
const EAR_OVERLAY_Y = CANVAS_TOP_PADDING + 418;
const EAR_OVERLAY_SCALE = 1.18;
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

const AVATAR_BASE_SRC = 'clear_avatar.webp?v=2';
const decodedImageCache = new Map();
const opaqueBoundsCache = new WeakMap();

const loadCachedImage = (src) => {
  if (!src) return Promise.resolve(null);

  const cached = decodedImageCache.get(src);
  if (cached) return cached;

  const pending = new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => {
      decodedImageCache.delete(src);
      reject(new Error(`Failed to load avatar layer: ${src}`));
    };
    image.src = src;
  });

  decodedImageCache.set(src, pending);
  return pending;
};

const drawBottomAlignedImage = (ctx, image, alignBottomY) => {
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const scale = AVATAR_SOURCE_WIDTH / sourceWidth;
  const destWidth = sourceWidth * scale;
  const destHeight = sourceHeight * scale;
  const destY = alignBottomY - destHeight;
  ctx.drawImage(image, 0, 0, sourceWidth, sourceHeight, 0, destY, destWidth, destHeight);
};

const getOpaqueBounds = (image) => {
  const cachedBounds = opaqueBoundsCache.get(image);
  if (cachedBounds) return cachedBounds;

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

  const bounds = maxX < minX || maxY < minY
    ? { x: 0, y: 0, width: sourceWidth, height: sourceHeight }
    : {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };

  opaqueBoundsCache.set(image, bounds);
  return bounds;
};

const drawHandheldItem = (ctx, image) => {
  const bounds = getOpaqueBounds(image);
  const scale = Math.min(ITEM_MAX_DRAW_WIDTH / bounds.width, ITEM_MAX_DRAW_HEIGHT / bounds.height);
  const drawWidth = bounds.width * scale;
  const drawHeight = bounds.height * scale;
  const destX = ITEM_HAND_ANCHOR_X - (drawWidth * 0.2);
  const destY = ITEM_HAND_ANCHOR_Y - (drawHeight * 0.88);

  ctx.drawImage(image, bounds.x, bounds.y, bounds.width, bounds.height, destX, destY, drawWidth, drawHeight);
};

const AvatarImageWithEyeOverlay = ({ skin = 'light', eye = 'brown', hair = null, hairColor = 'black', head = null, outfit = null, item = null, boots = null, width = 220, canvasRef: externalCanvasRef = null }) => {
  const internalCanvasRef = React.useRef(null);
  const canvasRef = externalCanvasRef || internalCanvasRef;
  const drawRequestRef = React.useRef(0);
  const irisColor = EYE_COLORS[eye] || EYE_COLORS.brown;
  const skinTone = SKIN_TONES[skin] || SKIN_TONES.light;
  const earOverlaySrc = EAR_OVERLAY_BY_SKIN[skin] || null;
  const scale = width / AVATAR_SOURCE_WIDTH;
  const hairStyle = hair ? HAIRSTYLES.find(h => h.id === hair) : null;
  const hairStyleSrc = getHairstyleColorSrc(hairStyle, hairColor);
  const imageGearMap = window.IMAGE_GEAR_MAP || {};
  const imageHead = head ? imageGearMap[head] : null;
  const imageOutfit = outfit ? imageGearMap[outfit] : null;
  const imageItem = item ? imageGearMap[item] : null;
  const imageBoots = boots ? imageGearMap[boots] : null;

  const redraw = React.useCallback(() => {
    const drawRequestId = drawRequestRef.current + 1;
    drawRequestRef.current = drawRequestId;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const isCurrentDraw = () => drawRequestRef.current === drawRequestId;
    const drawLayers = async () => {
      const [baseImg, itemImg, bootsImg, hairImg, outfitImg, earImg, headImg] = await Promise.all([
        loadCachedImage(AVATAR_BASE_SRC),
        loadCachedImage(imageItem?.avatarSrc).catch(() => null),
        loadCachedImage(imageBoots?.avatarSrc).catch(() => null),
        loadCachedImage(hairStyleSrc).catch(() => null),
        loadCachedImage(imageOutfit?.avatarSrc).catch(() => null),
        loadCachedImage(earOverlaySrc).catch(() => null),
        loadCachedImage(imageHead?.avatarSrc).catch(() => null),
      ]);

      if (!isCurrentDraw() || !baseImg) return;

      const composedCanvas = document.createElement('canvas');
      composedCanvas.width = AVATAR_SOURCE_WIDTH;
      composedCanvas.height = AVATAR_SOURCE_HEIGHT + CANVAS_TOP_PADDING;
      const composedCtx = composedCanvas.getContext('2d');

      composedCtx.clearRect(0, 0, composedCanvas.width, composedCanvas.height);
      composedCtx.drawImage(baseImg, 0, CANVAS_TOP_PADDING, AVATAR_SOURCE_WIDTH, AVATAR_SOURCE_HEIGHT);

      applySkinToneByRegion(composedCtx, skinTone);

      if (eye !== 'brown') {
        const imageData = composedCtx.getImageData(0, 0, composedCanvas.width, composedCanvas.height);
        const leftRegion = { x1: 410, y1: 370 + CANVAS_TOP_PADDING, x2: 560, y2: 510 + CANVAS_TOP_PADDING };
        const rightRegion = { x1: 720, y1: 370 + CANVAS_TOP_PADDING, x2: 905, y2: 510 + CANVAS_TOP_PADDING };
        if (eye === 'hetero') {
          applyEyeColorByRegion(imageData.data, composedCanvas.width, [leftRegion], '#833303');
          applyEyeColorByRegion(imageData.data, composedCanvas.width, [rightRegion], '#333CE0');
        } else if (eye === 'gradient') {
          applyEyeGradientByRegion(imageData.data, composedCanvas.width, [leftRegion, rightRegion], '#F85646', '#DCC7C7');
        } else {
          applyEyeColorByRegion(imageData.data, composedCanvas.width, [leftRegion, rightRegion], irisColor);
        }
        composedCtx.putImageData(imageData, 0, 0);
      }

      if (itemImg) {
        drawHandheldItem(composedCtx, itemImg);
      }

      if (bootsImg) {
        composedCtx.drawImage(bootsImg, 0, CANVAS_TOP_PADDING, AVATAR_SOURCE_WIDTH, AVATAR_SOURCE_HEIGHT);
      }

      if (hairImg && hairStyle) {
        const drawW = hairStyle.drawW || 950;
        const drawH = HAIR_SOURCE_HEIGHT * (drawW / HAIR_SOURCE_WIDTH);
        const x = (AVATAR_SOURCE_WIDTH - drawW) / 2 - 10 + (hairStyle.offsetX || 0);
        const y = CANVAS_TOP_PADDING - 60 + (hairStyle.offsetY || 0);
        composedCtx.drawImage(hairImg, x, y, drawW, drawH);
      }

      if (outfitImg) {
        composedCtx.drawImage(outfitImg, 0, CANVAS_TOP_PADDING, AVATAR_SOURCE_WIDTH, AVATAR_SOURCE_HEIGHT);
      }

      if (earImg) {
        const sourceWidth = earImg.naturalWidth || earImg.width;
        const sourceHeight = earImg.naturalHeight || earImg.height;
        const drawWidth = sourceWidth * EAR_OVERLAY_SCALE;
        const drawHeight = sourceHeight * EAR_OVERLAY_SCALE;
        const drawX = EAR_OVERLAY_X - ((drawWidth - sourceWidth) / 2);
        const drawY = EAR_OVERLAY_Y - ((drawHeight - sourceHeight) / 2);
        composedCtx.drawImage(earImg, 0, 0, sourceWidth, sourceHeight, drawX, drawY, drawWidth, drawHeight);
      }

      if (headImg) {
        drawBottomAlignedImage(composedCtx, headImg, HEAD_OVERLAY_BOTTOM_Y + (HEAD_OVERLAY_EXTRA_Y[head] || 0));
      }

      if (!isCurrentDraw()) return;

      if (canvas.width !== composedCanvas.width) canvas.width = composedCanvas.width;
      if (canvas.height !== composedCanvas.height) canvas.height = composedCanvas.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(composedCanvas, 0, 0);
    };

    drawLayers().catch(() => {});
  }, [boots, earOverlaySrc, eye, hairStyle, hairStyleSrc, head, imageBoots, imageHead, imageItem, imageOutfit, irisColor, item, outfit, skinTone]);

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
    for (let y = y1; y <= y2; y += 1) {
      for (let x = x1; x <= x2; x += 1) {
        const idx = (y * canvasWidth + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];
        if (a < 50) continue;
        const dr = r - 119;
        const dg = g - 54;
        const db = b - 4;
        const dist = Math.sqrt(dr * dr + dg * dg + db * db);
        if (dist > 55) continue;
        const pixelLum = 0.299 * r + 0.587 * g + 0.114 * b;
        const scale = Math.min(1.5, pixelLum / 75);
        data[idx] = Math.min(255, Math.round(rgb.r * scale));
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
  if (r < 90 || r > 235) return false;
  if (g < 50 || g > 190) return false;
  if (b < 10 || b > 140) return false;
  if (r <= g || g < b) return false;
  if ((r - b) < 20 || (r - g) > 110 || (g - b) > 90) return false;
  return true;
};

const isDarkSkinShade = (r, g, b, tone) => {
  const shadow = hexToRgb(tone.shadow);
  if (!shadow) return false;
  const diff = Math.abs(r - shadow.r) + Math.abs(g - shadow.g) + Math.abs(b - shadow.b);
  return diff <= 50;
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
        const recoloredR = data[index];
        const recoloredG = data[index + 1];
        const recoloredB = data[index + 2];
        const shouldUseBorder =
          (isSkinBorderCandidate(r, g, b, a) && touchesSkinPixel(originalData, width, height, x, y, 2))
          || (isSkinPixel(r, g, b, a) && isDarkSkinShade(recoloredR, recoloredG, recoloredB, tone));
        if (!shouldUseBorder) continue;
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
    for (let y = y1; y <= y2; y += 1) {
      for (let x = x1; x <= x2; x += 1) {
        const idx = (y * canvasWidth + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];
        if (a < 50) continue;
        const dr = r - 119;
        const dg = g - 54;
        const db = b - 4;
        if (Math.sqrt(dr * dr + dg * dg + db * db) > 55) continue;
        const t = ((x - x1) / spanX + (y - y1) / spanY) / 2;
        const gr = Math.round(rgbA.r + (rgbB.r - rgbA.r) * t);
        const gg = Math.round(rgbA.g + (rgbB.g - rgbA.g) * t);
        const gb = Math.round(rgbA.b + (rgbB.b - rgbA.b) * t);
        const pixelLum = 0.299 * r + 0.587 * g + 0.114 * b;
        const scale = Math.min(1.5, pixelLum / 75);
        data[idx] = Math.min(255, Math.round(gr * scale));
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
