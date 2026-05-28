/* ============= NFTs catalog page (split detail) ============= */

const NFTsPage = ({ initialId, goto, currentUser, openAuthModal }) => {
  const baseCatalog = window.BROWSABLE_NFT_LIBRARY || NFT_LIBRARY;
  const crates = window.CRATE_LIBRARY || [];
  const maxCrateQuantity = Math.max(1, Math.floor(500 / Math.max(0.01, Number(window.CRATE_PRICE_USD || 2.99))));
  const formatUsd = (amount) => `$${amount.toFixed(2)}`;
  const accountSnapshot = React.useMemo(
    () => window.WardrobeForgeAuth?.getAccountSnapshot?.(currentUser?.id) || { xp: 0, ownedArtIds: ['base-outfit', 'base-shoes'], itemStars: { 'base-outfit': 1, 'base-shoes': 1 } },
    [currentUser],
  );
  const ownedArtIds = React.useMemo(() => new Set(accountSnapshot.ownedArtIds || []), [accountSnapshot.ownedArtIds]);
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
    crateId: null,
    quantity: 1,
    totalUsd: 0,
    mode: 'checkout',
    rewards: [],
    message: '',
  });
  const crateSectionRef = React.useRef(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [mintedWalletAddress, setMintedWalletAddress] = useState('');

  const selected = catalog.find(n => n.id === selectedId) || catalog[0];
  const selectedCrate = crates.find((crate) => crate.id === selectedCrateId) || crates[0];
  const modalCrate = crates.find((crate) => crate.id === crateModalState.crateId) || selectedCrate;
  const selectedCrateUnitPrice = Number(selectedCrate?.priceUsd || 0);
  const modalCrateUnitPrice = Number(modalCrate?.priceUsd || 0);
  const modalCrateTotal = Number((modalCrateUnitPrice * crateModalState.quantity).toFixed(2));
  const walletAddress = mintedWalletAddress || accountSnapshot.walletAddress || currentUser?.walletAddress || '';
  const revealedReward = crateModalState.rewards?.[0] || null;
  const formatWalletAddress = (value) => (
    value && value.length > 14 ? `${value.slice(0, 8)}...${value.slice(-6)}` : value
  );
  const confettiPieces = React.useMemo(() => (
    Array.from({ length: 16 }, (_, index) => ({
      id: index,
      left: `${6 + ((index * 91) % 88)}%`,
      size: 8 + (index % 4) * 4,
      delay: `${(index % 6) * 0.14}s`,
      duration: `${2.3 + (index % 5) * 0.28}s`,
      background: ['var(--coral)', 'var(--pink-neon)', 'var(--mint)', '#fff7d8'][index % 4],
    }))
  ), []);
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

  const closeCrateModal = () => {
    setMintedWalletAddress('');
    setCrateModalState({
      open: false,
      crateId: null,
      quantity: 1,
      totalUsd: 0,
      mode: 'checkout',
      rewards: [],
      message: '',
    });
  };

  const handleOpenCrate = (crate) => {
    if (!currentUser) {
      if (openAuthModal) openAuthModal();
      return;
    }

    setCrateModalState({
      open: true,
      crateId: crate.id,
      quantity: 1,
      totalUsd: Number((crate.priceUsd || 0).toFixed(2)),
      mode: 'checkout',
      rewards: [],
      message: '',
    });
  };

  const handleModalQuantityChange = (nextQuantity) => {
    setCrateModalState((current) => {
      const quantity = Math.max(1, Math.min(maxCrateQuantity, Number(nextQuantity)));
      const unitPrice = Number((modalCrate?.priceUsd || selectedCrate?.priceUsd || 0));
      return {
        ...current,
        quantity,
        totalUsd: Number((unitPrice * quantity).toFixed(2)),
      };
    });
  };

  const syncMintedRewardsToAccount = async (rewards) => {
    const syncedRewards = [];

    for (const reward of rewards) {
      const claimResult = await window.WardrobeForgeAuth?.spendVtoAndGrantItem?.({
        userId: currentUser.id,
        cost: 0,
        artId: reward.art,
        xpAmount: Number(reward.pointsBonus) || 0,
      });

      syncedRewards.push({
        ...reward,
        authenticityCode: claimResult?.grantedAuthenticityCode || '',
      });
    }

    return syncedRewards;
  };

  const handleOnchainCheckout = () => {
    setCheckoutBusy(true);
    setCrateModalState((current) => ({
      ...current,
      mode: 'opening',
      rewards: [],
      message: `Preparing ${current.quantity} ${current.quantity === 1 ? 'crate' : 'crates'} for sponsored Polygon mint...`,
    }));

    Promise.resolve()
      .then(async () => {
        let nextWalletAddress = walletAddress;

        if (!nextWalletAddress) {
          nextWalletAddress = await window.WardrobeForgeWallet?.ensureEmbeddedWallet?.({ user: currentUser });
          if (!nextWalletAddress) {
            throw new Error('Could not generate a wallet address for this mint.');
          }
          window.WardrobeForgeAuth?.saveWalletAddress?.(currentUser.id, nextWalletAddress);
        }

        setCrateModalState((current) => ({
          ...current,
          message: `Submitting a sponsored Polygon mint to ${formatWalletAddress(nextWalletAddress)}...`,
        }));

        const checkoutResponse = await fetch('/api/contract/execute-crate-purchase', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            crateKey: modalCrate.id,
            quantity: crateModalState.quantity,
            recipientWallet: nextWalletAddress,
          }),
        });
        const checkoutPayload = await checkoutResponse.json().catch(() => null);
        if (!checkoutResponse.ok) {
          throw new Error(checkoutPayload?.message || 'Could not complete the sponsored mint right now.');
        }

        const txHash = checkoutPayload.txHash;
        const resolvedRewards = (checkoutPayload.mintedRewards || []).map((entry) => {
          const reward = window.WardrobeForgeTokenCatalog?.getItemByTokenId?.(entry.tokenId);
          if (!reward?.art) {
            throw new Error(`Minted token ${entry.tokenId} is not mapped in the NFT catalog.`);
          }

          return {
            ...reward,
            tokenId: entry.tokenId,
            rollNumber: entry.rollNumber,
            inventorySrc: reward.inventorySrc || reward.avatarSrc || '',
          };
        });

        const syncedRewards = await syncMintedRewardsToAccount(resolvedRewards);

        setMintedWalletAddress(nextWalletAddress);
        setCrateModalState((current) => ({
          ...current,
          mode: 'revealed',
          rewards: syncedRewards,
          message: `${current.quantity} ${current.quantity === 1 ? 'crate has' : 'crates have'} been minted on Polygon to ${formatWalletAddress(nextWalletAddress)}.`,
        }));

        goto('checkout', null, null, {
          checkoutSession: {
            crateId: modalCrate.id,
            crateName: modalCrate.name,
            quantity: crateModalState.quantity,
            totalUsd: modalCrateTotal,
            totalLabel: formatUsd(modalCrateTotal),
            paymentMethod: 'Sponsored Polygon Mint',
            rewards: syncedRewards,
            walletAddress: nextWalletAddress,
            txHash,
          },
        });
      })
      .catch((error) => {
        setCrateModalState((current) => ({
          ...current,
          mode: 'checkout',
          rewards: [],
          message: error.message || 'Could not mint this crate on-chain right now.',
        }));
      })
      .finally(() => {
        setCheckoutBusy(false);
      });
  };

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <h1 className="pixel" style={{ fontSize: 26 }}>CLOTHING NFTS</h1>
        <span className="mono" style={{ fontSize: 20, opacity: .6 }}>// the relics you might roll</span>
      </div>

      {selectedCrate && (
        <section ref={crateSectionRef} style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
            <div className="pixel" style={{ fontSize: 14 }}>MYSTERY CRATES</div>
            <span className="mono" style={{ fontSize: 18, opacity: .65 }}>// mint on Polygon for {formatUsd(selectedCrateUnitPrice)} per crate</span>
          </div>

          <div className="grid cols-4 crate-grid">
            {crates.map((crate) => (
              <button
                key={crate.id}
                className={`pxl-box crate-card crate-${crate.tone} ${selectedCrate.id === crate.id ? 'active' : ''}`}
                onClick={() => setSelectedCrateId(crate.id)}
              >
                <div className="crate-image-wrap">
                  <img className="crate-image" src="assets/crates/pixel-crate.webp" alt={crate.name} loading="lazy" decoding="async" />
                </div>
                <div className="pixel" style={{ fontSize: 11, marginBottom: 6 }}>{crate.name}</div>
                <div className="mono" style={{ fontSize: 18, opacity: .72, marginBottom: 10 }}>{formatUsd(crate.priceUsd || 0)} ON POLYGON</div>
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
                  <img className="crate-image crate-image-large float" src="assets/crates/pixel-crate.webp" alt={selectedCrate.name} decoding="async" />
                </div>
                <div className="crate-detail-open-wrap">
                  <button className="pxl-btn crate-open-btn crate-open-btn-hero" onClick={() => handleOpenCrate(selectedCrate)}>BUY CRATES</button>
                </div>
                <div style={{ position: 'absolute', top: 16, left: 16 }}>
                  <span className="chip coral">{formatUsd(selectedCrateUnitPrice)} ON POLYGON</span>
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
                    <div className="pixel" style={{ fontSize: 10, color: 'var(--pink-neon)' }}>WARDROBE XP</div>
                    <div className="pixel" style={{ fontSize: 18, color: 'var(--coral-soft)' }}>+{selectedTotalXp} XP</div>
                  </div>
                  <div className="bar"><i style={{ width: `${Math.min(100, (selectedTotalXp / 420) * 100)}%` }} /></div>
                </div>
                {selected.owned && (
                  <div style={{ borderLeft: '2px solid rgba(255,255,255,.12)', paddingLeft: 14 }}>
                    <div className="pixel" style={{ fontSize: 10, color: 'var(--pink-neon)', marginBottom: 8 }}>STAR POWER</div>
                    <div className="star-power-icons" aria-label={`${selectedItemStars} star power`}>
                      {Array.from({ length: selectedItemStars }, (_, index) => (
                        <img key={`${selected.art}-star-${index}`} className="star-power-icon" src="assets/star.webp" alt="" loading="lazy" decoding="async" />
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
          <div className="crate-open-shell" onClick={(event) => event.stopPropagation()}>
            <div className={`pxl-box no-drop crate-open-panel crate-open-panel-${modalCrate.tone} ${crateModalState.mode === 'revealed' ? 'crate-open-panel-revealed topup-reward-card' : ''}`}>
              {crateModalState.mode === 'revealed' ? (
                <div className="topup-reward-confetti" aria-hidden="true">
                  {confettiPieces.map((piece) => (
                    <span
                      key={`crate-confetti-${piece.id}`}
                      className="topup-reward-confetti-piece"
                      style={{
                        left: piece.left,
                        width: piece.size,
                        height: piece.size,
                        background: piece.background,
                        animationDelay: piece.delay,
                        animationDuration: piece.duration,
                      }}
                    />
                  ))}
                </div>
              ) : null}
              <div className="crate-open-meta">
                <span className="chip coral">{crateModalState.quantity} × {formatUsd(modalCrateUnitPrice)}</span>
                <button className="auth-modal-close crate-modal-close" onClick={closeCrateModal} aria-label="Close crate checkout">X</button>
              </div>
              {crateModalState.mode === 'revealed' && revealedReward ? (
                <>
                  <div className="crate-open-stage">
                    <div className="crate-reveal-art">
                      <NFTArt nft={revealedReward} scale={7} />
                    </div>
                  </div>
                  <div className="pixel crate-open-title">CRATE OPENED</div>
                  {crateModalState.message ? <div className="mono crate-open-subtitle">{crateModalState.message}</div> : null}
                  <div className="crate-reveal-card">
                    <div className={`chip ${RARITY_COLOR[revealedReward.rarity] || 'coral'}`} style={{ marginBottom: 14 }}>{revealedReward.rarity.toUpperCase()}</div>
                    <div className="pixel" style={{ fontSize: 20, marginBottom: 8 }}>{revealedReward.name}</div>
                    <div className="mono" style={{ fontSize: 18, marginBottom: 18 }}>{revealedReward.slot.toUpperCase()} · {crateModalState.quantity > 1 ? `${crateModalState.quantity} CRATES OPENED` : 'MINTED RELIC'}</div>
                    <div className="pxl-box no-drop mint-detail-box" style={{ background: 'rgba(255,255,255,.48)', padding: 16, marginBottom: 18, textAlign: 'left' }}>
                      <div style={{ display: 'grid', gap: 12 }}>
                        <div className="stat-row"><span className="stat-key">WALLET</span><span className="stat-val">{walletAddress || 'NOT SET'}</span></div>
                        <div className="stat-row"><span className="stat-key">AUTH CODE</span><span className="stat-val">{revealedReward.authenticityCode || 'PENDING'}</span></div>
                        <div className="stat-row"><span className="stat-key">STATUS</span><span className="stat-val">MINT COMPLETE</span></div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                      <button className="pxl-btn" onClick={() => goto('avatar')}>VIEW MY AVATAR</button>
                      <button className="pxl-btn ghost" onClick={closeCrateModal}>OPEN ANOTHER</button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className={`crate-open-stage float ${crateModalState.mode === 'opening' ? 'shake' : ''}`}>
                    <img className={`crate-open-image crate-image crate-${modalCrate.tone}`} src="assets/crates/pixel-crate.webp" alt={modalCrate.name} decoding="async" />
                  </div>
                  <div className="pixel crate-open-title">{crateModalState.mode === 'opening' ? 'OPENING CRATE' : 'CHECKOUT PREVIEW'}</div>
                  {crateModalState.message ? <div className="mono crate-open-subtitle">{crateModalState.message}</div> : null}
                  <div className="crate-reveal-card">
                    <div className="chip coral" style={{ marginBottom: 14 }}>{crateModalState.mode === 'opening' ? 'MINTING NOW' : 'ON-CHAIN ORDER'}</div>
                    <div className="pixel" style={{ fontSize: 16, marginBottom: 8 }}>{modalCrate.name}</div>
                    <div className="mono" style={{ fontSize: 20, marginBottom: 10 }}>{crateModalState.quantity} {crateModalState.quantity === 1 ? 'crate' : 'crates'}</div>
                    <div className="pxl-box no-drop mint-detail-box" style={{ background: 'var(--paper-2)', padding: 16, marginBottom: 18, textAlign: 'left' }}>
                      <div style={{ display: 'grid', gap: 12, marginBottom: 12 }}>
                        <div className="stat-row"><span className="stat-key">CRATE QUANTITY</span><span className="stat-val">{crateModalState.quantity}</span></div>
                        <div className="stat-row"><span className="stat-key">TOTAL</span><span className="stat-val">{formatUsd(modalCrateTotal)}</span></div>
                        <div className="stat-row"><span className="stat-key">NETWORK</span><span className="stat-val">POLYGON</span></div>
                      </div>
                      <input
                        className="topup-slider"
                        type="range"
                        min="1"
                        max={String(maxCrateQuantity)}
                        step="1"
                        value={crateModalState.quantity}
                        onChange={(event) => handleModalQuantityChange(event.target.value)}
                        aria-label="Select crate quantity"
                        disabled={checkoutBusy}
                      />
                      <div className="topup-slider-scale">
                        <span>1</span>
                        <span>{Math.ceil(maxCrateQuantity / 2).toLocaleString()}</span>
                        <span>{maxCrateQuantity.toLocaleString()}</span>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                      <button className="pxl-btn" onClick={handleOnchainCheckout} disabled={checkoutBusy}>
                        {checkoutBusy ? 'CONNECTING...' : `MINT ON POLYGON FOR ${formatUsd(modalCrateTotal)}`}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
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
