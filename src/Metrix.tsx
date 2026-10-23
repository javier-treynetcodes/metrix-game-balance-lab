import React, { useEffect, useState, useMemo, useRef } from "react";
import axios from "axios";
import "./css/metrix.css";

const TYPE_COLORS: Record<string, string> = {
  normal: '#9099A1', fire: '#FF9D55', water: '#4D90D5', grass: '#63BC5A',
  electric: '#F4D23C', ice: '#74CEC0', fighting: '#CE4069', poison: '#AB6AC8',
  ground: '#D97845', flying: '#8FA8DD', psychic: '#F97176', bug: '#91C12F',
  rock: '#C5B78C', ghost: '#5269AC', dragon: '#0B6DC3', dark: '#5A5465',
  steel: '#5A8EA2', fairy: '#EC8FE6',
};

const STAT_LABELS: Record<string, string> = {
  'hp': 'HP', 'attack': 'Atk', 'defense': 'Def',
  'special-attack': 'Sp.Atk', 'special-defense': 'Sp.Def', 'speed': 'Speed',
};

const getIdFromUrl = (url: string): number => {
  const parts = url.split('/').filter(Boolean);
  return parseInt(parts[parts.length - 1]);
};

const capitalize = (s: string) =>
  s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

const getStatColor = (value: number): string => {
  if (value < 50)  return '#f87171';
  if (value < 80)  return '#fb923c';
  if (value < 100) return '#facc15';
  if (value < 120) return '#34d399';
  return '#00f0ff';
};

const REGIONS = [
  { name: 'Kanto',  gen: 'I',    min: 1,   max: 151  },
  { name: 'Johto',  gen: 'II',   min: 152, max: 251  },
  { name: 'Hoenn',  gen: 'III',  min: 252, max: 386  },
  { name: 'Sinnoh', gen: 'IV',   min: 387, max: 493  },
  { name: 'Unova',  gen: 'V',    min: 494, max: 649  },
  { name: 'Kalos',  gen: 'VI',   min: 650, max: 721  },
  { name: 'Alola',  gen: 'VII',  min: 722, max: 809  },
  { name: 'Galar',  gen: 'VIII', min: 810, max: 905  },
  { name: 'Paldea', gen: 'IX',   min: 906, max: 1025 },
];

interface PokemonListEntry { name: string; url: string; }
interface AbilityDetail { name: string; description: string; isHidden: boolean; }
interface TypeOffense {
  double_damage_to: string[];
  half_damage_to: string[];
  no_damage_to: string[];
}

