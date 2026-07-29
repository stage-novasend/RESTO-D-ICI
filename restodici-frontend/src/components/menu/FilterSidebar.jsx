/* ═══════════════════════════════════════════════════════════════
   FilterSidebar.jsx — Sidebar dynamique de filtres (Style Yango Deli)
   Propose des filtres par catégorie, restaurant, tranche de prix,
   note minimale, frais de livraison, délai et options de tri.
   Adapté pour ordinateur (sticky) et mobile (drawer).
   ═══════════════════════════════════════════════════════════════ */
import { useState } from 'react';
import {
  SlidersHorizontal, X, RotateCcw, Star, Truck, Clock,
  DollarSign, Utensils, Check, ChevronDown, Flame, Sparkles
} from 'lucide-react';

const C = {
  accent:  '#EA580C',
  accentD: '#C2410C',
  accentL: '#FFF5E8',
  yellow:  '#FFB800',
  green:   '#22C55E',
  dark:    '#1A0C00',
  text:    '#3B2409',
  muted:   '#7A5E3A',
  mutedL:  '#B09070',
  card:    '#FFFFFF',
  bg:      '#FFF4ED',
  line:    'rgba(234,88,12,0.14)',
  shadow:  '0 8px 30px rgba(234,88,12,0.08)',
};

const sans = "'Manrope', 'Plus Jakarta Sans', system-ui, sans-serif";

const CAT_EMOJIS = {
  pizza: '🍕', burger: '🍔', sushi: '🍣', tacos: '🌮', poulet: '🍗',
  poisson: '🐟', riz: '🍚', salade: '🥗', dessert: '🍰', boisson: '🥤',
  brochette: '🥩', foutou: '🫙', soupe: '🍲', grillades: '🔥', sandwich: '🥪',
  plat: '🍽️', garba: '🍛', attiéké: '🍛', pasta: '🍝', yassa: '🍗'
};

function getCatEmoji(nom = '') {
  const k = nom.toLowerCase();
  for (const [w, e] of Object.entries(CAT_EMOJIS)) {
    if (k.includes(w)) return e;
  }
  return '🍽️';
}

