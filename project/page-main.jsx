/* ============= Pages ============= */

const { useState, useEffect, useMemo } = React;

/* ----- Helpers ----- */
const NFTCard = ({ nft, onClick, owned }) => {
  const ribbonColor = nft.rarity === 'Legendary' ? '' : nft.rarity === 'Epic' ? 'purple' : nft.rarity === 'Rare' ? 'mint' : 'gold';
  return (
    <div className="nft-card pxl-box" onClick={onClick}>
      <div className={`ribbon ${ribbonColor}`}>{nft.rarity}</div>
      <div className="nft-thumb dither-bg" style={{ marginBottom: 12 }}>
        <div style={{ position: 'relative' }}>
          <ClothingArt id={nft.art} scale={5} />
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
const MainPage = ({ goto }) => {
  const featured = NFT_LIBRARY.filter(n => ['NFT-0001', 'NFT-0005', 'NFT-0008', 'NFT-0010'].includes(n.id));

  return (
    <div>
      {/* HERO */}
      <section className="cloud-bg" style={{ position: 'relative', overflow: 'hidden', borderBottom: '4px solid var(--ink)' }}>
        <div className="page" style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 40, alignItems: 'center', minHeight: 540 }}>
          <div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
              <span className="chip coral">v0.4 BETA</span>
              <span className="chip">EVERY THREAD, A TWIN</span>
            </div>
            <h1 className="pixel" style={{ fontSize: 36, lineHeight: 1.15, marginBottom: 18 }}>
              WEAR IT IRL.<br />
              <span style={{ color: 'var(--coral)' }}>WIELD IT</span> ONLINE.
            </h1>
            <p style={{ fontSize: 22, marginBottom: 26, maxWidth: 520 }}>
              WardrobeForge mints an <b>NFT twin</b> for every physical garment we ship.
              Buy a hoodie, unlock a pixel-art relic, equip it on your avatar, and earn 100 points
              in our virtual try-on app.
            </p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <button className="pxl-btn" onClick={() => goto('avatar')}>ENTER WARDROBE</button>
              <button className="pxl-btn ghost" onClick={() => goto('nfts')}>BROWSE RELICS</button>
            </div>
            <div style={{ display: 'flex', gap: 28, marginTop: 36, flexWrap: 'wrap' }}>
              <Stat n="12,400" k="THREADS MINTED" />
              <Stat n="2,138" k="WARDROBES" />
              <Stat n="100%" k="ANTI-COUNTERFEIT" />
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

            <div className="float">
              <img
                src="avatar.png?v=3"
                alt="WardrobeForge avatar"
                style={{
                  display: 'block',
                  width: 210,
                  height: 'auto',
                  imageRendering: 'pixelated',
                }}
              />
            </div>

            {/* cloud platform */}
            <div style={{
              position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)',
              width: 220, height: 40,
              background: '#FFFFFF',
              borderRadius: '50%',
              boxShadow: '0 6px 0 0 rgba(42,27,27,.15)',
              opacity: .9,
            }} />
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
          <Step n="01" title="BUY THE PIECE" body="Order any garment from our IRL drop. Ships in 3–5 days, in a recycled mailer." />
          <Step n="02" title="MINT THE TWIN" body="A pixel-art NFT twin is forged on-chain and lands in your WardrobeForge inventory." />
          <Step n="03" title="UNLOCK A RELIC" body="Each NFT rolls a unique virtual relic — staff, helm, cloak, orb — with its own ID and serial." />
          <Step n="04" title="EARN + EQUIP" body="Wear it on your avatar, port it across worlds, and bank 100 points in our VTO AI app." />
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
        <div className="pxl-box" style={{ background: 'var(--ink)', color: '#fff', padding: 36, position: 'relative', overflow: 'hidden' }}>
          {/* decorative pixel hearts */}
          <PixelHeart size={5} color="#F85646" style={{ right: 40, top: 30 }} />
          <PixelHeart size={3} color="#FFB8C8" style={{ right: 90, top: 80 }} />
          <PixelHeart size={4} color="#FFE9A8" style={{ right: 20, top: 130 }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
            <div>
              <h2 className="pixel" style={{ fontSize: 22, color: 'var(--coral-soft)', marginBottom: 14 }}>WHY THIS WORKS</h2>
              <p style={{ fontSize: 22, lineHeight: 1.4, marginBottom: 14 }}>
                Counterfeit goods cost the apparel industry $50B+ a year. We solve it by making the
                <b style={{ color: 'var(--pink-neon)' }}> proof of authenticity </b>
                more fun than the bootleg.
              </p>
              <p style={{ fontSize: 20, opacity: .8 }}>
                Every NFT twin doubles as a passport: scan, verify, equip, earn. The collector knows
                it's real. The avatar knows it's rare. The wardrobe never lies.
              </p>
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <BulletPoint icon="?" t="ANTI-COUNTERFEIT" b="On-chain receipt tied to a serial woven into the garment." />
              <BulletPoint icon="?" t="VIRTUAL TRY-ON" b="Render any owned item on your chibi in the avatar lab." />
              <BulletPoint icon="?" t="100 POINTS / NFT" b="Drop into our Wardrobe VTO AI app and stack them." />
              <BulletPoint icon="?" t="PORTABLE" b="Wearable in any partner world. ERC-1155 baseline." />
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="page" style={{ textAlign: 'center', paddingTop: 0 }}>
        <h2 className="pixel" style={{ fontSize: 26, marginBottom: 14 }}>READY TO SUIT UP?</h2>
        <p className="mono" style={{ fontSize: 22, opacity: .7, marginBottom: 22 }}>Press start. The forge is open.</p>
        <button className="pxl-btn" onClick={() => goto('avatar')}>OPEN MY WARDROBE</button>
        <span className="blink" style={{ display: 'inline-block', marginLeft: 14, fontFamily: 'PressStart', fontSize: 14, color: 'var(--coral)' }}>?</span>
      </section>
    </div>
  );
};

const Stat = ({ n, k }) => (
  <div>
    <div className="pixel" style={{ fontSize: 22, color: 'var(--coral)' }}>{n}</div>
    <div className="pixel" style={{ fontSize: 9, opacity: .7, marginTop: 4 }}>{k}</div>
  </div>
);

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
