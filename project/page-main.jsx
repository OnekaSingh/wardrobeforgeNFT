/* ============= Pages ============= */

const { useState, useEffect, useMemo } = React;

/* ----- Helpers ----- */
const NFTArt = ({ nft, scale = 5, mode = 'inventory', style = {} }) => {
  const imageGearMap = window.IMAGE_GEAR_MAP || {};
  const imageGear = nft?.art ? imageGearMap[nft.art] : null;
  const imageSrc = mode === 'avatar' ? imageGear?.avatarSrc : imageGear?.inventorySrc;

  if (imageSrc) {
    return (
      <img
        src={imageSrc}
        alt={nft?.name || nft?.art || 'NFT artwork'}
        loading="lazy"
        decoding="async"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          imageRendering: 'pixelated',
          display: 'block',
          ...style,
        }}
      />
    );
  }

  if (!nft?.art) return null;
  return <ClothingArt id={nft.art} scale={scale} style={style} />;
};

const NFTCard = ({ nft, onClick, owned }) => {
  const ribbonColor = nft.rarity === 'Legendary' ? '' : nft.rarity === 'Epic' ? 'purple' : nft.rarity === 'Rare' ? 'mint' : 'gold';
  return (
    <div className="nft-card pxl-box" onClick={onClick}>
      <div className={`ribbon ${ribbonColor}`}>{nft.rarity}</div>
      <div className="nft-thumb dither-bg" style={{ marginBottom: 12 }}>
        <div style={{ position: 'relative' }}>
          <NFTArt nft={nft} scale={5} />
        </div>
        {owned === false && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(42,27,27,.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'PressStart, monospace', fontSize: 10, color: '#fff', letterSpacing: '.06em',
          }}>
            ?? LOCKED ??
          </div>
        )}
      </div>
      <div className="pixel" style={{ fontSize: 12, marginBottom: 6 }}>{nft.name}</div>
      <div className="mono" style={{ fontSize: 16, opacity: .7, marginBottom: 8 }}>{nft.serial}</div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        <span className={`chip ${RARITY_COLOR[nft.rarity]}`}>{nft.fabric}</span>
        <span className="chip pink">{nft.fit}</span>
      </div>
    </div>
  );
};

