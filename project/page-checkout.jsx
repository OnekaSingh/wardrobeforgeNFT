const CHECKOUT_CLAIM_STORAGE_KEY = 'wardrobeforge-stripe-crate-claim-v1';

const getStoredClaimKey = (userId, sessionId) => `${CHECKOUT_CLAIM_STORAGE_KEY}:${userId || 'guest'}:${sessionId || 'session'}`;

const readStoredClaim = (userId, sessionId) => {
  try {
    const raw = window.localStorage.getItem(getStoredClaimKey(userId, sessionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (error) {
    return null;
  }
};

const writeStoredClaim = (userId, sessionId, value) => {
  const storageKey = getStoredClaimKey(userId, sessionId);
  if (!value) {
    window.localStorage.removeItem(storageKey);
    return;
  }
  window.localStorage.setItem(storageKey, JSON.stringify(value));
};

const rollCrateReward = (crate) => {
  const rewards = Array.isArray(crate?.contents) ? crate.contents : [];
  if (!rewards.length) return null;
  return rewards[Math.floor(Math.random() * rewards.length)] || null;
};

const grantCrateRewards = async ({ currentUser, crate, quantity, coinCostPerCrate = 0 }) => {
  const rewards = [];

  for (let index = 0; index < quantity; index += 1) {
    const reward = rollCrateReward(crate);
    if (!reward?.art) {
      throw new Error('This crate does not have any reward items configured.');
    }

    const claimResult = await window.WardrobeForgeAuth?.spendVtoAndGrantItem?.({
      userId: currentUser.id,
      cost: coinCostPerCrate,
      artId: reward.art,
      xpAmount: Number(reward.pointsBonus) || 0,
    });

    rewards.push({
      art: reward.art,
      id: reward.id,
      name: reward.name,
      rarity: reward.rarity,
      slot: reward.slot,
      inventorySrc: reward.inventorySrc || reward.avatarSrc || '',
      authenticityCode: claimResult?.grantedAuthenticityCode || '',
    });
  }

  return rewards;
};

const CheckoutPage = ({ currentUser, checkoutSession, goto, openAuthModal }) => {
  const crates = window.CRATE_LIBRARY || [];
  const formatUsd = (amount) => `$${Number(amount || 0).toFixed(2)}`;
  const [status, setStatus] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [completedOrder, setCompletedOrder] = React.useState(() => (checkoutSession?.rewards?.length ? checkoutSession : null));

  const searchParams = React.useMemo(() => new URLSearchParams(window.location.search), []);
  const stripeStatus = searchParams.get('stripe_status');
  const checkoutKind = searchParams.get('checkout');
  const sessionId = String(searchParams.get('session_id') || '').trim();
  const claimId = String(searchParams.get('claim') || '').trim();

  React.useEffect(() => {
    if (checkoutSession?.rewards?.length) {
      setCompletedOrder(checkoutSession);
      setStatus('');
    }
  }, [checkoutSession]);

  React.useEffect(() => {
    if (stripeStatus !== 'success' || checkoutKind !== 'crate' || !sessionId || !claimId) {
      return;
    }

    if (!currentUser?.id) {
      setStatus('Sign in to finish claiming your Stripe crate purchase.');
      return;
    }

    const existingClaim = readStoredClaim(currentUser.id, sessionId);
    if (existingClaim?.claimId === claimId && Array.isArray(existingClaim.rewards) && existingClaim.rewards.length) {
      setCompletedOrder(existingClaim);
      setStatus('Your Stripe crate purchase has already been claimed on this device.');
      return;
    }

    let isCancelled = false;

    const verifyAndClaimStripeCrates = async () => {
      setBusy(true);
      setStatus('Verifying your Stripe crate checkout...');

      try {
        const sessionResponse = await fetch(`/api/stripe/checkout-session?sessionId=${encodeURIComponent(sessionId)}`);
        const sessionPayload = await sessionResponse.json().catch(() => null);
        if (!sessionResponse.ok) {
          throw new Error(sessionPayload?.message || 'Could not verify your Stripe checkout.');
        }

        if (sessionPayload?.paymentStatus !== 'paid') {
          throw new Error('Stripe has not finished processing this purchase yet.');
        }

        const metadata = sessionPayload?.metadata || {};
        const metadataClaimId = String(metadata.claimId || '');
        const crateKey = String(metadata.crateKey || '');
        const quantity = Number(metadata.quantity);

        if (metadataClaimId !== claimId || !Number.isInteger(quantity) || quantity < 1) {
          throw new Error('Stripe returned an incomplete crate claim.');
        }

        const crate = crates.find((entry) => entry.id === crateKey);
        if (!crate) {
          throw new Error('The purchased crate could not be found.');
        }

        const rewards = await grantCrateRewards({
          currentUser,
          crate,
          quantity,
          coinCostPerCrate: 0,
        });

        const nextOrder = {
          claimId,
          sessionId,
          crateId: crate.id,
          crateName: crate.name,
          quantity,
          totalUsd: quantity * Number(window.CRATE_PRICE_USD || 2.99),
          totalLabel: formatUsd(quantity * Number(window.CRATE_PRICE_USD || 2.99)),
          paymentMethod: 'Stripe',
          rewards,
        };

        if (isCancelled) return;

        writeStoredClaim(currentUser.id, sessionId, nextOrder);
        setCompletedOrder(nextOrder);
        setStatus(`Stripe payment confirmed. ${quantity} ${quantity === 1 ? 'crate has' : 'crates have'} been opened.`);
      } catch (error) {
        if (!isCancelled) {
          setStatus(error.message || 'Could not finish the Stripe crate claim.');
        }
      } finally {
        if (!isCancelled) {
          setBusy(false);
        }
      }
    };

    verifyAndClaimStripeCrates();

    return () => {
      isCancelled = true;
    };
  }, [claimId, checkoutKind, crates, currentUser, sessionId, stripeStatus]);

  React.useEffect(() => {
    if (stripeStatus !== 'success' || checkoutKind !== 'crate' || !sessionId || !claimId || !completedOrder) {
      return;
    }

    searchParams.delete('stripe_status');
    searchParams.delete('checkout');
    searchParams.delete('session_id');
    searchParams.delete('claim');
    const nextSearch = searchParams.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash || '#/checkout'}`;
    window.history.replaceState({}, document.title, nextUrl);
  }, [claimId, checkoutKind, completedOrder, searchParams, sessionId, stripeStatus]);

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
            {status || 'No pending crate checkout was found.'}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="pxl-btn ghost" onClick={() => goto('nfts')}>BACK TO CRATES</button>
            {busy ? <span className="chip coral">PROCESSING</span> : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 22, flexWrap: 'wrap' }}>
        <h1 className="pixel" style={{ fontSize: 24 }}>CHECKOUT</h1>
        <span className="mono" style={{ fontSize: 18, opacity: .65 }}>// purchase complete</span>
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
              {status || `${completedOrder.quantity} ${completedOrder.quantity === 1 ? 'crate was' : 'crates were'} processed successfully.`}
            </p>

            <div className="pxl-box no-drop" style={{ background: 'var(--paper-2)', padding: 16, marginBottom: 16 }}>
              <div className="pixel" style={{ fontSize: 10, color: 'var(--coral)', marginBottom: 8 }}>ORDER SUMMARY</div>
              <div className="stat-row"><span className="stat-key">CRATE</span><span className="stat-val">{completedOrder.crateName}</span></div>
              <div className="stat-row"><span className="stat-key">QUANTITY</span><span className="stat-val">{completedOrder.quantity}</span></div>
              <div className="stat-row"><span className="stat-key">PAID VIA</span><span className="stat-val">{completedOrder.paymentMethod || 'Coins'}</span></div>
              <div className="stat-row"><span className="stat-key">TOTAL</span><span className="stat-val">{completedOrder.totalLabel || formatUsd(completedOrder.totalUsd)}</span></div>
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
                          decoding="async"
                          style={{ width: 48, height: 48, objectFit: 'contain', imageRendering: 'pixelated' }}
                        />
                      </div>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="pixel" style={{ fontSize: 9, marginBottom: 4 }}>{reward.name}</div>
                      <div className="mono" style={{ fontSize: 15, opacity: .72 }}>{reward.rarity} · {reward.slot.toUpperCase()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button className="pxl-btn ghost" onClick={() => goto('nfts')}>BACK TO CRATES</button>
              <button className="pxl-btn" onClick={() => goto('avatar')}>VIEW MY AVATAR</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

window.CheckoutPage = CheckoutPage;
