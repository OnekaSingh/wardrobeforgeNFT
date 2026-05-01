const CheckoutPage = ({ currentUser, checkoutSession, goto, openAuthModal }) => {
  if (!currentUser) {
    return (
      <div className="page">
        <div className="pxl-box" style={{ background: '#fff', padding: 28, textAlign: 'center' }}>
          <div className="pixel" style={{ fontSize: 20, marginBottom: 14 }}>CHECKOUT</div>
          <p className="mono" style={{ fontSize: 20, marginBottom: 18 }}>
            Sign in to continue to checkout.
          </p>
          <button className="pxl-btn" onClick={() => openAuthModal && openAuthModal()}>SIGN IN</button>
        </div>
      </div>
    );
  }

  if (!checkoutSession) {
    return (
      <div className="page">
        <div className="pxl-box" style={{ background: '#fff', padding: 28, textAlign: 'center' }}>
          <div className="pixel" style={{ fontSize: 20, marginBottom: 14 }}>CHECKOUT</div>
          <p className="mono" style={{ fontSize: 20, marginBottom: 18 }}>
            No pending crate checkout was found.
          </p>
          <button className="pxl-btn" onClick={() => goto('nfts')}>BACK TO CRATES</button>
        </div>
      </div>
    );
  }

  const walletAddress = String(checkoutSession.walletAddress || '');

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 22, flexWrap: 'wrap' }}>
        <h1 className="pixel" style={{ fontSize: 24 }}>CHECKOUT</h1>
        <span className="mono" style={{ fontSize: 18, opacity: .65 }}>// wallet-ready preview flow</span>
      </div>

      <div className="pxl-box no-drop" style={{ background: '#fff', padding: 26 }}>
        <div className="split" style={{ gap: 24 }}>
          <div className="dither-bg" style={{ padding: 26, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 340, borderRight: '4px solid var(--ink)' }}>
            <img
              className="crate-image crate-image-large"
              src="assets/crates/pixel-crate.webp"
              alt={checkoutSession.crateName}
              decoding="async"
              style={{ width: 220, maxWidth: '100%', marginBottom: 18 }}
            />
            <div className="pixel" style={{ fontSize: 18, marginBottom: 8 }}>{checkoutSession.crateName}</div>
            <div className="mono" style={{ fontSize: 20 }}>{checkoutSession.quantity} {checkoutSession.quantity === 1 ? 'crate' : 'crates'}</div>
          </div>

          <div style={{ padding: 8 }}>
            <div className="chip coral" style={{ marginBottom: 14 }}>ORDER READY</div>
            <div className="pixel" style={{ fontSize: 18, marginBottom: 10 }}>YOUR EMBEDDED WALLET IS READY</div>
            <p className="mono" style={{ fontSize: 19, lineHeight: 1.45, marginBottom: 18 }}>
              We generated and saved a Polygon wallet for this account. This page is the pre-Wert staging checkout so we can confirm the flow before enabling live payment.
            </p>

            <div className="pxl-box no-drop" style={{ background: 'var(--paper-2)', padding: 16, marginBottom: 16 }}>
              <div className="pixel" style={{ fontSize: 10, color: 'var(--coral)', marginBottom: 8 }}>ORDER SUMMARY</div>
              <div className="stat-row"><span className="stat-key">CRATE</span><span className="stat-val">{checkoutSession.crateName}</span></div>
              <div className="stat-row"><span className="stat-key">QUANTITY</span><span className="stat-val">{checkoutSession.quantity}</span></div>
              <div className="stat-row"><span className="stat-key">TOTAL</span><span className="stat-val">{checkoutSession.totalLabel}</span></div>
            </div>

            <div className="pxl-box no-drop" style={{ background: 'var(--paper-2)', padding: 16, marginBottom: 22 }}>
              <div className="pixel" style={{ fontSize: 10, color: 'var(--coral)', marginBottom: 8 }}>RECIPIENT WALLET</div>
              <div className="mono" style={{ fontSize: 17, lineHeight: 1.4, wordBreak: 'break-all' }}>{walletAddress}</div>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button className="pxl-btn ghost" onClick={() => goto('nfts')}>BACK TO CRATES</button>
              <button className="pxl-btn" onClick={() => window.alert('Pre-Wert checkout page is working. Live payment comes next once your Wert account is approved.')}>
                CONTINUE
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

window.CheckoutPage = CheckoutPage;
