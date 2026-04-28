/* ============= NFTs catalog page (split detail) ============= */

const NFTsPage = ({ initialId }) => {
  const [selectedId, setSelectedId] = useState(initialId || NFT_LIBRARY[0].id);
  const [filter, setFilter] = useState('All');
  const [rarity, setRarity] = useState('All');

  const selected = NFT_LIBRARY.find(n => n.id === selectedId);

  const filtered = NFT_LIBRARY.filter(n => {
    if (filter !== 'All' && n.slot !== filter.toLowerCase()) return false;
    if (rarity !== 'All' && n.rarity !== rarity) return false;
    return true;
  });

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <h1 className="pixel" style={{ fontSize: 26 }}>CLOTHING NFTS</h1>
        <span className="mono" style={{ fontSize: 20, opacity: .6 }}>// the relics you might roll</span>
      </div>

      {/* Filter bar */}
      <div className="pxl-box" style={{ background: '#fff', padding: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center' }}>
          <FilterGroup label="SLOT" value={filter} onChange={setFilter} options={['All', 'Head', 'Outfit', 'Item', 'Boots']} />
          <FilterGroup label="RARITY" value={rarity} onChange={setRarity} options={['All', 'Common', 'Rare', 'Epic', 'Legendary']} />
          <span style={{ marginLeft: 'auto' }} className="mono">{filtered.length} relics</span>
        </div>
      </div>

      {/* SPLIT VIEW */}
      <div className="pxl-box no-drop" style={{ background: '#fff' }}>
        <div className="split">
          {/* LEFT — clothing artwork BIG */}
          <div className="dither-bg scanlines" style={{ padding: 36, position: 'relative', minHeight: 540, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '4px solid var(--ink)' }}>
            <div style={{ position: 'relative' }}>
              {/* twinkles */}
              <PixelStar size={3} color="#FFE9A8" style={{ left: -30, top: -10 }} />
              <PixelStar size={2} color="#F85646" style={{ right: -20, top: 30 }} />
              <SparkleDot color="#FFFFFF" size={3} style={{ left: -10, bottom: 40 }} />

              <div className="float">
                <ClothingArt id={selected.art} scale={12} />
              </div>
            </div>

            {/* corner ribbon */}
            <div style={{ position: 'absolute', top: 16, left: 16 }}>
              <span className={`chip ${RARITY_COLOR[selected.rarity]}`} style={{ fontSize: 10 }}>{selected.rarity.toUpperCase()}</span>
              <span className="chip" style={{ marginLeft: 6, fontSize: 10 }}>{selected.slot.toUpperCase()}</span>
            </div>
            <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, display: 'flex', justifyContent: 'space-between' }} className="pixel">
              <span style={{ fontSize: 11 }}>{selected.id}</span>
              <span style={{ fontSize: 11, color: 'var(--coral)' }}>{selected.serial}</span>
            </div>
          </div>

          {/* RIGHT — stats */}
          <div style={{ padding: 32 }}>
            <div className="pixel" style={{ fontSize: 11, color: 'var(--coral)', marginBottom: 6 }}>{selected.slot.toUpperCase()} · {selected.rarity.toUpperCase()}</div>
            <h2 className="pixel" style={{ fontSize: 20, marginBottom: 6 }}>{selected.name}</h2>
            <div className="mono" style={{ fontSize: 18, opacity: .7, marginBottom: 16 }}>{selected.serial}</div>

            <p className="mono" style={{ fontSize: 19, marginBottom: 22, padding: '12px 14px', background: 'var(--paper-2)', borderLeft: '4px solid var(--coral)' }}>
              "{selected.lore}"
            </p>

            <div style={{ marginBottom: 20 }}>
              <div className="pixel" style={{ fontSize: 11, marginBottom: 8, color: 'var(--ink)' }}>STATS</div>
              <div className="stat-row"><span className="stat-key">FABRIC</span><span className="stat-val">{selected.fabric}</span></div>
              <div className="stat-row"><span className="stat-key">FIT</span><span className="stat-val">{selected.fit}</span></div>
              <div className="stat-row"><span className="stat-key">FINISH</span><span className="stat-val">{selected.finish}</span></div>
              <div className="stat-row"><span className="stat-key">COLOR</span><span className="stat-val">{selected.color}</span></div>
              <div className="stat-row"><span className="stat-key">MINT</span><span className="stat-val" style={{ color: 'var(--coral)', fontFamily: 'PressStart, monospace', fontSize: 12 }}>{selected.mint.toUpperCase()}</span></div>
            </div>

            <div className="pxl-box no-drop" style={{ background: 'var(--ink)', color: '#fff', padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div className="pixel" style={{ fontSize: 10, color: 'var(--pink-neon)' }}>VTO BONUS</div>
                <div className="pixel" style={{ fontSize: 18, color: 'var(--coral-soft)' }}>+{selected.pointsBonus} PTS</div>
              </div>
              <div className="bar"><i style={{ width: `${(selected.pointsBonus / 250) * 100}%` }} /></div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
              {selected.owned ? (
                <>
                  <button className="pxl-btn">EQUIP ON AVATAR</button>
                  <button className="pxl-btn ghost">VIEW ON-CHAIN ?</button>
                </>
              ) : (
                <>
                  <button className="pxl-btn">BUY THE GARMENT</button>
                  <button className="pxl-btn ghost">HOW TO ROLL ?</button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CATALOG GRID below */}
      <div style={{ marginTop: 36 }}>
        <div className="pixel" style={{ fontSize: 14, marginBottom: 14 }}>BROWSE THE FORGE</div>
        <div className="grid cols-4">
          {filtered.map(n => (
            <div
              key={n.id}
              onClick={() => setSelectedId(n.id)}
              style={{
                position: 'relative',
                outline: n.id === selectedId ? '4px solid var(--coral)' : 'none',
                outlineOffset: 4,
              }}
            >
              <NFTCard nft={n} owned={n.owned} onClick={() => setSelectedId(n.id)} />
            </div>
          ))}
        </div>
      </div>

      {/* attribute legend */}
      <div className="pxl-box" style={{ background: '#fff', padding: 24, marginTop: 36 }}>
        <div className="pixel" style={{ fontSize: 14, marginBottom: 16 }}>ATTRIBUTE LEGEND</div>
        <div className="grid cols-3" style={{ gap: 18 }}>
          <Legend title="FABRIC" items={['Cotton', 'Denim', 'Leather', 'Silk', 'Techwear (nylon/poly)']} />
          <Legend title="FIT" items={['Oversized', 'Slim', 'Cropped', 'Structured']} />
          <Legend title="FINISH" items={['Matte', 'Glossy', 'Distressed', 'Washed', 'Reflective', 'Metallic threading']} />
          <Legend title="COLOR" items={['Solid', 'Gradients', 'Color-shifting (rare)', 'Pattern (camo/stripes/abstract)']} />
          <Legend title="MINT TIER" items={['Mint (brand new)', 'Worn (slight fade)', 'Vintage (high value)', 'Legendary (relic)']} />
          <Legend title="RARITY ROLL" items={['Common · 70%', 'Rare · 22%', 'Epic · 7%', 'Legendary · 1%']} />
        </div>
      </div>
    </div>
  );
};

const FilterGroup = ({ label, value, onChange, options }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <span className="pixel" style={{ fontSize: 10, opacity: .6 }}>{label}</span>
    <div className="opts">
      {options.map(o => (
        <button key={o} className={`opt ${value === o ? 'active' : ''}`} onClick={() => onChange(o)}>{o}</button>
      ))}
    </div>
  </div>
);

const Legend = ({ title, items }) => (
  <div>
    <div className="pixel" style={{ fontSize: 10, color: 'var(--coral)', marginBottom: 8 }}>{title}</div>
    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
      {items.map(i => (
        <li key={i} style={{ fontSize: 18, display: 'flex', gap: 6 }}><span style={{ color: 'var(--coral)' }}>?</span> {i}</li>
      ))}
    </ul>
  </div>
);

window.NFTsPage = NFTsPage;