/* ============= MAIN PAGE ============= */
const MainPage = ({ goto, currentUser }) => {
  const browsableCatalog = window.BROWSABLE_NFT_LIBRARY || NFT_LIBRARY;
  const featuredIds = ['NFT-OUTFIT-0003', 'NFT-BOOTS-0008', 'NFT-HEAD-0012', 'NFT-ITEM-0042'];
  const featured = featuredIds
    .map((id) => browsableCatalog.find((n) => n.id === id))
    .filter(Boolean);
  const monthlyTopAvatars = [
    { src: 'weekly/1010101.webp', name: 'Moon Bloom 01', serial: '#0101 / Monthly', tagA: 'Leaderboard', tagB: 'Monthly Top' },
    { src: 'weekly/1111.webp', name: 'Cloud Charm 11', serial: '#1111 / Monthly', tagA: 'Leaderboard', tagB: 'Monthly Top' },
    { src: 'weekly/111111112343.webp', name: 'Crown Pulse 23', serial: '#2343 / Monthly', tagA: 'Leaderboard', tagB: 'Monthly Top' },
    { src: 'weekly/22222.webp', name: 'Twilight Rune 22', serial: '#2222 / Monthly', tagA: 'Leaderboard', tagB: 'Monthly Top' },
    { src: 'weekly/33333.webp', name: 'Star Drift 33', serial: '#3333 / Monthly', tagA: 'Leaderboard', tagB: 'Monthly Top' },
    { src: 'weekly/4444.webp', name: 'Frost Nova 44', serial: '#4444 / Monthly', tagA: 'Leaderboard', tagB: 'Monthly Top' },
    { src: 'weekly/5555.webp', name: 'Velvet Arc 55', serial: '#5555 / Monthly', tagA: 'Leaderboard', tagB: 'Monthly Top' },
    { src: 'weekly/6666.webp', name: 'Silver Ember 66', serial: '#6666 / Monthly', tagA: 'Leaderboard', tagB: 'Monthly Top' },
  ];
  const wardrobeTarget = currentUser ? 'avatar' : 'account';
  const wardrobeLabel = currentUser ? 'ENTER WARDROBE' : 'CREATE ACCOUNT';

  return (
    <div>
      {/* HERO */}
      <section className="cloud-bg" style={{ position: 'relative', overflow: 'hidden', borderBottom: '4px solid var(--ink)' }}>
        <div className="page" style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 40, alignItems: 'center', minHeight: 540 }}>
          <div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
              <span className="chip coral">v0.4 BETA</span>
              <span className="chip">A WardrobeForge Product</span>
            </div>
            <h1 className="pixel" style={{ fontSize: 36, lineHeight: 1.15, marginBottom: 18 }}>
              Forge Your<br />
              <span style={{ color: 'var(--coral)', fontSize: 44 }}>Wardrobe.</span>
            </h1>
            <p style={{ fontSize: 22, marginBottom: 26, maxWidth: 520 }}>
              WardrobeForge mints NFT pieces for own VTO avatars. Claim ponts, roll for pieces,
              forge your wardrobe and build avatars.
            </p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <button
                className="pxl-btn"
                onClick={() => { window.location.href = 'https://wardrobeforge.com'; }}
                style={{
                  background: 'var(--ink)',
                  boxShadow: '0 -4px 0 0 var(--ink), 0 4px 0 0 var(--ink), -4px 0 0 0 var(--ink), 4px 0 0 0 var(--ink), 0 8px 0 0 var(--coral)',
                  whiteSpace: 'nowrap',
                }}
              >
                WardrobeForge
              </button>
              <button className="pxl-btn ghost" onClick={() => goto('nfts')}>BROWSE RELICS</button>
            </div>
            <div style={{ display: 'flex', gap: 28, marginTop: 36, flexWrap: 'wrap' }}>
              <AnimatedStat target={12000} prefix="+" k="THREADS MINTED" />
              <AnimatedStat target={2000} prefix="+" k="WARDROBES" />
              <AnimatedStat target={100} suffix="%" k="ANTI-COUNTERFEIT" />
            </div>
          </div>

          <div style={{ position: 'relative', minHeight: 460, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            {/* twinkle stars */}
            <PixelStar size={5} color="#FFE9A8" style={{ left: 20, top: 20 }} />
            <PixelStar size={4} color="#FFFFFF" style={{ left: '70%', top: 60 }} />
            <PixelStar size={3} color="#FFB8C8" style={{ left: '40%', top: 30 }} />
            <PixelStar size={4} color="#A8DEFF" style={{ right: 30, top: 100 }} />
            <SparkleDot color="#FFFFFF" size={3} style={{ left: '85%', top: '40%' }} />
            <SparkleDot color="#FFE9A8" size={3} style={{ left: '10%', top: '60%' }} />

            <div className="float" style={{ position: 'relative', display: 'inline-block' }}>
              <img
                src="trio.webp?v=2"
                alt="WardrobeForge trio"
                decoding="async"
                style={{
                  display: 'block',
                  width: 500,
                  height: 'auto',
                  imageRendering: 'pixelated',
                }}
              />
              <button
                className="pxl-btn"
                onClick={() => goto('account')}
                style={{
                  position: 'absolute',
                  right: 16,
                  bottom: 72,
                  padding: '22px 30px',
                  fontSize: 18,
                }}
              >
                Try Now!
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="page">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 32, flexWrap: 'wrap' }}>
          <h2 className="pixel" style={{ fontSize: 22 }}>HOW IT WORKS</h2>
          <span className="mono" style={{ fontSize: 18, opacity: .6 }}>// four steps, one wardrobe</span>
        </div>
        <div className="grid cols-4">
          <Step n="01" title="SIGN UP" body="Create an account and get started with NFTs." />
          <Step n="02" title="ROLL THE DICE" body="Roll for different NFTs with your VTO points. New accounts get free points, and come back to claim your free points daily!" />
          <Step n="03" title="UNLOCK A RELIC" body="Each NFT rolls a unique virtual relic — staff, helm, cloak, orb — with its own NFT ID. Roll a dupe? No problem. Dupes increase your star power and overall avatar XP. Top up and recieve a free, random NFT gift with your purchase." />
          <Step n="04" title="EARN + EQUIP" body="Create avatars with your relic, and post your creations for a chance to win free VTO points if you make the leaderboard." />
        </div>
      </section>

      {/* FEATURED RELICS */}
      <section className="page" style={{ paddingTop: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <h2 className="pixel" style={{ fontSize: 22 }}>FEATURED RELICS</h2>
          <span className="mono" style={{ fontSize: 18, opacity: .6 }}>// rolling now</span>
          <span style={{ marginLeft: 'auto' }}>
            <button className="pxl-btn ghost" onClick={() => goto('nfts')}>VIEW ALL ?</button>
          </span>
        </div>
        <div className="grid cols-4">
          {featured.map(n => <NFTCard key={n.id} nft={n} onClick={() => goto('nfts', n.id)} />)}
        </div>
      </section>

      {/* WHY IT WORKS */}
      <section className="page" style={{ paddingTop: 0 }}>
        <div className="pxl-box why-wardrobe-card" style={{ background: 'var(--ink)', color: '#fff', padding: 36, position: 'relative', overflow: 'hidden' }}>
          {/* decorative pixel hearts */}
          <PixelHeart size={5} color="#F85646" style={{ right: 40, top: 30 }} />
          <PixelHeart size={3} color="#FFB8C8" style={{ right: 90, top: 80 }} />
          <PixelHeart size={4} color="#FFE9A8" style={{ right: 20, top: 130 }} />

          <div className="why-wardrobe-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
            <div className="why-wardrobe-copy" style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 24, alignItems: 'start' }}>
              <div className="why-wardrobe-visual" style={{ display: 'flex', justifyContent: 'center' }}>
                <img
                  src="heal.webp"
                  alt="WardrobeForge heal icon"
                  loading="lazy"
                  decoding="async"
                  style={{
                    display: 'block',
                    width: 220,
                    height: 'auto',
                    imageRendering: 'pixelated',
                  }}
                />
              </div>
              <div className="why-wardrobe-body" style={{ paddingLeft: 10 }}>
                <h2 className="pixel" style={{ fontSize: 22, color: 'var(--coral-soft)', marginBottom: 14 }}>WHY WARDROBEFORGE</h2>
                <p style={{ fontSize: 22, lineHeight: 1.4, marginBottom: 14 }}>
                  WardrobeForge is built around a
                  <b style={{ color: 'var(--pink-neon)' }}> fully digital collectible wardrobe </b>
                  where every roll can unlock a new relic, boost your avatar, and give you more ways to play.
                </p>
                <p style={{ fontSize: 20, opacity: .8 }}>
                  Collect, equip, level up, and show off your best looks. The fun comes from the hunt,
                  the rarity, the dupes turning into progression, and the chance to earn more VTO by creating.
                </p>
              </div>
            </div>
            <ul className="why-wardrobe-points" style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <BulletPoint icon="?" t="ROLL + COLLECT" b="Spend VTO points to roll for new NFTs and expand your digital wardrobe." />
              <BulletPoint icon="?" t="BUILD YOUR AVATAR" b="Equip your relics, mix pieces together, and create standout looks in the avatar lab." />
              <BulletPoint icon="?" t="DUPES = PROGRESS" b="Duplicate rolls are still valuable, boosting star power and helping grow your avatar XP." />
              <BulletPoint icon="?" t="EARN MORE VTO" b="Come back daily, climb the leaderboard, and top up for more chances to unlock rare pieces." />
            </ul>
          </div>
        </div>
      </section>

      {/* MONTHLY TOP AVATARS */}
      <section className="page monthly-top-section" style={{ paddingTop: 0 }}>
        <div className="monthly-top-shell">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <h2 className="pixel" style={{ fontSize: 22 }}>This Month&apos;s Top Avatars</h2>
            <span className="mono" style={{ fontSize: 18, opacity: .7 }}>// monthly favorites in rotation</span>
          </div>

          <div className="avatar-orbit-stage">
            <div className="avatar-orbit-track">
              <div className="avatar-orbit-spacer" aria-hidden="true" />
              {[...monthlyTopAvatars, ...monthlyTopAvatars].map((avatar, index) => (
                <figure key={`${avatar.src}-${index}`} className="avatar-orbit-card nft-card pxl-box">
                  <div className="avatar-orbit-ribbon ribbon mint">Top Avatar</div>
                  <div className="avatar-orbit-thumb nft-thumb">
                    <img src={avatar.src} alt={avatar.name} />
                  </div>
                  <div className="pixel avatar-orbit-name">{avatar.name}</div>
                  <div className="mono avatar-orbit-serial">{avatar.serial}</div>
                  <div className="avatar-orbit-meta">
                    <span className="chip sky">{avatar.tagA}</span>
                    <span className="chip pink">{avatar.tagB}</span>
                  </div>
                </figure>
              ))}
              <div className="avatar-orbit-spacer" aria-hidden="true" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="page" style={{ textAlign: 'center', paddingTop: 0 }}>
        <h2 className="pixel" style={{ fontSize: 26, marginBottom: 14 }}>READY TO SUIT UP?</h2>
        <p className="mono" style={{ fontSize: 22, opacity: .7, marginBottom: 22 }}>Press start. The forge is open.</p>
        <button className="pxl-btn" onClick={() => goto(wardrobeTarget)}>{currentUser ? 'OPEN MY WARDROBE' : 'SIGN UP TO START'}</button>
        <span className="blink" style={{ display: 'inline-block', marginLeft: 14, fontFamily: 'PressStart', fontSize: 14, color: 'var(--coral)' }}>?</span>
      </section>
    </div>
  );
};

