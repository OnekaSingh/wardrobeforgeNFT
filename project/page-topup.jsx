/* ============= Top Up page ============= */

const TOP_UP_PACKAGES = [
  { id: 'topup-100', price: 2.99, coins: 100, tier: 1, badge: 'START', imageSrc: 'assets/top up/1.webp' },
  { id: 'topup-400', price: 11.96, coins: 400, tier: 2, badge: 'BOOST', imageSrc: 'assets/top up/2.webp' },
  { id: 'topup-1700', price: 50.83, coins: 1700, tier: 3, badge: 'STACK', imageSrc: 'assets/top up/3.webp' },
  { id: 'topup-3600', price: 107.64, coins: 3600, tier: 4, badge: 'DROP', imageSrc: 'assets/top up/4.webp' },
  { id: 'topup-15500', price: 463.45, coins: 15500, tier: 5, badge: 'VAULT', imageSrc: 'assets/top up/5.webp' },
  { id: 'topup-custom', price: null, coins: null, tier: 6, badge: 'CUSTOM', custom: true, imageSrc: 'assets/top up/6.webp' },
];

const TOP_UP_CUSTOM_RATE = 2.99 / 100;
const TOP_UP_PENDING_CLAIM_STORAGE_KEY = 'wardrobeforge-pending-stripe-topup-v1';

const formatUsd = (amount) => `$${amount.toFixed(2)}`;

const getPendingClaimStorageKey = (userId) => `${TOP_UP_PENDING_CLAIM_STORAGE_KEY}:${userId || 'guest'}`;

