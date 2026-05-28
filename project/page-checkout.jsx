const CheckoutPage = ({ currentUser, checkoutSession, goto, openAuthModal }) => {
  const formatUsd = (amount) => `$${Number(amount || 0).toFixed(2)}`;
  const completedOrder = checkoutSession?.rewards?.length ? checkoutSession : null;

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

  if (!completedOrder) {
    return (
      <div className="page">
        <div className="pxl-box" style={{ background: '#fff', padding: 28, textAlign: 'center' }}>
          <div className="pixel" style={{ fontSize: 20, marginBottom: 14 }}>CHECKOUT</div>
          <p className="mono" style={{ fontSize: 20, marginBottom: 18 }}>
            No completed on-chain crate purchase was found.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="pxl-btn ghost" onClick={() => goto('nfts')}>BACK TO CRATES</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 22, flexWrap: 'wrap' }}>
        <h1 className="pixel" style={{ fontSize: 24 }}>CHECKOUT</h1>
        <span className="mono" style={{ fontSize: 18, opacity: .65 }}>// on-chain purchase complete</span>
      </div>

      <div className="pxl-box no-drop" style={{ background: '#fff', padding: 26 }}>
        <div className="split" style={{ gap: 24 }}>
          <div className="dither-bg" style={{ padding: 26, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 340, borderRight: '4px solid var(--ink)' }}>
            <img
              className="crate-image crate-image-large"
              src="assets/crates/pixel-crate.webp"
              alt={completedOrder.crateName}
              decoding="async"
              style={{ width: 220, maxWidth: '100%', marginBottom: 18 }}
            />
            <div className="pixel" style={{ fontSize: 18, marginBottom: 8 }}>{completedOrder.crateName}</div>
            <div className="mono" style={{ fontSize: 20 }}>{completedOrder.quantity} {completedOrder.quantity === 1 ? 'crate' : 'crates'}</div>
          </div>

          <div style={{ padding: 8 }}>
            <div className="chip coral" style={{ marginBottom: 14 }}>ORDER COMPLETE</div>
            <div className="pixel" style={{ fontSize: 18, marginBottom: 10 }}>YOUR REWARDS ARE READY</div>
            <p className="mono" style={{ fontSize: 19, lineHeight: 1.45, marginBottom: 18 }}>
              {completedOrder.quantity} {completedOrder.quantity === 1 ? 'crate was' : 'crates were'} minted successfully on Polygon.
            </p>

            <div className="pxl-box no-drop" style={{ background: 'var(--paper-2)', padding: 16, marginBottom: 16 }}>
              <div className="pixel" style={{ fontSize: 10, color: 'var(--coral)', marginBottom: 8 }}>ORDER SUMMARY</div>
              <div className="stat-row"><span className="stat-key">CRATE</span><span className="stat-val">{completedOrder.crateName}</span></div>
              <div className="stat-row"><span className="stat-key">QUANTITY</span><span className="stat-val">{completedOrder.quantity}</span></div>
              <div className="stat-row"><span className="stat-key">PAID VIA</span><span className="stat-val">{completedOrder.paymentMethod || 'Polygon Wallet'}</span></div>
              <div className="stat-row"><span className="stat-key">TOTAL</span><span className="stat-val">{completedOrder.totalLabel || formatUsd(completedOrder.totalUsd)}</span></div>
              <div className="stat-row"><span className="stat-key">NETWORK</span><span className="stat-val">POLYGON</span></div>
              <div className="stat-row"><span className="stat-key">WALLET</span><span className="stat-val">{completedOrder.walletAddress || 'NOT SET'}</span></div>
              <div className="stat-row"><span className="stat-key">TX HASH</span><span className="stat-val" style={{ fontSize: 14 }}>{completedOrder.txHash || 'PENDING'}</span></div>
            </div>

            <div className="pxl-box no-drop" style={{ background: 'var(--paper-2)', padding: 16, marginBottom: 22 }}>
              <div className="pixel" style={{ fontSize: 10, color: 'var(--coral)', marginBottom: 10 }}>REWARDS</div>
              <div style={{ display: 'grid', gap: 10 }}>
                {completedOrder.rewards.map((reward, index) => (
                  <div key={`${reward.art}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="crate-legend-thumb">
                      <div className="crate-legend-art">
                        <img
                          src={reward.inventorySrc || window.IMAGE_GEAR_MAP?.[reward.art]?.inventorySrc || window.IMAGE_GEAR_MAP?.[reward.art]?.avatarSrc || ''}
                          alt={reward.name}
                          loading="lazy"
                          decoding="async"
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="pixel" style={{ fontSize: 10, marginBottom: 4 }}>{reward.name}</div>
                      <div className="mono" style={{ fontSize: 16, opacity: .72 }}>
                        {reward.slot.toUpperCase()} · TOKEN #{reward.tokenId || 'UNKNOWN'}
                      </div>
                    </div>
                    <span className={`chip ${RARITY_COLOR[reward.rarity] || 'coral'}`}>{reward.rarity.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button className="pxl-btn" onClick={() => goto('avatar')}>VIEW MY AVATAR</button>
              <button className="pxl-btn ghost" onClick={() => goto('nfts')}>BACK TO CRATES</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

window.CheckoutPage = CheckoutPage;
