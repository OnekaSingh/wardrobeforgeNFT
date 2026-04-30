/* ============= NFTs catalog page (split detail) ============= */

const NFTsPage = ({ initialId, goto, currentUser, openAuthModal }) => {
  const baseCatalog = window.BROWSABLE_NFT_LIBRARY || NFT_LIBRARY;
  const crates = window.CRATE_LIBRARY || [];
  const accountSnapshot = React.useMemo(
    () => window.WardrobeForgeAuth?.getAccountSnapshot?.(currentUser?.id) || { balance: 300, xp: 0, ownedArtIds: ['base-outfit', 'base-shoes'], itemStars: { 'base-outfit': 1, 'base-shoes': 1 } },
    [currentUser],
  );
  const ownedArtIds = React.useMemo(() => new Set(accountSnapshot.ownedArtIds), [accountSnapshot.ownedArtIds]);
  const catalog = React.useMemo(() => (
    baseCatalog.map((item) => ({
      ...item,
      owned: currentUser ? ownedArtIds.has(item.art) : item.owned,
      starPower: currentUser && ownedArtIds.has(item.art) ? Math.max(1, Math.min(3, Number(accountSnapshot.itemStars?.[item.art]) || 1)) : 0,
    }))
  ), [accountSnapshot.itemStars, baseCatalog, currentUser, ownedArtIds]);
  const [selectedId, setSelectedId] = useState(initialId || catalog[0]?.id);
  const [selectedCrateId, setSelectedCrateId] = useState(crates[0]?.id || null);
  const [filter, setFilter] = useState('All');
  const [rarity, setRarity] = useState('All');
  const [crateModalState, setCrateModalState] = useState({
    open: false,
    status: 'preview',
    crateId: null,
    rolledItemId: null,
    authenticityCode: '',
    message: '',
  });
  const crateSectionRef = React.useRef(null);

  const selected = catalog.find(n => n.id === selectedId) || catalog[0];
  const selectedCrate = crates.find((crate) => crate.id === selectedCrateId) || crates[0];
  const modalCrate = crates.find((crate) => crate.id === crateModalState.crateId) || selectedCrate;
  const modalRolledItem = modalCrate?.contents.find((item) => item.id === crateModalState.rolledItemId) || null;
  const getCrateRaritySummary = (crate) => ([
    { label: 'COMMON', value: crate?.rarityCounts?.Common || 0, className: 'pink' },
    { label: 'RARE', value: crate?.rarityCounts?.Rare || 0, className: 'sky' },
    { label: 'EPIC', value: crate?.rarityCounts?.Epic || 0, className: 'lavender' },
    { label: 'LEGENDARY', value: crate?.rarityCounts?.Legendary || 0, className: 'coral' },
  ].filter((entry) => entry.value > 0));

  const handleEquip = () => {
    if (!currentUser) {
      if (openAuthModal) openAuthModal();
      return;
    }
    if (goto) goto('avatar', null, {
      slot: selected.slot,
      art: selected.art,
      requestId: `${selected.id}-${Date.now()}`,
    });
  };

  const handleRollTarget = React.useCallback(() => {
    const matchingCrate = crates.find((crate) => crate.contents.some((item) => item.art === selected.art));
    if (matchingCrate) {
      setSelectedCrateId(matchingCrate.id);
    }

    window.requestAnimationFrame(() => {
      crateSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [crates, selected.art]);

  const filtered = catalog.filter(n => {
    if (filter !== 'All' && n.slot !== filter.toLowerCase()) return false;
    if (rarity !== 'All' && n.rarity !== rarity) return false;
    return true;
  });

  const getRarityWeight = (rarityName) => ({
    Common: 8,
    Rare: 4,
    Epic: 2,
    Legendary: 1,
  }[rarityName] || 1);

  const getItemXpBonus = (item) => ({
    Common: 20,
    Rare: 45,
    Epic: 80,
    Legendary: 140,
  }[item?.rarity] || 20);
  const selectedItemXp = getItemXpBonus(selected);
  const selectedItemStars = selected?.owned ? Math.max(1, Math.min(3, Number(selected?.starPower) || 1)) : 0;
  const selectedTotalXp = selectedItemXp * (selectedItemStars || 1);
  const attributeLegendSections = React.useMemo(() => {
    const countBy = (getter) => catalog.reduce((counts, item) => {
      const key = getter(item);
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {});

    const fabricCounts = countBy((item) => item.fabric);
    const fitCounts = countBy((item) => item.fit);
    const finishCounts = countBy((item) => item.finish);
    const mintCounts = countBy((item) => item.mint);
    const rarityCounts = countBy((item) => item.rarity);
    const colorCounts = catalog.reduce((counts, item) => {
      const color = item.color || '';
      const bucket = color.startsWith('Solid') ? 'Solid' : color.startsWith('Gradient') ? 'Gradients' : color.startsWith('Pattern') ? 'Pattern' : color.includes('Color-shifting') ? 'Color-shifting' : color;
      counts[bucket] = (counts[bucket] || 0) + 1;
      return counts;
    }, {});

    return [
      { title: 'FABRIC', items: ['Cotton', 'Denim', 'Leather', 'Silk', 'Techwear'].map((label) => ({ label, count: fabricCounts[label] || 0 })) },
      { title: 'FIT', items: ['Oversized', 'Slim', 'Cropped', 'Structured'].map((label) => ({ label, count: fitCounts[label] || 0 })) },
      { title: 'FINISH', items: ['Matte', 'Glossy', 'Distressed', 'Washed', 'Reflective', 'Metallic threading'].map((label) => ({ label, count: finishCounts[label] || 0 })) },
      { title: 'COLOR', items: ['Solid', 'Gradients', 'Color-shifting', 'Pattern'].map((label) => ({ label, count: colorCounts[label] || 0 })) },
      { title: 'MINT TIER', items: [{ label: 'Mint', count: mintCounts.Mint || 0 }, { label: 'Worn', count: mintCounts.Worn || 0 }, { label: 'Vintage', count: mintCounts.Vintage || 0 }, { label: 'Legendary', count: mintCounts.Legendary || 0 }] },
      { title: 'RARITY ROLL', items: [{ label: 'Common', count: rarityCounts.Common || 0 }, { label: 'Rare', count: rarityCounts.Rare || 0 }, { label: 'Epic', count: rarityCounts.Epic || 0 }, { label: 'Legendary', count: rarityCounts.Legendary || 0 }] },
    ];
  }, [catalog]);

  const rollCrateItem = (crate) => {
    const availableItems = crate.contents.filter((item) => !ownedArtIds.has(item.art));
    const source = availableItems.length ? availableItems : crate.contents;
    const weighted = source.flatMap((item) => Array.from({ length: getRarityWeight(item.rarity) }, () => item));
    return weighted[Math.floor(Math.random() * weighted.length)] || source[0] || null;
  };

  const closeCrateModal = () => {
    setCrateModalState({
      open: false,
      status: 'preview',
      crateId: null,
      rolledItemId: null,
      authenticityCode: '',
      message: '',
    });
  };

  const triggerCrateReveal = () => {
    setCrateModalState((current) => ({ ...current, status: 'shaking' }));
    window.setTimeout(() => {
      setCrateModalState((current) => ({ ...current, status: 'revealed' }));
    }, 950);
  };

  const handleOpenCrate = (crate) => {
    if (!currentUser) {
      if (openAuthModal) openAuthModal();
      return;
    }

    if (accountSnapshot.balance < crate.priceVto) {
      setCrateModalState({
        open: true,
        status: 'insufficient',
        crateId: crate.id,
        rolledItemId: null,
        authenticityCode: '',
        message: 'You need 100 VTO to open this crate.',
      });
      return;
    }

    const rolledItem = rollCrateItem(crate);
    if (!rolledItem) return;

    try {
      const grantResult = window.WardrobeForgeAuth?.spendVtoAndGrantItem?.({
        userId: currentUser.id,
        cost: crate.priceVto,
        artId: rolledItem.art,
        xpAmount: getItemXpBonus(rolledItem),
      });
      setCrateModalState({
        open: true,
        status: 'preview',
        crateId: crate.id,
        rolledItemId: rolledItem.id,
        authenticityCode: grantResult?.grantedAuthenticityCode || grantResult?.authenticityCodes?.[rolledItem.art] || '',
        message: '',
      });
    } catch (error) {
      setCrateModalState({
        open: true,
        status: 'insufficient',
        crateId: crate.id,
        rolledItemId: null,
        authenticityCode: '',
        message: error.message || 'You need more VTO.',
      });
    }
  };

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <h1 className="pixel" style={{ fontSize: 26 }}>CLOTHING NFTS</h1>
        <span className="mono" style={{ fontSize: 20, opacity: .6 }}>// the relics you might roll</span>
        {currentUser && (
          <div className="vto-balance-actions">
            <span className="vto-balance-badge">
              <span className="chip">VTO BALANCE</span>
              <img className="vto-token-icon" src="assets/token.png" alt="VTO token" />
              <span className="pixel" style={{ fontSize: 18, color: 'var(--coral)' }}>{accountSnapshot.balance.toLocaleString()}</span>
            </span>
            <button className="pxl-btn ghost vto-balance-topup-btn" onClick={() => goto('topup')}>TOP UP</button>
          </div>
        )}
      </div>

      {selectedCrate && (
        <section ref={crateSectionRef} style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
            <div className="pixel" style={{ fontSize: 14 }}>MYSTERY CRATES</div>
            <span className="mono" style={{ fontSize: 18, opacity: .65 }}>// each one costs 100 VTO and carries a balanced rarity spread</span>
          </div>

          <div className="grid cols-4 crate-grid">
            {crates.map((crate) => (
              <button
                key={crate.id}
                className={`pxl-box crate-card crate-${crate.tone} ${selectedCrate.id === crate.id ? 'active' : ''}`}
                onClick={() => setSelectedCrateId(crate.id)}
              >
                <div className="crate-image-wrap">
                  <img className="crate-image" src="assets/crates/pixel-crate.png" alt={crate.name} />
                </div>
                <div className="pixel" style={{ fontSize: 11, marginBottom: 6 }}>{crate.name}</div>
                <div className="mono" style={{ fontSize: 18, opacity: .72, marginBottom: 10 }}>{crate.priceVto} VTO</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {getCrateRaritySummary(crate).map((entry) => (
                    <span key={`${crate.id}-${entry.label}`} className={`chip ${entry.className}`}>{entry.value} {entry.label}</span>
                  ))}
                </div>
              </button>
            ))}
          </div>

          <div className="pxl-box no-drop crate-detail-shell" style={{ background: '#fff', marginTop: 26 }}>
            <div className="split crate-detail-split">
              <div className={`crate-detail-hero crate-${selectedCrate.tone}`}>
                <div className="crate-detail-image-stack">
                  <img className="crate-image crate-image-large float" src="assets/crates/pixel-crate.png" alt={selectedCrate.name} />
                </div>
                <div className="crate-detail-open-wrap">
                  <button className="pxl-btn crate-open-btn crate-open-btn-hero" onClick={() => handleOpenCrate(selectedCrate)}>OPEN FOR 100 VTO</button>
                </div>
                <div style={{ position: 'absolute', top: 16, left: 16 }}>
                  <span className="chip coral">{selectedCrate.priceVto} VTO</span>
                </div>
                <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, display: 'flex', justifyContent: 'space-between' }} className="pixel">
                  <span style={{ fontSize: 11 }}>{selectedCrate.id.toUpperCase()}</span>
                  <span style={{ fontSize: 11, color: 'var(--coral)' }}>{selectedCrate.contents.length} PIECES</span>
                </div>
              </div>

              <div style={{ padding: 28 }}>
                <div className="pixel" style={{ fontSize: 11, color: 'var(--coral)', marginBottom: 6 }}>CRATE DROP TABLE</div>
                <h2 className="pixel" style={{ fontSize: 20, marginBottom: 6 }}>{selectedCrate.name}</h2>
                <div className="mono" style={{ fontSize: 18, opacity: .72, marginBottom: 16 }}>{selectedCrate.lore}</div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
                  {getCrateRaritySummary(selectedCrate).map((entry) => (
                    <span key={`${selectedCrate.id}-summary-${entry.label}`} className={`chip ${entry.className}`}>{entry.label} × {entry.value}</span>
                  ))}
                </div>

                <div className="crate-legend">
                  {selectedCrate.contents.map((item) => (
                    <div key={`${selectedCrate.id}-${item.id}`} className={`crate-legend-row ${ownedArtIds.has(item.art) ? 'owned' : 'locked'}`}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <div className="crate-legend-thumb">
                          <div className="crate-legend-art">
                            <NFTArt nft={item} scale={3} />
                          </div>
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div className="pixel" style={{ fontSize: 9, marginBottom: 4 }}>{ownedArtIds.has(item.art) ? item.name : '???'}</div>
                          <div className="mono" style={{ fontSize: 15, opacity: .72 }}>{item.slot.toUpperCase()}</div>
                        </div>
                      </div>
                      <span className={`chip ${RARITY_COLOR[item.rarity]}`}>{item.rarity.toUpperCase()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Filter bar */}
      <div className="pxl-box" style={{ background: '#fff', padding: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center' }}>
          <FilterGroup label="SLOT" value={filter} onChange={setFilter} options={['All', 'Head', 'Outfit', 'Item', 'Boots']} />
          <FilterGroup label="RARITY" value={rarity} onChange={setRarity} options={['All', 'Common', 'Rare', 'Epic', 'Legendary']} />
          <span style={{ marginLeft: 'auto' }} className="mono">{filtered.length} relics</span>
        </div>
      </div>

      {/* SPLIT VIEW */}
      <div className="pxl-box no-drop" style={{ background: '#fff' }}>
        <div className="split">
          <div className="dither-bg scanlines" style={{ padding: 36, position: 'relative', minHeight: 540, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '4px solid var(--ink)' }}>
            <div style={{ position: 'relative' }}>
              <PixelStar size={3} color="#FFE9A8" style={{ left: -30, top: -10 }} />
              <PixelStar size={2} color="#F85646" style={{ right: -20, top: 30 }} />
              <SparkleDot color="#FFFFFF" size={3} style={{ left: -10, bottom: 40 }} />

              <div className="float">
                <div style={{ width: 320, height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <NFTArt nft={selected} scale={12} />
                </div>
              </div>
            </div>

            <div style={{ position: 'absolute', top: 16, left: 16 }}>
              <span className={`chip ${RARITY_COLOR[selected.rarity]}`} style={{ fontSize: 10 }}>{selected.rarity.toUpperCase()}</span>
              <span className="chip" style={{ marginLeft: 6, fontSize: 10 }}>{selected.slot.toUpperCase()}</span>
            </div>
            <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, display: 'flex', justifyContent: 'space-between' }} className="pixel">
              <span style={{ fontSize: 11 }}>{selected.id}</span>
              <span style={{ fontSize: 11, color: 'var(--coral)' }}>{selected.serial}</span>
            </div>
          </div>

          <div style={{ padding: 32 }}>
            <div className="pixel" style={{ fontSize: 11, color: 'var(--coral)', marginBottom: 6 }}>{selected.slot.toUpperCase()} · {selected.rarity.toUpperCase()}</div>
            <h2 className="pixel" style={{ fontSize: 20, marginBottom: 6 }}>{selected.name}</h2>
            <div className="mono" style={{ fontSize: 18, opacity: .7, marginBottom: 16 }}>{selected.serial}</div>

            <p className="mono" style={{ fontSize: 19, marginBottom: 22, padding: '12px 14px', background: 'var(--paper-2)', borderLeft: '4px solid var(--coral)' }}>
              "{selected.lore}"
            </p>

            <div style={{ marginBottom: 20 }}>
              <div className="pixel" style={{ fontSize: 11, marginBottom: 8, color: 'var(--ink)' }}>STATS</div>
              <div className="stat-row"><span className="stat-key">FABRIC</span><span className="stat-val">{selected.fabric}</span></div>
              <div className="stat-row"><span className="stat-key">FIT</span><span className="stat-val">{selected.fit}</span></div>
              <div className="stat-row"><span className="stat-key">FINISH</span><span className="stat-val">{selected.finish}</span></div>
              <div className="stat-row"><span className="stat-key">COLOR</span><span className="stat-val">{selected.color}</span></div>
              <div className="stat-row"><span className="stat-key">MINT</span><span className="stat-val" style={{ color: 'var(--coral)', fontFamily: 'PressStart, monospace', fontSize: 12 }}>{selected.mint.toUpperCase()}</span></div>
            </div>

            <div className="pxl-box no-drop" style={{ background: 'var(--ink)', color: '#fff', padding: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: selected.owned ? '1fr 1fr' : '1fr', gap: 14, alignItems: 'stretch' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div className="pixel" style={{ fontSize: 10, color: 'var(--pink-neon)' }}>VTO BONUS</div>
                    <div className="pixel" style={{ fontSize: 18, color: 'var(--coral-soft)' }}>+{selectedTotalXp} XP</div>
                  </div>
                  <div className="bar"><i style={{ width: `${Math.min(100, (selectedTotalXp / 420) * 100)}%` }} /></div>
                </div>
                {selected.owned && (
                  <div style={{ borderLeft: '2px solid rgba(255,255,255,.12)', paddingLeft: 14 }}>
                    <div className="pixel" style={{ fontSize: 10, color: 'var(--pink-neon)', marginBottom: 8 }}>STAR POWER</div>
                    <div className="star-power-icons" aria-label={`${selectedItemStars} star power`}>
                      {Array.from({ length: selectedItemStars }, (_, index) => (
                        <img key={`${selected.art}-star-${index}`} className="star-power-icon" src="assets/star.png" alt="" />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: selected.owned ? '1fr 1fr' : '1fr', gap: 14, marginTop: 18 }}>
              {selected.owned ? (
                <>
                  <button className="pxl-btn" style={{ width: '100%' }} onClick={handleEquip}>EQUIP ON AVATAR</button>
                  <button className="pxl-btn ghost" style={{ width: '100%' }} onClick={handleRollTarget}>ROLL</button>
                </>
              ) : (
                <button className="pxl-btn" style={{ width: '100%' }} onClick={handleRollTarget}>ROLL</button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 36 }}>
        <div className="pixel" style={{ fontSize: 14, marginBottom: 14 }}>BROWSE THE FORGE</div>
        <div className="grid cols-4">
          {filtered.map(n => (
            <div
              key={n.id}
              onClick={() => setSelectedId(n.id)}
              style={{
                position: 'relative',
                outline: n.id === selectedId ? '4px solid var(--coral)' : 'none',
                outlineOffset: 4,
              }}
            >
              <NFTCard nft={n} owned={n.owned} onClick={() => setSelectedId(n.id)} />
            </div>
          ))}
        </div>
      </div>

      <div className="pxl-box" style={{ background: '#fff', padding: 24, marginTop: 36 }}>
        <div className="pixel" style={{ fontSize: 14, marginBottom: 16 }}>ATTRIBUTE LEGEND</div>
        <div className="grid cols-3" style={{ gap: 18 }}>
          {attributeLegendSections.map((section) => (
            <Legend key={section.title} title={section.title} items={section.items} />
          ))}
        </div>
      </div>

      {crateModalState.open && modalCrate && (
        <div className="crate-open-backdrop" onClick={closeCrateModal}>
          <div className={`crate-open-shell crate-open-${crateModalState.status}`} onClick={(event) => event.stopPropagation()}>
            {crateModalState.status === 'insufficient' ? (
              <div className="pxl-box dark crate-open-panel">
                <div className="chip coral" style={{ marginBottom: 18 }}>INSUFFICIENT FUNDS</div>
                <div className="pixel" style={{ fontSize: 20, marginBottom: 12 }}>NOT ENOUGH VTO</div>
                <p className="mono" style={{ fontSize: 22, lineHeight: 1.45, marginBottom: 18 }}>{crateModalState.message}</p>
                <button className="pxl-btn" onClick={closeCrateModal}>OK</button>
              </div>
            ) : (
              <div className={`pxl-box no-drop crate-open-panel crate-open-panel-${modalCrate.tone} ${crateModalState.status === 'revealed' ? 'crate-open-panel-revealed' : ''}`}>
                <div className="crate-open-meta">
                  <span className="chip coral">{modalCrate.priceVto} VTO</span>
                  <button className="auth-modal-close crate-modal-close" onClick={closeCrateModal} aria-label="Close crate opening">X</button>
                </div>

                {crateModalState.status !== 'revealed' && (
                  <div className={`crate-open-stage ${crateModalState.status === 'shaking' ? 'shake' : 'float'}`} onClick={crateModalState.status === 'preview' ? triggerCrateReveal : undefined}>
                    <img className={`crate-open-image crate-image crate-${modalCrate.tone}`} src="assets/crates/pixel-crate.png" alt={modalCrate.name} />
                  </div>
                )}

                {crateModalState.status === 'preview' && (
                  <>
                    <div className="pixel crate-open-title">{modalCrate.id.toUpperCase()}</div>
                    <div className="mono crate-open-subtitle">Click the crate to crack it open.</div>
                  </>
                )}

                {crateModalState.status === 'shaking' && (
                  <>
                    <div className="pixel crate-open-title">OPENING...</div>
                    <div className="mono crate-open-subtitle">The forge is picking your drop.</div>
                  </>
                )}

                {crateModalState.status === 'revealed' && modalRolledItem && (
                  <div className="crate-reveal-card">
                    <div className="chip coral" style={{ marginBottom: 14 }}>YOU ROLLED</div>
                    <div className="crate-reveal-art">
                      <NFTArt nft={modalRolledItem} scale={7} />
                    </div>
                    <div className="pixel" style={{ fontSize: 16, marginBottom: 8 }}>{modalRolledItem.name}</div>
                    <div className="mono" style={{ fontSize: 20, marginBottom: 10 }}>{modalRolledItem.slot.toUpperCase()}</div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
                      <span className={`chip ${RARITY_COLOR[modalRolledItem.rarity]}`}>{modalRolledItem.rarity.toUpperCase()}</span>
                      <span className="chip">{modalRolledItem.serial}</span>
                    </div>
                    {crateModalState.authenticityCode && (
                      <div className="crate-auth-code">
                        <div className="pixel crate-auth-code-label">AUTHENTICITY ID</div>
                        <div className="mono crate-auth-code-value">{crateModalState.authenticityCode}</div>
                      </div>
                    )}
                    <button className="pxl-btn" onClick={closeCrateModal}>CLAIM</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const FilterGroup = ({ label, value, onChange, options }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <span className="pixel" style={{ fontSize: 10, opacity: .6 }}>{label}</span>
    <div className="opts">
      {options.map(o => (
        <button key={o} className={`opt ${value === o ? 'active' : ''}`} onClick={() => onChange(o)}>{o}</button>
      ))}
    </div>
  </div>
);

const Legend = ({ title, items }) => (
  <div>
    <div className="pixel" style={{ fontSize: 10, color: 'var(--coral)', marginBottom: 8 }}>{title}</div>
    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
      {items.map((item) => (
        <li key={item.label} style={{ fontSize: 18, display: 'flex', gap: 6 }}>
          <span style={{ color: 'var(--coral)' }}>{item.count}</span> {item.label}
        </li>
      ))}
    </ul>
  </div>
);

window.NFTsPage = NFTsPage;
