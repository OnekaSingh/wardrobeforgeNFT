/* ============= Top Up page ============= */

const TOP_UP_PACKAGES = [
  { id: 'topup-100', price: 1.99, tokens: 100, tier: 1, badge: 'START', imageSrc: 'assets/top up/1.webp' },
  { id: 'topup-400', price: 5.99, tokens: 400, tier: 2, badge: 'BOOST', imageSrc: 'assets/top up/2.webp' },
  { id: 'topup-1700', price: 25.99, tokens: 1700, tier: 3, badge: 'STACK', imageSrc: 'assets/top up/3.webp' },
  { id: 'topup-3600', price: 50.99, tokens: 3600, tier: 4, badge: 'DROP', imageSrc: 'assets/top up/4.webp' },
  { id: 'topup-15500', price: 200.99, tokens: 15500, tier: 5, badge: 'VAULT', imageSrc: 'assets/top up/5.webp' },
  { id: 'topup-custom', price: null, tokens: null, tier: 6, badge: 'CUSTOM', custom: true, imageSrc: 'assets/top up/6.webp' },
];

const TOP_UP_CUSTOM_RATE = 1.99 / 100;
const TOP_UP_PENDING_REWARD_STORAGE_KEY = 'wardrobeforge-pending-square-reward-v1';
const TOP_UP_REWARD_CONFETTI = [
  { left: '6%', delay: '0s', duration: '2.6s', color: 'var(--coral)', size: 14 },
  { left: '14%', delay: '.35s', duration: '3.1s', color: 'var(--sky)', size: 10 },
  { left: '22%', delay: '.15s', duration: '2.9s', color: 'var(--lemon)', size: 12 },
  { left: '31%', delay: '.55s', duration: '3.25s', color: 'var(--lavender)', size: 14 },
  { left: '43%', delay: '.1s', duration: '2.7s', color: 'var(--mint)', size: 10 },
  { left: '54%', delay: '.45s', duration: '3.2s', color: 'var(--pink-neon)', size: 12 },
  { left: '66%', delay: '.2s', duration: '2.8s', color: 'var(--coral-soft)', size: 14 },
  { left: '78%', delay: '.6s', duration: '3.15s', color: 'var(--sky)', size: 10 },
  { left: '88%', delay: '.05s', duration: '2.95s', color: 'var(--lemon)', size: 12 },
  { left: '94%', delay: '.5s', duration: '3.3s', color: 'var(--lavender)', size: 10 },
];

const formatUsd = (amount) => `$${amount.toFixed(2)}`;

const getPendingRewardStorageKey = (userId) => `${TOP_UP_PENDING_REWARD_STORAGE_KEY}:${userId || 'guest'}`;