const Metrix: React.FC = () => {
  const [allPokemon, setAllPokemon]       = useState<PokemonListEntry[]>([]);
  const [search, setSearch]               = useState('');
  const [region, setRegion]               = useState<typeof REGIONS[number] | null>(null);
  const [selected, setSelected]           = useState<any>(null);
  const [abilities, setAbilities]         = useState<AbilityDetail[]>([]);
  const [typeOffense, setTypeOffense]     = useState<Record<string, TypeOffense>>({});
  const [loadingList, setLoadingList]     = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const listWrapRef = useRef<HTMLDivElement>(null);
  const detailRef   = useRef<HTMLElement>(null);

  useEffect(() => {
    axios.get('https://pokeapi.co/api/v2/pokemon?limit=1302')
      .then(res => {
        setAllPokemon(res.data.results);
        setLoadingList(false);
        fetchDetail('https://pokeapi.co/api/v2/pokemon/1/');
      })
      .catch(() => setLoadingList(false));
  }, []);

  const fetchDetail = async (url: string) => {
    setLoadingDetail(true);
    setAbilities([]);
    setTypeOffense({});
    try {
      const res = await axios.get(url);
      setSelected(res.data);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    if (!selected) return;
    Promise.all(
      selected.abilities.map(async (a: any) => {
        const res   = await axios.get(a.ability.url);
        const entry = res.data.effect_entries.find((e: any) => e.language.name === 'en');
        return {
          name: capitalize(a.ability.name),
          description: entry?.short_effect ?? 'No description available.',
          isHidden: a.is_hidden,
        };
      })
    ).then(setAbilities);
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    setTypeOffense({});
    selected.types.forEach(async (t: any) => {
      try {
        const res = await axios.get(t.type.url);
        const dr = res.data.damage_relations;
        setTypeOffense(prev => ({
          ...prev,
          [t.type.name]: {
            double_damage_to: dr.double_damage_to.map((x: any) => x.name),
            half_damage_to:   dr.half_damage_to.map((x: any) => x.name),
            no_damage_to:     dr.no_damage_to.map((x: any) => x.name),
          },
        }));
      } catch {
        // silently ignore fetch errors per type
      }
    });
  }, [selected]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let pool = allPokemon;
    if (region) pool = pool.filter(p => { const id = getIdFromUrl(p.url); return id >= region.min && id <= region.max; });
    if (!q) return pool;
    return pool.filter(p => p.name.includes(q) || getIdFromUrl(p.url).toString() === q);
  }, [allPokemon, search, region]);

  const handleRegion = (r: typeof REGIONS[number]) => {
    setRegion(prev => prev?.name === r.name ? null : r);
    setSearch('');
  };

  useEffect(() => {
    const detail = detailRef.current;
    const list   = listWrapRef.current;
    if (!detail || !list) return;

    const observer = new ResizeObserver(() => {
      list.style.maxHeight = `${detail.offsetHeight}px`;
    });
    observer.observe(detail);
    return () => observer.disconnect();
  }, []);

  const bst = selected?.stats.reduce((s: number, x: any) => s + x.base_stat, 0) ?? 0;

  const id = selected?.id;
  const artwork =
    selected?.sprites?.other?.['official-artwork']?.front_default ||
    selected?.sprites?.other?.home?.front_default ||
    (id ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/other/official-artwork/${id}.png` : '');

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.style.opacity = '0';
  };

  return (
    <div className="pmx-page">

      <div className="page-focus-blur" aria-hidden="true" />

      <nav className="pmx-nav">
        <span className="pmx-nav-brand">
          Poke<span className="pmx-nav-cyan">Métrix</span>
        </span>
        <span className="pmx-nav-sub">Fan-made Pokédex · PokéAPI</span>
      </nav>

      <div className="pmx-container">

        <header className="pmx-header">
          <h1 className="pmx-title">Poke<span>Métrix</span></h1>
          <div className="pmx-search-wrap">
            <i className="bi bi-search pmx-search-icon" />
            <input
              className="pmx-search"
              type="text"
              placeholder="Search by name or number..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoComplete="off"
            />
            {search && (
              <button className="pmx-search-clear" onClick={() => setSearch('')} aria-label="Clear">
                <i className="bi bi-x" />
              </button>
            )}
          </div>
        </header>

        <div className="pmx-regions">
          {REGIONS.map(r => (
            <button
              key={r.name}
              className={`pmx-region-btn ${region?.name === r.name ? 'is-active' : ''}`}
              onClick={() => handleRegion(r)}
            >
              <span className="pmx-region-gen">Gen {r.gen}</span>
              <span className="pmx-region-name">{r.name}</span>
            </button>
          ))}
        </div>

        <div className="pmx-main">

          <div className="pmx-list-wrap border-static" ref={listWrapRef}>
            <aside className="pmx-list">
              {loadingList ? (
                <div className="pmx-list-msg">Loading Pokédex…</div>
              ) : filtered.length === 0 ? (
                <div className="pmx-list-msg">No results</div>
              ) : (
                filtered.map(p => {
                  const pid = getIdFromUrl(p.url);
                  return (
                    <button
                      key={pid}
                      className={`pmx-list-item ${selected?.id === pid ? 'is-selected' : ''}`}
                      onClick={() => fetchDetail(p.url)}
                    >
                      <img
                        className="pmx-list-sprite"
                        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pid}.png`}
                        alt={p.name}
                        loading="lazy"
                        onError={handleImgError}
                      />
                      <span className="pmx-list-num">#{pid.toString().padStart(4, '0')}</span>
                      <span className="pmx-list-name">{capitalize(p.name)}</span>
                    </button>
                  );
                })
              )}
              {!loadingList && !search && !region && (
                <p className="pmx-list-hint">Filter by region or search among {allPokemon.length} Pokémon</p>
              )}
            </aside>
          </div>

          <section className="pmx-detail" ref={detailRef}>

            {loadingDetail && (
              <div className="pmx-loading">
                <div className="pmx-spinner" />
              </div>
            )}

            {selected && !loadingDetail && (
              <>
                <div className="pmx-hero border-static">
                  <div className="pmx-artwork-wrap">
                    {artwork && (
                      <img
                        className="pmx-artwork"
                        src={artwork}
                        alt={selected.name}
                        onError={handleImgError}
                      />
                    )}
                  </div>
                  <div className="pmx-hero-info">
                    <span className="pmx-number">#{selected.id.toString().padStart(4, '0')}</span>
                    <h2 className="pmx-name">{capitalize(selected.name)}</h2>
                    <div className="pmx-types">
                      {selected.types.map((t: any) => (
                        <span key={t.type.name} className="pmx-type-badge" style={{ background: TYPE_COLORS[t.type.name] }}>
                          {capitalize(t.type.name)}
                        </span>
                      ))}
                    </div>
                    <div className="pmx-meta">
                      <div className="pmx-meta-item">
                        <span className="pmx-meta-label">Height</span>
                        <span className="pmx-meta-value">{(selected.height / 10).toFixed(1)} m</span>
                      </div>
                      <div className="pmx-meta-item">
                        <span className="pmx-meta-label">Weight</span>
                        <span className="pmx-meta-value">{(selected.weight / 10).toFixed(1)} kg</span>
                      </div>
                      <div className="pmx-meta-item">
                        <span className="pmx-meta-label">Base Exp.</span>
                        <span className="pmx-meta-value">{selected.base_experience ?? '—'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pmx-section border-static">
                  <div className="pmx-section-header">
                    <h3 className="pmx-section-title">Base Stats</h3>
                    <span className="pmx-bst">BST <strong>{bst}</strong></span>
                  </div>
                  <div className="pmx-stats">
                    {selected.stats.map((s: any) => {
                      const color = getStatColor(s.base_stat);
                      const pct   = Math.min((s.base_stat / 255) * 100, 100);
                      return (
                        <div key={s.stat.name} className="pmx-stat-row">
                          <span className="pmx-stat-label">{STAT_LABELS[s.stat.name] ?? s.stat.name}</span>
                          <span className="pmx-stat-val" style={{ color }}>{s.base_stat}</span>
                          <div className="pmx-stat-bar-bg">
                            <div
                              className="pmx-stat-bar-fill"
                              style={{ '--pct': `${pct}%`, '--color': color } as React.CSSProperties}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {abilities.length > 0 && (
                  <div className="pmx-section border-static">
                    <h3 className="pmx-section-title">Abilities</h3>
                    <div className="pmx-abilities">
                      {abilities.map((a, i) => (
                        <div key={i} className={`pmx-ability ${a.isHidden ? 'is-hidden' : ''}`}>
                          <div className="pmx-ability-name">
                            {a.name}
                            {a.isHidden && <span className="pmx-ability-tag">Hidden</span>}
                          </div>
                          <p className="pmx-ability-desc">{a.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pmx-section border-static">
                  <h3 className="pmx-section-title">Offensive Effectiveness</h3>
                  <div className="pmx-effectiveness">
                    {selected.types.map((t: any) => {
                      const typeName = t.type.name;
                      const data = typeOffense[typeName];
                      return (
                        <div key={typeName} className="pmx-offense-block">
                          {selected.types.length > 1 && (
                            <span className="pmx-type-badge pmx-offense-type" style={{ background: TYPE_COLORS[typeName] }}>
                              {capitalize(typeName)}
                            </span>
                          )}
                          {!data ? (
                            <p className="pmx-eff-neutral">Loading…</p>
                          ) : (
                            <>
                              {data.double_damage_to.length > 0 && (
                                <div className="pmx-eff-row">
                                  <span className="pmx-eff-label pmx-eff-x2">×2</span>
                                  <div className="pmx-eff-types">
                                    {data.double_damage_to.map(n => (
                                      <span key={n} className="pmx-type-badge" style={{ background: TYPE_COLORS[n] }}>{capitalize(n)}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {data.half_damage_to.length > 0 && (
                                <div className="pmx-eff-row">
                                  <span className="pmx-eff-label pmx-eff-half">×½</span>
                                  <div className="pmx-eff-types">
                                    {data.half_damage_to.map(n => (
                                      <span key={n} className="pmx-type-badge pmx-type-dim" style={{ background: TYPE_COLORS[n] }}>{capitalize(n)}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {data.no_damage_to.length > 0 && (
                                <div className="pmx-eff-row">
                                  <span className="pmx-eff-label pmx-eff-immune">×0</span>
                                  <div className="pmx-eff-types">
                                    {data.no_damage_to.map(n => (
                                      <span key={n} className="pmx-type-badge pmx-type-immune" style={{ background: TYPE_COLORS[n] }}>{capitalize(n)}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {data.double_damage_to.length === 0 && data.half_damage_to.length === 0 && data.no_damage_to.length === 0 && (
                                <p className="pmx-eff-neutral">Neutral effectiveness against all types</p>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      <footer className="pmx-footer">
        <p>PokeMétrix · Fan-made project by Javier García</p>
        <p className="pmx-footer-legal">Pokémon and all related names are trademarks of Nintendo / Game Freak. This project is not affiliated with or endorsed by The Pokémon Company.</p>
      </footer>
    </div>
  );
};

export default Metrix;
