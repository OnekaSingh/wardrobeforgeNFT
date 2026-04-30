/* ============= Top Up page ============= */

const TOP_UP_PACKAGES = [
  { id: 'topup-100', price: 1.99, tokens: 100, tier: 1, badge: 'START', imageSrc: 'assets/top up/1.png' },
  { id: 'topup-400', price: 5.99, tokens: 400, tier: 2, badge: 'BOOST', imageSrc: 'assets/top up/2.png' },
  { id: 'topup-1700', price: 25.99, tokens: 1700, tier: 3, badge: 'STACK', imageSrc: 'assets/top up/3.png' },
  { id: 'topup-3600', price: 50.99, tokens: 3600, tier: 4, badge: 'DROP', imageSrc: 'assets/top up/4.png' },
  { id: 'topup-15500', price: 200.99, tokens: 15500, tier: 5, badge: 'VAULT', imageSrc: 'assets/top up/5.png' },
  { id: 'topup-custom', price: null, tokens: null, tier: 6, badge: 'CUSTOM', custom: true, imageSrc: 'assets/top up/6.png' },
];

const TOP_UP_CUSTOM_RATE = 1.99 / 100;

const formatUsd = (amount) => `$${amount.toFixed(2)}`;

const TopUpCard = ({ pack, onClaim, busy, onOpenCustom }) => (
  <div className={`pxl-box topup-card ${pack.custom ? 'topup-card-custom' : ''}`}>
    <div className="topup-card-badge">{pack.badge}</div>
    <div className="topup-card-stage">
      <img className="topup-card-image" src={pack.imageSrc} alt={pack.custom ? 'Custom top up pack' : `${pack.tokens.toLocaleString()} token pack`} />
    </div>
    <div className="topup-card-lower">
      <div className="pixel topup-card-amount">{pack.custom ? 'CUSTOM' : `${pack.tokens.toLocaleString()} TOKENS`}</div>
      <div className="mono topup-card-price">{pack.custom ? 'SLIDER' : formatUsd(pack.price)}</div>
      <button className="pxl-btn topup-card-cta" onClick={pack.custom ? onOpenCustom : () => onClaim(pack.tokens)}>
        {pack.custom ? 'OPEN' : busy ? 'ADDING...' : 'TOP UP'}
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
  const [busyAmount, setBusyAmount] = React.useState(null);
  const [isCustomOpen, setIsCustomOpen] = React.useState(false);
  const customPrice = Number((customTokens * TOP_UP_CUSTOM_RATE).toFixed(2));

  const handleTopUp = (amount) => {
    if (!currentUser) {
      setStatus('Sign in to add tokens to your backend-linked WardrobeForge profile on this device.');
      if (openAuthModal) openAuthModal();
      return;
    }

    setBusyAmount(amount);
    setStatus('');
    try {
      window.WardrobeForgeAuth?.addVtoBalance?.({
        userId: currentUser.id,
        amount,
      });
      setStatus(`${amount.toLocaleString()} tokens added to ${currentUser.displayName}.`);
    } catch (error) {
      setStatus(error.message || 'Could not add tokens right now.');
    } finally {
      setBusyAmount(null);
    }
  };

  return (
    <div className="page">
      <div className="pxl-box topup-hero-main">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <h1 className="pixel" style={{ fontSize: 26 }}>TOP UP</h1>
          <span className="mono" style={{ fontSize: 20, opacity: .65 }}>// restock your wallet for more crate rolls</span>
        </div>

        <div className="topup-balance-row">
          <span className="chip">CURRENT BALANCE</span>
          <img className="vto-token-icon" src="assets/token.png" alt="VTO token" />
          <span className="pixel" style={{ fontSize: 18, color: 'var(--coral)' }}>{accountSnapshot.balance.toLocaleString()}</span>
        </div>

        <div className="topup-grid">
          {TOP_UP_PACKAGES.map((pack) => (
            <TopUpCard
              key={pack.id}
              pack={pack}
              busy={busyAmount === pack.tokens}
              onClaim={handleTopUp}
              onOpenCustom={() => setIsCustomOpen(true)}
            />
          ))}
        </div>
      </div>

      <div className="pxl-box" style={{ background: '#fff', padding: 24, marginTop: 28 }}>
        <div className="pixel" style={{ fontSize: 14, marginBottom: 10 }}>TOP-UP NOTES</div>
        <div className="mono" style={{ fontSize: 19, lineHeight: 1.5 }}>
          {status || 'This is still a prototype checkout. Auth now comes from the shared backend, while test top-ups still change the signed-in device profile for wardrobe testing.'}
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
                <img className="topup-card-image" src="assets/top up/6.png" alt="Custom top up pack" />
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

              <button className="pxl-btn topup-custom-cta" onClick={() => handleTopUp(customTokens)}>
                {busyAmount === customTokens ? 'ADDING...' : 'TOP UP CUSTOM'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

window.TopUpPage = TopUpPage;