const readPendingReward = (userId) => {
  try {
    const raw = window.localStorage.getItem(getPendingRewardStorageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (error) {
    return null;
  }
};

const writePendingReward = (userId, reward) => {
  const storageKey = getPendingRewardStorageKey(userId);
  if (!reward) {
    window.localStorage.removeItem(storageKey);
    return;
  }
  window.localStorage.setItem(storageKey, JSON.stringify(reward));
};

const rollBonusItemArt = (ownedArtIds) => {
  const itemPool = (window.BROWSABLE_NFT_LIBRARY || window.NFT_LIBRARY || []).filter((item) => item.slot === 'item');
  if (!itemPool.length) return null;

  const unownedPool = itemPool.filter((item) => !ownedArtIds.has(item.art));
  const sourcePool = unownedPool.length ? unownedPool : itemPool;
  const randomIndex = Math.floor(Math.random() * sourcePool.length);
  return sourcePool[randomIndex]?.art || null;
};

const TopUpCard = ({ pack, onClaim, busy, onOpenCustom }) => (
  <div className={`pxl-box topup-card ${pack.custom ? 'topup-card-custom' : ''}`}>
    <div className="topup-card-badge">{pack.badge}</div>
    <div className="topup-card-stage">
      <img className="topup-card-image" src={pack.imageSrc} alt={pack.custom ? 'Custom top up pack' : `${pack.tokens.toLocaleString()} token pack`} loading="lazy" decoding="async" />
    </div>
    <div className="topup-card-lower">
      <div className="pixel topup-card-amount">{pack.custom ? 'CUSTOM' : `${pack.tokens.toLocaleString()} TOKENS`}</div>
      <div className="mono topup-card-price">{pack.custom ? 'SLIDER' : formatUsd(pack.price)}</div>
      <button className="pxl-btn topup-card-cta" onClick={pack.custom ? onOpenCustom : () => onClaim(pack.tokens)}>
        {pack.custom ? 'OPEN' : busy ? 'CONNECTING...' : 'TOP UP'}
      </button>
    </div>
  </div>
);

const TopUpPage = ({ currentUser, goto, openAuthModal }) => {
  const accountSnapshot = React.useMemo(
    () => window.WardrobeForgeAuth?.getAccountSnapshot?.(currentUser?.id) || { balance: 300 },
    [currentUser],
  );
  const [customTokens, setCustomTokens] = React.useState(2500);
  const [status, setStatus] = React.useState('');
  const [busyPackId, setBusyPackId] = React.useState('');
  const [isCustomOpen, setIsCustomOpen] = React.useState(false);
  const [pendingReward, setPendingReward] = React.useState(() => readPendingReward(currentUser?.id || null));
  const ownedArtIds = React.useMemo(() => new Set(accountSnapshot.ownedArtIds || []), [accountSnapshot.ownedArtIds]);
  const customPrice = Number((customTokens * TOP_UP_CUSTOM_RATE).toFixed(2));
  const pendingRewardItem = React.useMemo(
    () => (pendingReward?.bonusArt ? (window.NFT_LIBRARY || []).find((item) => item.art === pendingReward.bonusArt) || null : null),
    [pendingReward],
  );

  React.useEffect(() => {
    setPendingReward(readPendingReward(currentUser?.id || null));
  }, [currentUser?.id]);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const squareStatus = params.get('square_status');
    const tokens = Number(params.get('tokens'));
    const claimId = String(params.get('claim') || '').trim();

    if (squareStatus === 'success' && currentUser?.id && Number.isFinite(tokens) && tokens > 0 && claimId) {
      const existingPendingReward = readPendingReward(currentUser.id);
      const nextPendingReward = existingPendingReward?.claimId === claimId
        ? existingPendingReward
        : {
            claimId,
            tokens,
            bonusArt: rollBonusItemArt(ownedArtIds),
            createdAt: new Date().toISOString(),
          };

      writePendingReward(currentUser.id, nextPendingReward);
      setPendingReward(nextPendingReward);
      const tokenLabel = `${tokens.toLocaleString()} VTO`;
      const itemName = nextPendingReward?.bonusArt
        ? ((window.NFT_LIBRARY || []).find((item) => item.art === nextPendingReward.bonusArt)?.name || 'Mystery item')
        : 'Mystery item';
      setStatus(`Square payment returned successfully. Claim ${tokenLabel} and your free ${itemName}.`);

      params.delete('square_status');
      params.delete('pack');
      params.delete('tokens');
      params.delete('claim');
      const nextSearch = params.toString();
      const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash || '#topup'}`;
      window.history.replaceState({}, document.title, nextUrl);
    }
  }, [currentUser?.id, ownedArtIds]);

  const handleClaimReward = () => {
    if (!currentUser?.id || !pendingReward) return;

    try {
      const claimResult = window.WardrobeForgeAuth?.redeemSquareTopUpReward?.({
        userId: currentUser.id,
        claimId: pendingReward.claimId,
        tokens: pendingReward.tokens,
        bonusArt: pendingReward.bonusArt,
      });

      if (claimResult?.alreadyClaimed) {
        setStatus('That Square top-up reward was already claimed on this account.');
      } else {
        const itemName = pendingRewardItem?.name || 'Mystery item';
        setStatus(`Thank you! You claimed ${pendingReward.tokens.toLocaleString()} VTO and ${itemName}.`);
      }

      writePendingReward(currentUser.id, null);
      setPendingReward(null);
    } catch (error) {
      setStatus(error.message || 'Could not claim your Square reward right now.');
    }
  };

  const handleTopUp = async ({ packId, amount, custom = false }) => {
    if (!currentUser) {
      setStatus('Sign in to add tokens to your backend-linked WardrobeForge profile on this device.');
      if (openAuthModal) openAuthModal();
      return;
    }

    setBusyPackId(packId);
    setStatus('');

    try {
      const checkoutResponse = await fetch('/api/square/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packId,
          customTokens: custom ? amount : null,
          userId: currentUser.id,
          displayName: currentUser.displayName,
          buyerEmail: currentUser.email,
        }),
      });

      const checkoutPayload = await checkoutResponse.json().catch(() => null);
      if (!checkoutResponse.ok) {
        throw new Error(checkoutPayload?.message || 'Could not start Square checkout right now.');
      }

      if (!checkoutPayload?.checkoutUrl) {
        throw new Error('Square did not return a checkout link.');
      }

      window.location.href = checkoutPayload.checkoutUrl;
    } catch (error) {
      setStatus(error.message || 'Could not start Square checkout right now.');
    } finally {
      setBusyPackId('');
    }
  };

  return (
    <div className="page">
      <div className="pxl-box topup-hero-main">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <h1 className="pixel" style={{ fontSize: 26 }}>TOP UP</h1>
          <span className="mono" style={{ fontSize: 20, opacity: .65 }}>// restock your wallet for more crate rolls</span>
        </div>

        {currentUser && (
          <div className="topup-balance-row">
            <span className="chip">CURRENT BALANCE</span>
            <img className="vto-token-icon" src="assets/token.webp" alt="VTO token" decoding="async" />
            <span className="pixel" style={{ fontSize: 18, color: 'var(--coral)' }}>{accountSnapshot.balance.toLocaleString()}</span>
          </div>
        )}

        <div className="topup-grid">
          {TOP_UP_PACKAGES.map((pack) => (
            <TopUpCard
              key={pack.id}
              pack={pack}
              busy={busyPackId === pack.id}
              onClaim={(amount) => handleTopUp({ packId: pack.id, amount })}
              onOpenCustom={() => setIsCustomOpen(true)}
            />
          ))}
        </div>
      </div>

      <div className="pxl-box" style={{ background: '#fff', padding: 24, marginTop: 28 }}>
        <div className="pixel" style={{ fontSize: 14, marginBottom: 10 }}>TOP-UP NOTES</div>
        <div className="mono" style={{ fontSize: 19, lineHeight: 1.5 }}>
          {status || 'Top-up buttons send you to a real Square-hosted payment page. This page should never credit VTO locally; balance updates must come from a verified backend payment confirmation.'}
        </div>
        {!currentUser && (
          <div style={{ marginTop: 18 }}>
            <button className="pxl-btn" onClick={() => goto('account')}>SIGN IN TO TOP UP</button>
          </div>
        )}
      </div>

      {isCustomOpen && (
        <div className="topup-modal-backdrop" onClick={() => setIsCustomOpen(false)}>
          <div className="topup-modal-shell" onClick={(event) => event.stopPropagation()}>
            <div className="pxl-box topup-custom-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div className="chip coral" style={{ marginBottom: 12 }}>CUSTOM</div>
                  <div className="pixel" style={{ fontSize: 20, marginBottom: 10 }}>BUILD YOUR STACK</div>
                </div>
                <button className="auth-modal-close" onClick={() => setIsCustomOpen(false)} aria-label="Close custom top up">X</button>
              </div>

              <p className="mono" style={{ fontSize: 20, lineHeight: 1.45, opacity: .78, marginBottom: 18 }}>
                Slide to choose your token amount. Custom pricing uses the same prototype conversion rate of $1.99 per 100 tokens.
              </p>

              <div className="topup-custom-preview">
                <img className="topup-card-image" src="assets/top up/6.webp" alt="Custom top up pack" decoding="async" />
              </div>

              <div className="topup-custom-metrics">
                <div>
                  <div className="pixel" style={{ fontSize: 10, color: 'var(--coral)', marginBottom: 6 }}>TOKENS</div>
                  <div className="pixel" style={{ fontSize: 18 }}>{customTokens.toLocaleString()}</div>
                </div>
                <div>
                  <div className="pixel" style={{ fontSize: 10, color: 'var(--coral)', marginBottom: 6 }}>PRICE</div>
                  <div className="pixel" style={{ fontSize: 18 }}>{formatUsd(customPrice)}</div>
                </div>
              </div>

              <input
                className="topup-slider"
                type="range"
                min="100"
                max="20000"
                step="100"
                value={customTokens}
                onChange={(event) => setCustomTokens(Number(event.target.value))}
              />

              <div className="topup-slider-scale">
                <span>100</span>
                <span>10,000</span>
                <span>20,000</span>
              </div>

              <button className="pxl-btn topup-custom-cta" onClick={() => handleTopUp({ packId: 'topup-custom', amount: customTokens, custom: true })}>
                {busyPackId === 'topup-custom' ? 'CONNECTING...' : 'TOP UP CUSTOM'}
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingReward && (
        <div className="topup-modal-backdrop" onClick={() => {}}>
          <div className="topup-modal-shell" onClick={(event) => event.stopPropagation()}>
            <div className="pxl-box topup-custom-card topup-reward-card">
              <div className="topup-reward-confetti" aria-hidden="true">
                {TOP_UP_REWARD_CONFETTI.map((piece, index) => (
                  <span
                    key={`confetti-${index}`}
                    className="topup-reward-confetti-piece"
                    style={{
                      left: piece.left,
                      animationDelay: piece.delay,
                      animationDuration: piece.duration,
                      background: piece.color,
                      width: piece.size,
                      height: piece.size,
                    }}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div className="chip coral" style={{ marginBottom: 12 }}>THANK YOU</div>
                  <div className="pixel" style={{ fontSize: 20, marginBottom: 10 }}>YOUR SQUARE REWARD IS READY</div>
                </div>
              </div>

              <p className="mono" style={{ fontSize: 20, lineHeight: 1.45, opacity: .82, marginBottom: 18 }}>
                You got <span className="pixel" style={{ color: 'var(--coral)' }}>{pendingReward.tokens.toLocaleString()} VTO</span>
                {' '}and a free random NFT item.
              </p>

              <div className="topup-custom-metrics" style={{ marginBottom: 18 }}>
                <div>
                  <div className="pixel" style={{ fontSize: 10, color: 'var(--coral)', marginBottom: 6 }}>VTO AMOUNT</div>
                  <div className="pixel" style={{ fontSize: 18 }}>{pendingReward.tokens.toLocaleString()}</div>
                </div>
                <div>
                  <div className="pixel" style={{ fontSize: 10, color: 'var(--coral)', marginBottom: 6 }}>FREE ITEM</div>
                  <div className="pixel" style={{ fontSize: 12 }}>{pendingRewardItem?.name || 'Mystery item'}</div>
                </div>
              </div>

              {pendingRewardItem && (
                <div className="topup-custom-preview" style={{ height: 220, marginBottom: 18 }}>
                  <div style={{ width: 140, height: 140, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img
                      className="topup-card-image"
                      src={pendingRewardItem.inventorySrc}
                      alt={pendingRewardItem.name}
                      loading="lazy"
                      decoding="async"
                      style={{ margin: 0, maxHeight: 140 }}
                    />
                  </div>
                </div>
              )}

              <button className="pxl-btn topup-custom-cta" onClick={handleClaimReward}>
                CLAIM
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

window.TopUpPage = TopUpPage;
