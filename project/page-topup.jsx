const TopUpPage = ({ currentUser, goto, openAuthModal }) => {
  const accountSnapshot = React.useMemo(
    () => window.WardrobeForgeAuth?.getAccountSnapshot?.(currentUser?.id) || { balance: 300 },
    [currentUser],
  );

  return (
    <div className="page">
      <div className="pxl-box topup-hero-main">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <h1 className="pixel" style={{ fontSize: 26 }}>TOP UP</h1>
          <span className="mono" style={{ fontSize: 20, opacity: .65 }}>// Stripe has been removed from WardrobeForge</span>
        </div>

        {currentUser && (
          <div className="topup-balance-row">
            <span className="chip">CURRENT BALANCE</span>
            <img className="vto-token-icon" src="assets/token.webp" alt="Coin icon" decoding="async" />
            <span className="pixel" style={{ fontSize: 18, color: 'var(--coral)' }}>{accountSnapshot.balance.toLocaleString()}</span>
            <span className="mono" style={{ fontSize: 18, opacity: .72 }}>coins</span>
          </div>
        )}

        <div className="pxl-box" style={{ background: '#fff', padding: 24, marginTop: 28 }}>
          <div className="pixel" style={{ fontSize: 14, marginBottom: 10 }}>TOP-UP STATUS</div>
          <div className="mono" style={{ fontSize: 19, lineHeight: 1.5 }}>
            Coin top-ups are currently unavailable. NFT purchases now use the direct on-chain Polygon mint flow from the crates page.
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 18 }}>
            <button className="pxl-btn" onClick={() => goto('nfts')}>GO TO CRATES</button>
            {!currentUser ? (
              <button className="pxl-btn ghost" onClick={() => openAuthModal && openAuthModal()}>SIGN IN</button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

window.TopUpPage = TopUpPage;