const AnimatedStat = ({ target, k, prefix = '', suffix = '', duration = 1400 }) => {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let frameId = 0;
    const startTime = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * easedProgress));

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [duration, target]);

  return (
    <div>
      <div className="pixel" style={{ fontSize: 22, color: 'var(--coral)' }}>
        {prefix}{value.toLocaleString('en-US')}{suffix}
      </div>
      <div className="pixel" style={{ fontSize: 9, opacity: .7, marginTop: 4 }}>{k}</div>
    </div>
  );
};

const Step = ({ n, title, body }) => (
  <div className="pxl-box" style={{ padding: 18, background: '#fff' }}>
    <div className="pixel" style={{ fontSize: 28, color: 'var(--coral)', marginBottom: 10 }}>{n}</div>
    <div className="pixel" style={{ fontSize: 12, marginBottom: 10 }}>{title}</div>
    <div style={{ fontSize: 18, lineHeight: 1.4 }}>{body}</div>
  </div>
);

const BulletPoint = ({ icon, t, b }) => (
  <li style={{ display: 'grid', gridTemplateColumns: '36px 1fr', gap: 12, alignItems: 'flex-start' }}>
    <div className="pixel" style={{ fontSize: 18, color: 'var(--coral-soft)' }}>{icon}</div>
    <div>
      <div className="pixel" style={{ fontSize: 11, marginBottom: 4, color: 'var(--pink-neon)' }}>{t}</div>
      <div style={{ fontSize: 18, opacity: .85 }}>{b}</div>
    </div>
  </li>
);

window.MainPage = MainPage;
window.NFTCard = NFTCard;
window.NFTArt = NFTArt;