const readPendingClaim = (userId) => {
  try {
    const raw = window.localStorage.getItem(getPendingClaimStorageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (error) {
    return null;
  }
};

const writePendingClaim = (userId, claim) => {
  const storageKey = getPendingClaimStorageKey(userId);
  if (!claim) {
    window.localStorage.removeItem(storageKey);
    return;
  }
  window.localStorage.setItem(storageKey, JSON.stringify(claim));
};

const TopUpCard = ({ pack, onClaim, busy, onOpenCustom }) => (
  <div className={`pxl-box topup-card ${pack.custom ? 'topup-card-custom' : ''}`}>
    <div className="topup-card-badge">{pack.badge}</div>
    <div className="topup-card-stage">
      <img className="topup-card-image" src={pack.imageSrc} alt={pack.custom ? 'Custom top up pack' : `${pack.coins.toLocaleString()} coin pack`} loading="lazy" decoding="async" />
    </div>
    <div className="topup-card-lower">
      <div className="pixel topup-card-amount">{pack.custom ? 'CUSTOM' : `${pack.coins.toLocaleString()} COINS`}</div>
      <div className="mono topup-card-price">{pack.custom ? 'SLIDER' : formatUsd(pack.price)}</div>
      <button className="pxl-btn topup-card-cta" onClick={pack.custom ? onOpenCustom : () => onClaim(pack.coins)}>
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
  const [customCoins, setCustomCoins] = React.useState(2500);
  const [status, setStatus] = React.useState('');
  const [busyPackId, setBusyPackId] = React.useState('');
  const [isCustomOpen, setIsCustomOpen] = React.useState(false);
  const [pendingClaim, setPendingClaim] = React.useState(() => readPendingClaim(currentUser?.id || null));
  const customPrice = Number((customCoins * TOP_UP_CUSTOM_RATE).toFixed(2));

  React.useEffect(() => {
    setPendingClaim(readPendingClaim(currentUser?.id || null));
  }, [currentUser?.id]);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stripeStatus = params.get('stripe_status');
    const checkoutKind = params.get('checkout');
    const sessionId = String(params.get('session_id') || '').trim();
    const claimId = String(params.get('claim') || '').trim();

    if (stripeStatus !== 'success' || checkoutKind !== 'topup' || !currentUser?.id || !sessionId || !claimId) {
      return;
    }

    let isCancelled = false;

    const verifyTopUp = async () => {
      const existingPendingClaim = readPendingClaim(currentUser.id);
      if (existingPendingClaim?.sessionId === sessionId && existingPendingClaim?.claimId === claimId) {
        setPendingClaim(existingPendingClaim);
        setStatus(`Stripe payment returned successfully. Claim ${Number(existingPendingClaim.coins || 0).toLocaleString()} coins.`);
        params.delete('stripe_status');
        params.delete('checkout');
        params.delete('session_id');
        params.delete('claim');
        const nextSearch = params.toString();
        const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash || '#/topup'}`;
        window.history.replaceState({}, document.title, nextUrl);
        return;
      }

      try {
        const sessionResponse = await fetch(`/api/stripe/checkout-session?sessionId=${encodeURIComponent(sessionId)}`);
        const sessionPayload = await sessionResponse.json().catch(() => null);
        if (!sessionResponse.ok) {
          throw new Error(sessionPayload?.message || 'Could not verify your Stripe checkout.');
        }

        const paidCoins = Number(sessionPayload?.metadata?.coins);
        const paidClaimId = String(sessionPayload?.metadata?.claimId || '');
        if (sessionPayload?.paymentStatus !== 'paid' || !Number.isFinite(paidCoins) || paidCoins <= 0 || paidClaimId !== claimId) {
          throw new Error('Stripe has not finished processing this coin checkout yet.');
        }

        const nextPendingClaim = {
          sessionId,
          claimId,
          coins: paidCoins,
          createdAt: new Date().toISOString(),
        };

        if (isCancelled) return;

        writePendingClaim(currentUser.id, nextPendingClaim);
        setPendingClaim(nextPendingClaim);
        setStatus(`Stripe payment returned successfully. Claim ${paidCoins.toLocaleString()} coins.`);
      } catch (error) {
        if (!isCancelled) {
          setStatus(error.message || 'Could not verify your Stripe payment right now.');
        }
      } finally {
        params.delete('stripe_status');
        params.delete('checkout');
        params.delete('session_id');
        params.delete('claim');
        const nextSearch = params.toString();
        const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash || '#/topup'}`;
        window.history.replaceState({}, document.title, nextUrl);
      }
    };

    verifyTopUp();

    return () => {
      isCancelled = true;
    };
  }, [currentUser?.id]);

  const handleClaimReward = async () => {
    if (!currentUser?.id || !pendingClaim) return;

    try {
      const claimResult = await window.WardrobeForgeAuth?.redeemTopUpReward?.({
        userId: currentUser.id,
        claimId: pendingClaim.claimId,
        tokens: pendingClaim.coins,
        bonusArt: null,
      });

      if (claimResult?.alreadyClaimed) {
        setStatus('That Stripe top-up was already claimed on this account.');
      } else {
        setStatus(`Thank you! You claimed ${pendingClaim.coins.toLocaleString()} coins.`);
      }

      writePendingClaim(currentUser.id, null);
      setPendingClaim(null);
    } catch (error) {
      setStatus(error.message || 'Could not claim your Stripe coins right now.');
    }
  };

  const handleTopUp = async ({ packId, amount, custom = false }) => {
    if (!currentUser) {
      setStatus('Sign in to add coins to your WardrobeForge profile.');
      if (openAuthModal) openAuthModal();
      return;
    }

    setBusyPackId(packId);
    setStatus('');

    try {
      const checkoutResponse = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          checkoutKind: 'topup',
          packId,
          customCoins: custom ? amount : null,
          userId: currentUser.id,
          displayName: currentUser.displayName,
          buyerEmail: currentUser.email,
        }),
      });

      const checkoutPayload = await checkoutResponse.json().catch(() => null);
      if (!checkoutResponse.ok) {
        throw new Error(checkoutPayload?.message || 'Could not start Stripe checkout right now.');
      }

      if (!checkoutPayload?.checkoutUrl) {
        throw new Error('Stripe did not return a checkout link.');
      }

      window.location.href = checkoutPayload.checkoutUrl;
    } catch (error) {
      setStatus(error.message || 'Could not start Stripe checkout right now.');
    } finally {
      setBusyPackId('');
    }
  };

  return (
    <div className="page">
      <div className="pxl-box topup-hero-main">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <h1 className="pixel" style={{ fontSize: 26 }}>TOP UP</h1>
          <span className="mono" style={{ fontSize: 20, opacity: .65 }}>// restock your coins for more crate rolls</span>
        </div>

        {currentUser && (
          <div className="topup-balance-row">
            <span className="chip">CURRENT BALANCE</span>
            <img className="vto-token-icon" src="assets/token.webp" alt="Coin icon" decoding="async" />
            <span className="pixel" style={{ fontSize: 18, color: 'var(--coral)' }}>{accountSnapshot.balance.toLocaleString()}</span>
            <span className="mono" style={{ fontSize: 18, opacity: .72 }}>coins</span>
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
          {status || 'Top-up buttons send you to a Stripe-hosted payment page. Coin balance is only credited after the completed checkout returns and is verified.'}
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
                Slide to choose your coin amount. Pricing stays locked to $2.99 per 100 coins.
              </p>

              <div className="topup-custom-preview">
                <img className="topup-card-image" src="assets/top up/6.webp" alt="Custom top up pack" decoding="async" />
              </div>

              <div className="topup-custom-metrics">
                <div>
                  <div className="pixel" style={{ fontSize: 10, color: 'var(--coral)', marginBottom: 6 }}>COINS</div>
                  <div className="pixel" style={{ fontSize: 18 }}>{customCoins.toLocaleString()}</div>
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
                value={customCoins}
                onChange={(event) => setCustomCoins(Number(event.target.value))}
              />

              <div className="topup-slider-scale">
                <span>100</span>
                <span>10,000</span>
                <span>20,000</span>
              </div>

              <button className="pxl-btn topup-custom-cta" onClick={() => handleTopUp({ packId: 'topup-custom', amount: customCoins, custom: true })}>
                {busyPackId === 'topup-custom' ? 'CONNECTING...' : 'TOP UP CUSTOM'}
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingClaim && (
        <div className="topup-modal-backdrop" onClick={() => {}}>
          <div className="topup-modal-shell" onClick={(event) => event.stopPropagation()}>
            <div className="pxl-box topup-custom-card topup-reward-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div className="chip coral" style={{ marginBottom: 12 }}>THANK YOU</div>
                  <div className="pixel" style={{ fontSize: 20, marginBottom: 10 }}>YOUR STRIPE TOP-UP IS READY</div>
                </div>
              </div>

              <p className="mono" style={{ fontSize: 20, lineHeight: 1.45, opacity: .82, marginBottom: 18 }}>
                You got <span className="pixel" style={{ color: 'var(--coral)' }}>{pendingClaim.coins.toLocaleString()} coins</span>.
                {' '}Claim them to add them to your balance.
              </p>

              <div className="topup-custom-metrics" style={{ marginBottom: 18 }}>
                <div>
                  <div className="pixel" style={{ fontSize: 10, color: 'var(--coral)', marginBottom: 6 }}>COINS</div>
                  <div className="pixel" style={{ fontSize: 18 }}>{pendingClaim.coins.toLocaleString()}</div>
                </div>
                <div>
                  <div className="pixel" style={{ fontSize: 10, color: 'var(--coral)', marginBottom: 6 }}>RATE</div>
                  <div className="pixel" style={{ fontSize: 18 }}>$2.99 / 100</div>
                </div>
              </div>

              <button className="pxl-btn topup-custom-cta" onClick={handleClaimReward}>
                CLAIM COINS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

window.TopUpPage = TopUpPage;
