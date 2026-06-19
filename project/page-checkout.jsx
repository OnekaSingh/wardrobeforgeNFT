const CHECKOUT_STORAGE_KEY = 'wardrobeforge-active-crate-checkout-v1';
const PENDING_CRATE_OPEN_STORAGE_KEY = 'wardrobeforge-pending-crate-open-v1';
const DEFAULT_CRATE_CONTRACT_ADDRESS = '0xB81B221d3379F21C17A6f70625d1F22a45399DAf';

const CheckoutPage = ({ currentUser, checkoutSession, goto, openAuthModal }) => {
  const formatUsd = (amount) => `$${Number(amount || 0).toFixed(2)}`;
  const getRandomIndex = (length) => {
    if (!length) return 0;
    const cryptoApi = window.crypto || window.msCrypto;
    if (cryptoApi?.getRandomValues) {
      const values = new Uint32Array(1);
      cryptoApi.getRandomValues(values);
      return values[0] % length;
    }
    return Math.floor(Math.random() * length);
  };
  const getDemoMintedRewards = (checkoutBase) => {
    const crateKey = String(checkoutBase?.crateKey || checkoutBase?.crateId || '');
    const crate = (window.CRATE_LIBRARY || []).find((entry) => String(entry.id) === crateKey)
      || (window.CRATE_LIBRARY || [])[0];
    const contents = Array.isArray(crate?.contents) ? crate.contents : [];
    const quantity = Math.max(1, Number(checkoutBase?.quantity) || 1);

    if (!contents.length) {
      return [{ tokenId: '100016', rollNumber: 1 }];
    }

    return Array.from({ length: quantity }, (_, index) => {
      const reward = contents[getRandomIndex(contents.length)];
      const tokenId = window.WardrobeForgeTokenCatalog?.getTokenIdForArt?.(reward);
      return {
        tokenId: String(tokenId || reward.tokenId || '100016'),
        rollNumber: index + 1,
      };
    });
  };
  const readStoredCheckout = () => {
    try {
      const parsed = JSON.parse(window.sessionStorage.getItem(CHECKOUT_STORAGE_KEY) || 'null');
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (error) {
      return null;
    }
  };
  const [activeCheckout, setActiveCheckout] = React.useState(() => checkoutSession || readStoredCheckout());
  const [form, setForm] = React.useState({
    email: currentUser?.email || '',
    name: currentUser?.displayName || '',
    cardNumber: '4242 4242 4242 4242',
    expiry: '12/30',
    cvc: '123',
    addressLine1: '',
    city: '',
    state: '',
    postalCode: '10001',
    country: 'US',
  });
  const [checkoutBusy, setCheckoutBusy] = React.useState(false);
  const [checkoutMessage, setCheckoutMessage] = React.useState('');
  const [checkoutStep, setCheckoutStep] = React.useState('summary');
  const [withdrawTokenId, setWithdrawTokenId] = React.useState('');
  const [withdrawAddress, setWithdrawAddress] = React.useState('');
  const [withdrawBusy, setWithdrawBusy] = React.useState(false);
  const [withdrawMessage, setWithdrawMessage] = React.useState('');
  const isLocalDemoHost = () => ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);

  React.useEffect(() => {
    if (!checkoutSession) return;
    setActiveCheckout(checkoutSession);
    window.sessionStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(checkoutSession));
  }, [checkoutSession]);

  React.useEffect(() => {
    if (!activeCheckout) return;
    window.sessionStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(activeCheckout));
    if (!withdrawTokenId && activeCheckout.rewards?.[0]?.tokenId) {
      setWithdrawTokenId(String(activeCheckout.rewards[0].tokenId));
    }
  }, [activeCheckout, withdrawTokenId]);

  React.useEffect(() => {
    setForm((current) => ({
      ...current,
      email: current.email || currentUser?.email || '',
      name: current.name || currentUser?.displayName || '',
    }));
  }, [currentUser]);

  const completedOrder = activeCheckout?.rewards?.length ? activeCheckout : null;
  const pendingCheckout = activeCheckout && !completedOrder ? activeCheckout : null;
  const walletAddress = activeCheckout?.walletAddress || activeCheckout?.recipientWallet || '';
  const nftPriceUsd = Number(activeCheckout?.nftPriceUsd ?? 0);
  const rawGasFeeUsd = Number(activeCheckout?.gasFeeUsd);
  const gasFeeUsd = Number((Number.isFinite(rawGasFeeUsd) && rawGasFeeUsd > 0 ? rawGasFeeUsd : 0.01).toFixed(2));
  const computedTotalUsd = Number((nftPriceUsd + gasFeeUsd).toFixed(2));
  const activeTotalUsd = Number(activeCheckout?.totalUsd);
  const totalUsd = Number.isFinite(activeTotalUsd) && activeTotalUsd >= computedTotalUsd ? activeTotalUsd : computedTotalUsd;
  const totalLabel = formatUsd(totalUsd);
  const contractAddress = activeCheckout?.contractAddress || window.WardrobeForgeConfig?.crateContractAddress || DEFAULT_CRATE_CONTRACT_ADDRESS;
  const transactionStatus = activeCheckout?.transactionStatus || (completedOrder ? 'confirmed' : activeCheckout?.paymentReceipt ? 'payment_authorized_mint_pending' : 'not_started');
  const hasAuthorizedPayment = Boolean(activeCheckout?.paymentReceipt);
  const showPaymentForm = !completedOrder && !hasAuthorizedPayment && checkoutStep !== 'summary';
  const isMintingCheckout = checkoutStep === 'authorizing' || checkoutStep === 'review' || checkoutStep === 'minting';
  const paymentNeedsAttention = hasAuthorizedPayment && !completedOrder && !isMintingCheckout;
  const allowCheckoutScroll = showPaymentForm || Boolean(completedOrder);
  React.useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    if (allowCheckoutScroll) {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    } else {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    }

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [allowCheckoutScroll]);

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const continueToPaymentDetails = () => {
    setCheckoutStep('details');
    setCheckoutMessage('');
    window.scrollTo(0, 0);
  };

  const handleCheckoutBack = () => {
    if (showPaymentForm) {
      setCheckoutStep('summary');
      setCheckoutMessage('');
      window.scrollTo(0, 0);
      return;
    }

    goto('nfts');
  };

  const handleOpenPurchasedCrate = () => {
    if (!completedOrder) return;
    window.sessionStorage.setItem(PENDING_CRATE_OPEN_STORAGE_KEY, JSON.stringify(completedOrder));
    goto('nfts');
  };

  const isValidAddress = (value) => /^0x[a-fA-F0-9]{40}$/.test(String(value || '').trim());
  const formatWalletAddress = (value) => (
    value && value.length > 14 ? `${value.slice(0, 8)}...${value.slice(-6)}` : value
  );
  const getMintFailureStatus = (message) => {
    const cleanMessage = String(message || '').toLowerCase();
    if (cleanMessage.includes('insufficient') && (cleanMessage.includes('gas') || cleanMessage.includes('fund'))) return 'insufficient_gas';
    if (cleanMessage.includes('replacement') || cleanMessage.includes('replaced') || cleanMessage.includes('dropped')) return 'dropped_or_replaced';
    if (cleanMessage.includes('revert') || cleanMessage.includes('failed') || cleanMessage.includes('not succeed')) return 'failed';
    return 'payment_authorized_mint_failed';
  };
  const getTransactionStatusLabel = (status) => ({
    not_started: 'NOT STARTED',
    payment_authorized_mint_pending: 'PAYMENT AUTHORIZED',
    pending: 'TRANSACTION PENDING',
    confirmed: 'CONFIRMED',
    failed: 'FAILED',
    dropped_or_replaced: 'DROPPED / REPLACED',
    insufficient_gas: 'INSUFFICIENT GAS',
    payment_authorized_mint_failed: 'PAYMENT AUTHORIZED / MINT FAILED',
  }[status] || String(status || 'UNKNOWN').replace(/_/g, ' ').toUpperCase());

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

  const executePaidMint = async (paymentPayload, checkoutBase = activeCheckout) => {
    const mintResponse = await fetch('/api/contract/execute-crate-purchase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        crateKey: checkoutBase.crateKey || checkoutBase.crateId,
        quantity: checkoutBase.quantity,
        recipientWallet: paymentPayload.recipientWallet,
        accountId: currentUser?.id || '',
        paymentReceipt: paymentPayload.paymentReceipt,
      }),
    });
    const mintPayload = await mintResponse.json().catch(() => null);
    if (!mintResponse.ok) {
      if (isLocalDemoHost() && String(paymentPayload.paymentReceipt || '').startsWith('demo_local_paid_')) {
        return {
          crateId: checkoutBase.crateId || 1,
          crateKey: checkoutBase.crateKey || checkoutBase.crateId,
          quantity: checkoutBase.quantity,
          recipientWallet: paymentPayload.recipientWallet,
          payerWallet: '0x000000000000000000000000000000000000bEEF',
          contractAddress,
          txHash: `0x${'1'.repeat(64)}`,
          blockNumber: '12345678',
          totalPriceWei: '0',
          paymentId: `0x${'a'.repeat(64)}`,
          mintedRewards: getDemoMintedRewards(checkoutBase),
        };
      }
      throw new Error(mintPayload?.message || 'Could not mint this crate on Polygon right now.');
    }
    return mintPayload;
  };

  const completePaidMint = async (paymentPayload, checkoutBase = activeCheckout) => {
    const mintPayload = await executePaidMint(paymentPayload, checkoutBase);

    const resolvedRewards = (mintPayload.mintedRewards || []).map((entry) => {
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
    const completedSession = {
      ...checkoutBase,
      ...paymentPayload,
      status: 'minted',
      transactionStatus: 'confirmed',
      paymentMethod: paymentPayload.paymentMethod || 'Card / Fiat',
      rewards: syncedRewards,
      walletAddress: paymentPayload.recipientWallet,
      txHash: mintPayload.txHash,
      contractAddress: mintPayload.contractAddress || contractAddress,
      payerWallet: mintPayload.payerWallet,
      mintedAt: new Date().toISOString(),
    };

    window.WardrobeForgeAuth?.recordPurchase?.(currentUser?.id, completedSession);
    setActiveCheckout(completedSession);
    setCheckoutStep('complete');
    setCheckoutMessage(`${checkoutBase.quantity} ${checkoutBase.quantity === 1 ? 'crate has' : 'crates have'} been minted to ${formatWalletAddress(paymentPayload.recipientWallet)}.`);
  };

  const handleSubmitPayment = (event) => {
    event.preventDefault();

    if (!pendingCheckout?.checkoutId) {
      setCheckoutMessage('Start from a crate purchase before entering card details.');
      return;
    }
    if (!isLocalDemoHost() && !String(form.email || '').includes('@')) {
      setCheckoutMessage('Enter a valid email for the receipt.');
      return;
    }
    if (!isLocalDemoHost() && String(form.cardNumber || '').replace(/\D/g, '').length < 12) {
      setCheckoutMessage('Enter demo card details before continuing.');
      return;
    }
    if (!isLocalDemoHost() && !String(form.addressLine1 || '').trim()) {
      setCheckoutMessage('Enter the billing address for the card.');
      return;
    }

    setCheckoutBusy(true);
    setCheckoutStep('authorizing');
    setCheckoutMessage('Demo processor is authorizing the card payment...');
    let paidSession = null;

    Promise.resolve()
      .then(async () => {
        await new Promise((resolve) => window.setTimeout(resolve, 450));
        setCheckoutStep('review');
        setCheckoutMessage('Demo risk review cleared. Converting fiat into the NFT price and gas reserve...');
        await new Promise((resolve) => window.setTimeout(resolve, 450));

        const paymentResponse = await fetch('/api/checkout/confirm-crate-checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            checkoutId: pendingCheckout.checkoutId,
            crateKey: pendingCheckout.crateKey || pendingCheckout.crateId,
            quantity: pendingCheckout.quantity,
            recipientWallet: pendingCheckout.recipientWallet,
            accountId: currentUser?.id || '',
            email: form.email,
          }),
        });
        const paymentPayload = await paymentResponse.json().catch(() => null);
        if (!paymentResponse.ok) {
          if (isLocalDemoHost()) {
            return {
              checkoutId: pendingCheckout.checkoutId,
              crateId: pendingCheckout.crateId,
              crateKey: pendingCheckout.crateKey || pendingCheckout.crateId,
              quantity: pendingCheckout.quantity,
              recipientWallet: pendingCheckout.recipientWallet,
              nftPriceUsd,
              gasFeeUsd,
              totalUsd: Number(activeCheckout?.totalUsd || 0),
              totalLabel,
              paymentMethod: 'Demo Card / Fiat',
              status: 'paid',
              paymentReceipt: `demo_local_paid_${Date.now().toString(36)}`,
            };
          }
          throw new Error(paymentPayload?.message || 'Card payment could not be confirmed.');
        }
        return paymentPayload;
      })
      .then(async (paymentPayload) => {

        paidSession = {
          ...pendingCheckout,
          ...paymentPayload,
          paymentEmail: form.email,
          status: 'paid',
          paymentMethod: paymentPayload.paymentMethod || 'Card / Fiat',
        };
        setCheckoutStep('minting');
        setCheckoutMessage('Payment complete. Minting the NFT to the custodial wallet on Polygon...');
        setActiveCheckout({
          ...paidSession,
          transactionStatus: 'pending',
        });

        await completePaidMint(paymentPayload, paidSession);
      })
      .catch((error) => {
        if (paidSession) {
          setActiveCheckout({
            ...paidSession,
            transactionStatus: getMintFailureStatus(error.message),
            mintFailureMessage: error.message || 'Mint failed after payment authorization.',
          });
        }
        setCheckoutStep(paidSession || activeCheckout?.paymentReceipt ? 'paid' : 'details');
        setCheckoutMessage(error.message || 'Checkout could not be completed right now.');
      })
      .finally(() => {
        setCheckoutBusy(false);
      });
  };

  const handleRetryMint = () => {
    if (!activeCheckout?.paymentReceipt || !activeCheckout?.recipientWallet) {
      setCheckoutMessage('Complete card checkout before minting.');
      return;
    }

    setCheckoutBusy(true);
    setCheckoutStep('minting');
    setCheckoutMessage('Retrying the paid Polygon mint...');
    setActiveCheckout((current) => ({
      ...current,
      transactionStatus: 'pending',
      mintFailureMessage: '',
    }));
    Promise.resolve()
      .then(() => completePaidMint(activeCheckout))
      .catch((error) => {
        setCheckoutStep('paid');
        setActiveCheckout((current) => ({
          ...current,
          transactionStatus: getMintFailureStatus(error.message),
          mintFailureMessage: error.message || 'Mint failed after payment authorization.',
        }));
        setCheckoutMessage(error.message || 'Could not mint this crate on Polygon right now.');
      })
      .finally(() => {
        setCheckoutBusy(false);
      });
  };

  const padAddress = (value) => String(value || '').trim().toLowerCase().replace(/^0x/, '').padStart(64, '0');
  const padUint = (value) => BigInt(value || 0).toString(16).padStart(64, '0');
  const encodeSafeTransferFrom = ({ from, to, tokenId }) => (
    `0xf242432a${padAddress(from)}${padAddress(to)}${padUint(tokenId)}${padUint(1)}${padUint(160)}${padUint(0)}`
  );

  const handleWithdraw = () => {
    const selectedReward = completedOrder?.rewards?.find((reward) => String(reward.tokenId) === String(withdrawTokenId));
    const cleanWithdrawAddress = String(withdrawAddress || '').trim();

    if (!selectedReward?.tokenId) {
      setWithdrawMessage('Choose a minted NFT before transferring.');
      return;
    }
    if (!isValidAddress(cleanWithdrawAddress)) {
      setWithdrawMessage('Enter the wallet address that should receive the NFT.');
      return;
    }
    if (!isValidAddress(walletAddress)) {
      setWithdrawMessage('The custodial wallet address is not available for transfer.');
      return;
    }

    setWithdrawBusy(true);
    setWithdrawMessage('Opening the embedded wallet to approve the transfer...');

    Promise.resolve()
      .then(async () => {
        const provider = await window.WardrobeForgeWallet?.getEmbeddedWalletProvider?.({ user: currentUser });
        if (!provider?.request) {
          throw new Error('Embedded wallet provider is not available in this browser.');
        }

        const transferHash = await provider.request({
          method: 'eth_sendTransaction',
          params: [{
            from: walletAddress,
            to: contractAddress,
            value: '0x0',
            data: encodeSafeTransferFrom({
              from: walletAddress,
              to: cleanWithdrawAddress,
              tokenId: selectedReward.tokenId,
            }),
          }],
        });

        const nextCheckout = {
          ...completedOrder,
          withdrawals: [
            ...(completedOrder.withdrawals || []),
            {
              tokenId: selectedReward.tokenId,
              to: cleanWithdrawAddress,
              txHash: transferHash,
              createdAt: new Date().toISOString(),
            },
          ],
        };
        setActiveCheckout(nextCheckout);
        setWithdrawMessage(`Transfer submitted: ${transferHash}`);
      })
      .catch((error) => {
        setWithdrawMessage(error.message || 'Could not start the NFT transfer right now.');
      })
      .finally(() => {
        setWithdrawBusy(false);
      });
  };

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

  if (!activeCheckout) {
    return (
      <div className="page">
        <div className="pxl-box" style={{ background: '#fff', padding: 28, textAlign: 'center' }}>
          <div className="pixel" style={{ fontSize: 20, marginBottom: 14 }}>CHECKOUT</div>
          <p className="mono" style={{ fontSize: 20, marginBottom: 18 }}>
            No crate checkout is waiting for payment.
          </p>
          <button className="pxl-btn ghost" onClick={() => goto('nfts')}>BACK TO CRATES</button>
        </div>
      </div>
    );
  }

  const orderSummary = (
    <div className="pxl-box no-drop checkout-summary-box" style={{ background: 'var(--paper-2)', padding: 16, marginBottom: 16 }}>
      <div className="pixel" style={{ fontSize: 10, color: 'var(--coral)', marginBottom: 8 }}>ORDER SUMMARY</div>
      <div className="stat-row">
        <span className="stat-key">ITEM</span>
        <span className="stat-val" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
          <span>{activeCheckout.crateName} × {activeCheckout.quantity}</span>
          <img
            src="assets/crates/pixel-crate.webp"
            alt={activeCheckout.crateName}
            decoding="async"
            style={{ width: 34, height: 34, objectFit: 'contain', imageRendering: 'pixelated', flex: '0 0 auto' }}
          />
        </span>
      </div>
      <div className="stat-row"><span className="stat-key">NETWORK</span><span className="stat-val">POLYGON</span></div>
      <div className="stat-row"><span className="stat-key">WALLET</span><span className="stat-val checkout-wallet-value">{walletAddress || 'CREATED AT CHECKOUT'}</span></div>
      <div className="stat-row"><span className="stat-key">NFT PRICE</span><span className="stat-val">{formatUsd(nftPriceUsd)}</span></div>
      <div className="stat-row"><span className="stat-key">GAS FEE</span><span className="stat-val">{formatUsd(gasFeeUsd)}</span></div>
      <div className="stat-row"><span className="stat-key">TOTAL</span><span className="stat-val">{totalLabel}</span></div>
      {completedOrder?.txHash ? <div className="stat-row"><span className="stat-key">TX HASH</span><span className="stat-val" style={{ fontSize: 14 }}>{completedOrder.txHash}</span></div> : null}
      {activeCheckout.paymentEmail ? <div className="stat-row"><span className="stat-key">RECEIPT</span><span className="stat-val">{activeCheckout.paymentEmail}</span></div> : null}
    </div>
  );

  return (
    <div className="page">
      <div className="pxl-box no-drop" style={{ background: '#fff', padding: 26 }}>
          <div style={{ padding: 8, maxWidth: 980, margin: '0 auto' }}>
            <div className="chip coral" style={{ marginBottom: 14 }}>
              {completedOrder ? 'ORDER COMPLETE' : checkoutStep === 'minting' ? 'MINTING' : paymentNeedsAttention ? 'PAYMENT COMPLETE' : showPaymentForm ? 'DEMO PAYMENT DETAILS' : 'DEMO CARD CHECKOUT'}
            </div>
            <div className="pixel" style={{ fontSize: 18, marginBottom: 10 }}>
              {completedOrder ? 'PURCHASE SUCCESS' : checkoutStep === 'minting' ? 'MINTING' : paymentNeedsAttention ? 'MINT NEEDS ATTENTION' : showPaymentForm ? 'ENTER CARD DETAILS' : 'REVIEW ORDER'}
            </div>
            <p className="mono" style={{ fontSize: 19, lineHeight: 1.45, marginBottom: 18 }}>
              {completedOrder
                ? `${completedOrder.quantity} ${completedOrder.quantity === 1 ? 'crate is' : 'crates are'} ready to open.`
                : checkoutStep === 'minting'
                  ? 'Payment complete. Minting the NFT to the custodial wallet on Polygon...'
                : paymentNeedsAttention
                  ? 'The card payment is authorized. The smart contract mint can be retried without charging the card again.'
                  : showPaymentForm
                    ? 'Enter demo card and billing details. The provider converts the payment into the NFT price and gas behind the scenes.'
                    : 'Review the total before continuing to card checkout.'}
            </p>

            {checkoutMessage ? (
              <div className="mono" style={{ fontSize: 18, padding: '10px 12px', background: 'var(--paper-2)', borderLeft: '4px solid var(--coral)', marginBottom: 16 }}>
                {checkoutMessage}
              </div>
            ) : null}

            {!showPaymentForm ? orderSummary : null}
            {!completedOrder ? (
              <>
                {paymentNeedsAttention ? (
                  <div style={{ display: 'grid', gap: 12 }}>
                    <button className="pxl-btn" type="button" onClick={handleRetryMint} disabled={checkoutBusy}>
                      {checkoutBusy ? 'MINTING...' : 'RETRY MINT'}
                    </button>
                  </div>
                ) : !showPaymentForm ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <button className="pxl-btn ghost" type="button" onClick={handleCheckoutBack} disabled={checkoutBusy}>BACK</button>
                    <button className="pxl-btn" type="button" onClick={continueToPaymentDetails}>CONTINUE</button>
                  </div>
                ) : (
                  <div className="checkout-payment-split">
                    <form className="auth-form checkout-form" onSubmit={handleSubmitPayment}>
                      <label className="auth-field">
                        <span>Email</span>
                        <input value={form.email} onChange={(event) => updateForm('email', event.target.value)} type="email" autoComplete="email" disabled={checkoutBusy} />
                      </label>
                      <label className="auth-field">
                        <span>Name on card</span>
                        <input value={form.name} onChange={(event) => updateForm('name', event.target.value)} autoComplete="cc-name" disabled={checkoutBusy} />
                      </label>
                      <label className="auth-field">
                        <span>Card number</span>
                        <input value={form.cardNumber} onChange={(event) => updateForm('cardNumber', event.target.value)} inputMode="numeric" autoComplete="cc-number" disabled={checkoutBusy} />
                      </label>
                      <label className="auth-field">
                        <span>Billing address</span>
                        <input value={form.addressLine1} onChange={(event) => updateForm('addressLine1', event.target.value)} autoComplete="billing street-address" disabled={checkoutBusy} />
                      </label>
                      <div className="checkout-card-grid">
                        <label className="auth-field">
                          <span>Expiry</span>
                          <input value={form.expiry} onChange={(event) => updateForm('expiry', event.target.value)} autoComplete="cc-exp" disabled={checkoutBusy} />
                        </label>
                        <label className="auth-field">
                          <span>CVC</span>
                          <input value={form.cvc} onChange={(event) => updateForm('cvc', event.target.value)} inputMode="numeric" autoComplete="cc-csc" disabled={checkoutBusy} />
                        </label>
                        <label className="auth-field">
                          <span>Country</span>
                          <input value={form.country} onChange={(event) => updateForm('country', event.target.value)} autoComplete="country" disabled={checkoutBusy} />
                        </label>
                      </div>
                      <div className="checkout-address-grid">
                        <label className="auth-field">
                          <span>City</span>
                          <input value={form.city} onChange={(event) => updateForm('city', event.target.value)} autoComplete="billing address-level2" disabled={checkoutBusy} />
                        </label>
                        <label className="auth-field">
                          <span>State</span>
                          <input value={form.state} onChange={(event) => updateForm('state', event.target.value)} autoComplete="billing address-level1" disabled={checkoutBusy} />
                        </label>
                        <label className="auth-field">
                          <span>ZIP</span>
                          <input value={form.postalCode} onChange={(event) => updateForm('postalCode', event.target.value)} autoComplete="billing postal-code" disabled={checkoutBusy} />
                        </label>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        <button className="pxl-btn ghost" type="button" onClick={handleCheckoutBack} disabled={checkoutBusy}>BACK</button>
                        <button className="pxl-btn" type="submit" disabled={checkoutBusy}>
                          {checkoutBusy ? 'PROCESSING...' : `PAY ${totalLabel}`}
                        </button>
                      </div>
                    </form>
                    {orderSummary}
                  </div>
                )}
              </>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button className="pxl-btn" onClick={handleOpenPurchasedCrate}>OPEN CRATE</button>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

window.CheckoutPage = CheckoutPage;
