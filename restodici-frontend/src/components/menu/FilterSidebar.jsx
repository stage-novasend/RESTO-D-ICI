/* ═══════════════════════════════════════════════════════════════
   FilterSidebar.jsx — Sidebar dynamique de filtres (Style Yango Deli)
   Propose des filtres par catégorie, restaurant, tranche de prix,
   note minimale, frais de livraison, délai et options de tri.
   Adapté pour ordinateur (sticky) et mobile (drawer).
   ═══════════════════════════════════════════════════════════════ */
import { useState } from 'react';
import {
  SlidersHorizontal, X, RotateCcw, Star, Truck, Clock, ChevronDown,
} from 'lucide-react';

const C = {
  bg: '#F8FAFC',
  bgAlt: '#F1F5F9',
  surface: '#FFFFFF',
  dark: '#0F172A',
  text: '#334155',
  muted: '#64748B',
  mutedL: '#94A3B8',
  card: '#FFFFFF',
  accent: '#EA580C',
  accentD: '#C2410C',
  accentL: '#FFF7ED',
  yellow: '#F59E0B',
  yellowL: '#FCD34D',
  red: '#EF4444',
  green: '#10B981',
  line: '#E2E8F0',
  shadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  shadowS: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  shadowM: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
};

const sans = "'Inter', system-ui, sans-serif";

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 24, fontFamily: sans }}>
      {/* En-tête filtres & reset */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, borderBottom: `1px solid ${C.line}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 6, background: C.bgAlt, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <SlidersHorizontal size={16} color={C.text} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: C.dark }}>Filtres</h3>
            {activeCount > 0 && (
              <span style={{ fontSize: 12, fontWeight: 500, color: C.accent }}>
                {activeCount} filtre{activeCount > 1 ? 's' : ''} actif{activeCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {activeCount > 0 && (
          <button
            onClick={onReset}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: 'transparent', border: 'none', color: C.muted,
              fontSize: 12, fontWeight: 500, cursor: 'pointer', padding: '6px 8px',
              borderRadius: 6, transition: 'background 0.2s, color 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = C.bgAlt; e.currentTarget.style.color = C.text; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.muted; }}
          >
            <RotateCcw size={14} /> Reset
          </button>
        )}
      </div>

      {/* 1. Tri & Classement */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div
          onClick={() => toggleSection('sort')}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted }}>
            Classer par
          </span>
          <ChevronDown size={14} color={C.mutedL} style={{ transform: collapsedSections['sort'] ? 'rotate(-90deg)' : 'none', transition: 'transform 0.2s' }} />
        </div>

        {!collapsedSections['sort'] && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {SORT_OPTIONS.map(opt => {
              const isActive = sortBy === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => onSortByChange(opt.id)}
                  style={{
                    padding: '6px 12px', borderRadius: 6,
                    border: `1px solid ${isActive ? C.accent : C.line}`,
                    background: isActive ? C.accentL : C.card,
                    color: isActive ? C.accentD : C.text,
                    fontSize: 13, fontWeight: 500, cursor: 'pointer',
                    transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: 6,
                    boxShadow: isActive ? C.shadow : 'none'
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div
            onClick={() => toggleSection('cats')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted }}>
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
                      padding: '8px 12px', borderRadius: 6, border: 'none',
                      background: isActive ? C.accentL : 'transparent',
                      color: isActive ? C.accentD : C.text,
                      fontSize: 13, fontWeight: 500,
                      cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = C.bgAlt; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14 }}>
                        {catId === '__all__' ? '🍽️' : getCatEmoji(catNom)}
                      </span>
                      {catNom}
                    </span>
                    {count !== undefined && (
                      <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 6px', borderRadius: 4, background: isActive ? C.accent : C.bgAlt, color: isActive ? '#fff' : C.muted }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div
            onClick={() => toggleSection('resto')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted }}>
              Restaurant
            </span>
            <ChevronDown size={14} color={C.mutedL} style={{ transform: collapsedSections['resto'] ? 'rotate(-90deg)' : 'none', transition: 'transform 0.2s' }} />
          </div>

          {!collapsedSections['resto'] && (
            <select
              value={selectedRestoId}
              onChange={e => onRestoChange(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 6,
                border: `1px solid ${selectedRestoId !== '__all__' ? C.accent : C.line}`,
                background: C.card, color: C.text, fontFamily: sans, fontSize: 13,
                fontWeight: 500, outline: 'none', cursor: 'pointer', boxShadow: C.shadow
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div
          onClick={() => toggleSection('price')}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted }}>
            Fourchette de prix
          </span>
          <ChevronDown size={14} color={C.mutedL} style={{ transform: collapsedSections['price'] ? 'rotate(-90deg)' : 'none', transition: 'transform 0.2s' }} />
        </div>

        {!collapsedSections['price'] && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {PRICE_OPTIONS.map(opt => {
              const isActive = priceRange === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => onPriceRangeChange(opt.id)}
                  style={{
                    padding: '8px 12px', borderRadius: 6,
                    border: `1px solid ${isActive ? C.accent : C.line}`,
                    background: isActive ? C.accentL : C.card,
                    color: isActive ? C.accentD : C.text,
                    fontSize: 12, fontWeight: 500, cursor: 'pointer',
                    transition: 'all 0.15s', textAlign: 'center',
                    boxShadow: isActive ? C.shadow : 'none'
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted }}>
          Services & Qualité
        </span>

        {/* Note 4.0+ / 4.5+ */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[0, 4.0, 4.5].map(rating => {
            const isActive = minRating === rating;
            return (
              <button
                key={rating}
                onClick={() => onMinRatingChange(rating)}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 6,
                  border: `1px solid ${isActive ? C.yellow : C.line}`,
                  background: isActive ? '#FEF3C7' : C.card,
                  color: isActive ? '#92400E' : C.text,
                  fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'all 0.15s',
                  boxShadow: isActive ? C.shadow : 'none'
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
            padding: '10px 12px', borderRadius: 6, background: freeDeliveryOnly ? '#F0FDF4' : C.card,
            border: `1px solid ${freeDeliveryOnly ? C.green : C.line}`, cursor: 'pointer', transition: 'all 0.15s',
            boxShadow: freeDeliveryOnly ? C.shadow : 'none'
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: freeDeliveryOnly ? '#15803D' : C.text }}>
            <Truck size={14} color={freeDeliveryOnly ? '#15803D' : C.muted} /> Livraison offerte
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
            padding: '10px 12px', borderRadius: 6, background: fastDeliveryOnly ? C.accentL : C.card,
            border: `1px solid ${fastDeliveryOnly ? C.accent : C.line}`, cursor: 'pointer', transition: 'all 0.15s',
            boxShadow: fastDeliveryOnly ? C.shadow : 'none'
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: fastDeliveryOnly ? C.accentD : C.text }}>
            <Clock size={14} color={fastDeliveryOnly ? C.accentD : C.muted} /> Moins de 30 min
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
          borderRadius: 12,
          border: `1px solid ${C.line}`,
          boxShadow: C.shadowM,
          marginBottom: 24,
          animation: 'slideInLeft 0.2s ease-out',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: `1px solid ${C.line}` }}>
          <span style={{ fontWeight: 600, fontSize: 16, color: C.dark }}>Filtres de recherche</span>
          <button
            onClick={onCloseMobile}
            style={{ width: 32, height: 32, borderRadius: 6, border: 'none', background: C.bgAlt, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
        borderRadius: 12, border: `1px solid ${C.line}`,
        boxShadow: C.shadow, height: 'fit-content',
        position: 'sticky', top: 96, zIndex: 20
      }}
    >
      {sidebarContent}
    </aside>
  );
}
