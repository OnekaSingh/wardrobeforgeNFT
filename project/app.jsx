/* ============= App shell + router ============= */

const { useState: useStateApp, useEffect: useEffectApp } = React;

const getRouteFromHash = () => {
  const rawHash = String(window.location.hash || '');
  const normalizedHash = rawHash.replace(/^#\/?/, '');
  if (normalizedHash === 'topup') return 'nfts';
  return normalizedHash || 'main';
};

const App = () => {
  const authApi = window.WardrobeForgeAuth;
  const AuthModalComponent = window.AuthModal;
  const CheckoutPageComponent = window.CheckoutPage;
  const [page, setPage] = useStateApp(() => getRouteFromHash());
  const [nftFocus, setNftFocus] = useStateApp(null);
  const [avatarEquipRequest, setAvatarEquipRequest] = useStateApp(null);
  const [checkoutSession, setCheckoutSession] = useStateApp(null);
  const [currentUser, setCurrentUser] = useStateApp(() => authApi?.getCurrentUser?.() || null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useStateApp(false);
  const [tweaks, setTweak] = useTweaks(/*EDITMODE-BEGIN*/{
    "accent": "#F85646",
    "scanlines": true,
    "skin": "lavender",
    "fontScale": 1
  }/*EDITMODE-END*/);

  useEffectApp(() => {
    document.documentElement.style.setProperty('--coral', tweaks.accent);
    document.documentElement.style.fontSize = (16 * tweaks.fontScale) + 'px';
  }, [tweaks.accent, tweaks.fontScale]);

  const goto = (p, focus, equipRequest = null, options = null) => {
    setPage(p);
    if (focus) setNftFocus(focus);
    if (equipRequest) setAvatarEquipRequest(equipRequest);
    if (options && Object.prototype.hasOwnProperty.call(options, 'checkoutSession')) {
      setCheckoutSession(options.checkoutSession);
    }
    window.location.hash = `/${p}`;
    window.scrollTo(0, 0);
  };

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  useEffectApp(() => {
    const onHash = () => setPage(getRouteFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffectApp(() => {
    if (!authApi?.AUTH_CHANGE_EVENT) return undefined;

    const syncUser = () => {
      setCurrentUser(authApi.getCurrentUser());
    };

    window.addEventListener(authApi.AUTH_CHANGE_EVENT, syncUser);
    window.addEventListener('storage', syncUser);
    return () => {
      window.removeEventListener(authApi.AUTH_CHANGE_EVENT, syncUser);
      window.removeEventListener('storage', syncUser);
    };
  }, [authApi]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav page={page} goto={goto} currentUser={currentUser} />

      <main style={{ flex: 1 }} className={tweaks.scanlines ? '' : 'no-scanlines'}>
        {page === 'main' && <MainPage goto={goto} currentUser={currentUser} />}
        {page === 'avatar' && <AvatarPage currentUser={currentUser} goto={goto} openAuthModal={openAuthModal} equipRequest={avatarEquipRequest} />}
        {page === 'nfts' && <NFTsPage initialId={nftFocus} goto={goto} currentUser={currentUser} openAuthModal={openAuthModal} />}
        {page === 'checkout' && CheckoutPageComponent && <CheckoutPageComponent currentUser={currentUser} checkoutSession={checkoutSession} goto={goto} openAuthModal={openAuthModal} />}
        {page === 'account' && <AuthPage goto={goto} />}
        {page === 'contact' && <ContactPage />}
        {page === 'privacy' && <PrivacyPage />}
        {page === 'terms' && <TermsPage />}
      </main>

      <Footer goto={goto} />
      {AuthModalComponent && <AuthModalComponent open={isAuthModalOpen} goto={goto} onClose={closeAuthModal} />}

      <TweaksPanel title="Tweaks">
        <TweakSection title="Look & Feel">
          <TweakColor label="Accent color" value={tweaks.accent} onChange={v => setTweak('accent', v)} />
          <TweakToggle label="CRT scanlines" value={tweaks.scanlines} onChange={v => setTweak('scanlines', v)} />
          <TweakSlider label="Font scale" min={0.85} max={1.2} step={0.05} value={tweaks.fontScale} onChange={v => setTweak('fontScale', v)} />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
};

const Nav = ({ page, goto, currentUser }) => {
  const handleLogout = () => {
    window.WardrobeForgeAuth?.logOut?.();
    goto('account');
  };

  return (
    <nav className="nav">
      <div className="logo" onClick={() => goto('main')}>
        <img src="assets/logo.webp?v=3" alt="WardrobeForge" decoding="async" />
        <span>WARDROBE<span style={{ color: 'var(--coral)' }}>FORGE</span></span>
      </div>
      <div className="links">
        <div className={`link ${page === 'main' ? 'active' : ''}`} onClick={() => goto('main')}>HOME</div>
        <div className={`link ${page === 'avatar' ? 'active' : ''}`} onClick={() => goto('avatar')}>MY AVATAR</div>
        <div className={`link ${page === 'nfts' ? 'active' : ''}`} onClick={() => goto('nfts')}>CLOTHING NFTS</div>
        <div className={`link ${page === 'contact' ? 'active' : ''}`} onClick={() => goto('contact')}>CONTACT</div>
        <div className={`link ${page === 'privacy' ? 'active' : ''}`} onClick={() => goto('privacy')}>PRIVACY</div>
        <div className={`link ${page === 'terms' ? 'active' : ''}`} onClick={() => goto('terms')}>TERMS</div>
      </div>
      <div className="nav-account">
        {currentUser ? (
          <>
            <div className="nav-account-pill">
              <span className="chip coral">LIVE</span>
              <span className="mono">{currentUser.displayName}</span>
            </div>
            <button className="pxl-btn ghost" onClick={handleLogout}>LOG OUT</button>
          </>
        ) : (
          <button className="pxl-btn" onClick={() => goto('account')}>SIGN IN</button>
        )}
      </div>
    </nav>
  );
};

const Footer = ({ goto }) => (
  <footer className="foot">
    <div style={{ marginBottom: 14 }}>2026 WardrobeForge · All rights reserved · Forge Your Wardrobe</div>
    <div className="foot-contact-wrap">
      <button className="pxl-btn ghost foot-contact-btn" onClick={() => goto('contact')}>CONTACT US</button>
    </div>
    <div>
      <a onClick={() => goto('main')} style={{ cursor: 'pointer' }}>HOME</a>·
      <a onClick={() => goto('avatar')} style={{ cursor: 'pointer' }}>AVATAR</a>·
      <a onClick={() => goto('nfts')} style={{ cursor: 'pointer' }}>NFTS</a>·
      <a onClick={() => goto('account')} style={{ cursor: 'pointer' }}>SIGN IN</a>·
      <a onClick={() => goto('privacy')} style={{ cursor: 'pointer' }}>PRIVACY</a>·
      <a onClick={() => goto('terms')} style={{ cursor: 'pointer' }}>TERMS</a>
    </div>
  </footer>
);

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