export default function FilterSidebar({
  categories = [],
  activeCat = '__all__',
  onCatChange,
  restaurants = [],
  selectedRestoId = '__all__',
  onRestoChange,
  priceRange = '__all__',
  onPriceRangeChange,
  minRating = 0,
  onMinRatingChange,
  freeDeliveryOnly = false,
  onFreeDeliveryChange,
  fastDeliveryOnly = false,
  onFastDeliveryChange,
  sortBy = 'popular',
  onSortByChange,
  onReset,
  activeCount = 0,
  isOpenMobile = false,
  onCloseMobile,
}) {
  const [collapsedSections, setCollapsedSections] = useState({});

  const toggleSection = (key) => {
    setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const PRICE_OPTIONS = [
    { id: '__all__', label: 'Tous les prix' },
    { id: 'under_3000', label: '< 3 000 FCFA' },
    { id: '3000_6000', label: '3 000 – 6 000 FCFA' },
    { id: 'over_6000', label: '> 6 000 FCFA' },
  ];

  const SORT_OPTIONS = [
    { id: 'popular', label: '🔥 Plus populaires' },
    { id: 'rating', label: '⭐ Mieux notés' },
    { id: 'price_asc', label: '💰 Prix croissant' },
    { id: 'price_desc', label: '💎 Prix décroissant' },
    { id: 'time', label: '⏱️ Livraison rapide' },
  ];

  const sidebarContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: 20, fontFamily: sans }}>
      {/* En-tête filtres & reset */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, borderBottom: `1px solid ${C.line}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: C.accentL, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <SlidersHorizontal size={17} color={C.accent} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.dark }}>Filtres</h3>
            {activeCount > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, color: C.accent }}>
                {activeCount} filtre{activeCount > 1 ? 's' : ''} actif{activeCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {activeCount > 0 && (
          <button
            onClick={onReset}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: 'transparent', border: 'none', color: C.accent,
              fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: '4px 8px',
              borderRadius: 8, transition: 'background 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = C.accentL}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <RotateCcw size={13} /> Reset
          </button>
        )}
      </div>

      {/* 1. Tri & Classement */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div
          onClick={() => toggleSection('sort')}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
        >
          <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.muted }}>
            Classer par
          </span>
          <ChevronDown size={14} color={C.mutedL} style={{ transform: collapsedSections['sort'] ? 'rotate(-90deg)' : 'none', transition: 'transform 0.2s' }} />
        </div>

        {!collapsedSections['sort'] && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            {SORT_OPTIONS.map(opt => {
              const isActive = sortBy === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => onSortByChange(opt.id)}
                  style={{
                    padding: '7px 12px', borderRadius: 10,
                    border: `1.5px solid ${isActive ? C.accent : 'rgba(234,88,12,0.12)'}`,
                    background: isActive ? C.accent : C.card,
                    color: isActive ? '#fff' : C.text,
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    transition: 'all 0.15s', boxShadow: isActive ? `0 4px 12px ${C.accent}33` : 'none',
                    display: 'flex', alignItems: 'center', gap: 5
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ height: 1, background: C.line }} />

      {/* 2. Catégories de Plats */}
      {categories.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div
            onClick={() => toggleSection('cats')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
          >
            <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.muted }}>
              Catégories de plats
            </span>
            <ChevronDown size={14} color={C.mutedL} style={{ transform: collapsedSections['cats'] ? 'rotate(-90deg)' : 'none', transition: 'transform 0.2s' }} />
          </div>

          {!collapsedSections['cats'] && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 240, overflowY: 'auto', paddingRight: 4 }}>
              {categories.map(cat => {
                const catId = typeof cat === 'string' ? cat : cat.id;
                const catNom = typeof cat === 'string' ? cat : cat.nom;
                const count = typeof cat === 'object' ? cat.count : undefined;
                const isActive = activeCat === catId;

                return (
                  <button
                    key={catId}
                    onClick={() => onCatChange(catId)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px', borderRadius: 10, border: 'none',
                      background: isActive ? C.accentL : 'transparent',
                      color: isActive ? C.accentD : C.text,
                      fontSize: 13, fontWeight: isActive ? 800 : 600,
                      cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(234,88,12,0.05)'; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 15 }}>
                        {catId === '__all__' ? '🍽️' : getCatEmoji(catNom)}
                      </span>
                      {catNom}
                    </span>
                    {count !== undefined && (
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: isActive ? C.accent : 'rgba(0,0,0,0.05)', color: isActive ? '#fff' : C.muted }}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {categories.length > 0 && <div style={{ height: 1, background: C.line }} />}

      {/* 3. Filtre par Restaurant */}
      {restaurants.length > 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div
            onClick={() => toggleSection('resto')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
          >
            <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.muted }}>
              Restaurant
            </span>
            <ChevronDown size={14} color={C.mutedL} style={{ transform: collapsedSections['resto'] ? 'rotate(-90deg)' : 'none', transition: 'transform 0.2s' }} />
          </div>

          {!collapsedSections['resto'] && (
            <select
              value={selectedRestoId}
              onChange={e => onRestoChange(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10,
                border: `1.5px solid ${selectedRestoId !== '__all__' ? C.accent : C.line}`,
                background: C.card, color: C.text, fontFamily: sans, fontSize: 13,
                fontWeight: 600, outline: 'none', cursor: 'pointer'
              }}
            >
              <option value="__all__">Tous les restaurants ({restaurants.length})</option>
              {restaurants.map(r => (
                <option key={r.id} value={r.id}>{r.nom}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {restaurants.length > 1 && <div style={{ height: 1, background: C.line }} />}

      {/* 4. Fourchette de prix */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div
          onClick={() => toggleSection('price')}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
        >
          <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.muted }}>
            Fourchette de prix
          </span>
          <ChevronDown size={14} color={C.mutedL} style={{ transform: collapsedSections['price'] ? 'rotate(-90deg)' : 'none', transition: 'transform 0.2s' }} />
        </div>

        {!collapsedSections['price'] && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {PRICE_OPTIONS.map(opt => {
              const isActive = priceRange === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => onPriceRangeChange(opt.id)}
                  style={{
                    padding: '8px 10px', borderRadius: 10,
                    border: `1.5px solid ${isActive ? C.accent : 'rgba(234,88,12,0.12)'}`,
                    background: isActive ? C.accentL : C.card,
                    color: isActive ? C.accentD : C.text,
                    fontSize: 12, fontWeight: isActive ? 800 : 600, cursor: 'pointer',
                    transition: 'all 0.15s', textAlign: 'center'
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ height: 1, background: C.line }} />

      {/* 5. Services & Filtres rapides (Notes, Livraison) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.muted }}>
          Services & Qualité
        </span>

        {/* Note 4.0+ / 4.5+ */}
        <div style={{ display: 'flex', gap: 6 }}>
          {[0, 4.0, 4.5].map(rating => {
            const isActive = minRating === rating;
            return (
              <button
                key={rating}
                onClick={() => onMinRatingChange(rating)}
                style={{
                  flex: 1, padding: '7px 8px', borderRadius: 9,
                  border: `1.5px solid ${isActive ? C.yellow : C.line}`,
                  background: isActive ? '#FFFBEB' : C.card,
                  color: isActive ? '#B45309' : C.text,
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  transition: 'all 0.15s'
                }}
              >
                <Star size={12} fill={rating > 0 ? C.yellow : 'none'} color={C.yellow} />
                {rating === 0 ? 'Toutes' : `${rating}+`}
              </button>
            );
          })}
        </div>

        {/* Option Livraison gratuite */}
        <label
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '9px 12px', borderRadius: 10, background: freeDeliveryOnly ? '#F0FDF4' : C.card,
            border: `1.5px solid ${freeDeliveryOnly ? C.green : C.line}`, cursor: 'pointer', transition: 'all 0.15s'
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 700, color: freeDeliveryOnly ? '#15803D' : C.text }}>
            <Truck size={14} color={C.green} /> Livraison offerte
          </span>
          <input
            type="checkbox"
            checked={freeDeliveryOnly}
            onChange={e => onFreeDeliveryChange(e.target.checked)}
            style={{ accentColor: C.green, width: 16, height: 16, cursor: 'pointer' }}
          />
        </label>

        {/* Option Livraison rapide */}
        <label
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '9px 12px', borderRadius: 10, background: fastDeliveryOnly ? C.accentL : C.card,
            border: `1.5px solid ${fastDeliveryOnly ? C.accent : C.line}`, cursor: 'pointer', transition: 'all 0.15s'
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 700, color: fastDeliveryOnly ? C.accentD : C.text }}>
            <Clock size={14} color={C.accent} /> Moins de 30 min
          </span>
          <input
            type="checkbox"
            checked={fastDeliveryOnly}
            onChange={e => onFastDeliveryChange(e.target.checked)}
            style={{ accentColor: C.accent, width: 16, height: 16, cursor: 'pointer' }}
          />
        </label>
      </div>
    </div>
  );

  /* Version Mobile — Inline block au lieu de Drawer */
  if (isOpenMobile) {
    return (
      <div
        style={{
          width: '100%',
          background: C.card,
          borderRadius: 20,
          border: `1px solid ${C.line}`,
          boxShadow: C.shadow,
          marginBottom: 20,
          animation: 'slideInLeft 0.25s ease-out',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: `1px solid ${C.line}` }}>
          <span style={{ fontWeight: 900, fontSize: 18, color: C.dark }}>Filtres de recherche</span>
          <button
            onClick={onCloseMobile}
            style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: C.bg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={16} color={C.text} />
          </button>
        </div>
        {sidebarContent}
      </div>
    );
  }

  /* Version Desktop — Panneau fixe/sticky */
  return (
    <aside
      style={{
        width: 280, flexShrink: 0, background: C.card,
        borderRadius: 24, border: `1px solid ${C.line}`,
        boxShadow: C.shadow, height: 'fit-content',
        position: 'sticky', top: 90, zIndex: 20
      }}
    >
      {sidebarContent}
    </aside>
  );
}
