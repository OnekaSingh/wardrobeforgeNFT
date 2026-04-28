/* ============= App shell + router ============= */

const { useState: useStateApp, useEffect: useEffectApp } = React;

const App = () => {
  const [page, setPage] = useStateApp(() => {
    const h = window.location.hash.replace('#', '') || 'main';
    return h;
  });
  const [nftFocus, setNftFocus] = useStateApp(null);
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

  const goto = (p, focus) => {
    setPage(p);
    if (focus) setNftFocus(focus);
    window.location.hash = p;
    window.scrollTo(0, 0);
  };

  useEffectApp(() => {
    const onHash = () => setPage(window.location.hash.replace('#', '') || 'main');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav page={page} goto={goto} />

      <main style={{ flex: 1 }} className={tweaks.scanlines ? '' : 'no-scanlines'}>
        {page === 'main' && <MainPage goto={goto} />}
        {page === 'avatar' && <AvatarPage />}
        {page === 'nfts' && <NFTsPage initialId={nftFocus} />}
        {page === 'privacy' && <PrivacyPage />}
        {page === 'terms' && <TermsPage />}
      </main>

      <Footer goto={goto} />

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

const Nav = ({ page, goto }) => (
  <nav className="nav">
    <div className="logo" onClick={() => goto('main')}>
      <img src="assets/logo.png?v=2" alt="WardrobeForge" />
      <span>WARDROBE<span style={{ color: 'var(--coral)' }}>FORGE</span></span>
    </div>
    <div className="links">
      <div className={`link ${page === 'main' ? 'active' : ''}`} onClick={() => goto('main')}>HOME</div>
      <div className={`link ${page === 'avatar' ? 'active' : ''}`} onClick={() => goto('avatar')}>MY AVATAR</div>
      <div className={`link ${page === 'nfts' ? 'active' : ''}`} onClick={() => goto('nfts')}>CLOTHING NFTS</div>
      <div className={`link ${page === 'privacy' ? 'active' : ''}`} onClick={() => goto('privacy')}>PRIVACY</div>
      <div className={`link ${page === 'terms' ? 'active' : ''}`} onClick={() => goto('terms')}>TERMS</div>
      <button className="pxl-btn" style={{ marginLeft: 8 }} onClick={() => goto('avatar')}>CONNECT</button>
    </div>
  </nav>
);

const Footer = ({ goto }) => (
  <footer className="foot">
    <div style={{ marginBottom: 14 }}>? WARDROBEFORGE · 2026 · EVERY THREAD A TWIN</div>
    <div>
      <a onClick={() => goto('main')} style={{ cursor: 'pointer' }}>HOME</a>·
      <a onClick={() => goto('avatar')} style={{ cursor: 'pointer' }}>AVATAR</a>·
      <a onClick={() => goto('nfts')} style={{ cursor: 'pointer' }}>NFTS</a>·
      <a onClick={() => goto('privacy')} style={{ cursor: 'pointer' }}>PRIVACY</a>·
      <a onClick={() => goto('terms')} style={{ cursor: 'pointer' }}>TERMS</a>
    </div>
  </footer>
);

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
