import { useEffect, useState, useCallback } from 'react';
import { Search, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { menuAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { getArticleImage } from '../../utils/articleImage';

const T = {
  primary:          '#EA580C',
  primaryLight:     'rgba(255,140,0,0.10)',
  primaryGlow:      'rgba(255,140,0,0.22)',
  secondary:        '#16A34A',
  secondaryLight:   'rgba(22,163,74,0.09)',
  amber:            '#D97706',
  red:              '#DC2626',
  redLight:         'rgba(220,38,38,0.09)',
  surface:          '#FFFFFF',
  surfaceLow:       '#F3F4F6',
  surfaceHigh:      '#E5E7EB',
  onSurface:        '#1A0C00',
  onSurfaceVariant: '#8B6E50',
};

import { SURFACE as CARD, BORDER_SLATE as BORDER } from '../../theme/colors';
const SH2    = '0 4px 16px rgba(139,110,80,0.10),0 2px 4px rgba(139,110,80,0.06)';

function fmt(n) { return Math.round(Number(n) || 0).toLocaleString('fr-FR'); }

// ─── Badge disponibilité ───────────────────────────────────────────────────────
function DispoToggle({ dispo, loading, onToggle }) {
  return (
    <button
      onClick={onToggle}
      disabled={loading}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 14px', borderRadius: 99, border: 'none',
        background: dispo ? T.secondaryLight : T.redLight,
        color: dispo ? T.secondary : T.red,
        fontSize: 12, fontWeight: 700,
        cursor: loading ? 'wait' : 'pointer',
        transition: 'all 0.15s',
        opacity: loading ? 0.6 : 1,
        fontFamily: 'inherit',
        whiteSpace: 'nowrap',
      }}
    >
      {dispo
        ? <><CheckCircle size={13} /> Disponible</>
        : <><XCircle size={13} /> Rupture</>
      }
    </button>
  );
}

// ─── Ligne article ─────────────────────────────────────────────────────────────
function ArticleRow({ art, onToggle }) {
  const [toggling, setToggling] = useState(false);
  const dispo = art.disponible !== false;

  const handleToggle = async () => {
    setToggling(true);
    try { await onToggle(art, !dispo); }
    finally { setToggling(false); }
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '10px 14px 10px 10px',
      background: CARD,
      border: `1px solid ${dispo ? BORDER : '#FECACA'}`,
      borderLeft: `4px solid ${dispo ? T.secondary : T.red}`,
      borderRadius: 16,
      boxShadow: SH2,
      opacity: dispo ? 1 : 0.75,
      transition: 'opacity 0.2s, border-color 0.2s',
    }}>
      {/* Image */}
      <div style={{ width: 60, height: 60, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: T.surfaceLow, position: 'relative' }}>
        <img
          src={getArticleImage(art, { width: 120, quality: 75 })}
          alt={art.nom}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        {!dispo && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(185,28,28,0.18)', borderRadius: 12 }} />
        )}
      </div>

      {/* Infos */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 700, color: T.onSurface, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {art.nom}
        </p>
        <p style={{ margin: 0, fontSize: 12, color: T.onSurfaceVariant }}>
          {art.categorie?.nom || art.categorieNom || 'Sans catégorie'}
          {art.reference ? ` · Réf. ${art.reference}` : ''}
        </p>
      </div>

      {/* Prix */}
      <span style={{ fontSize: 15, fontWeight: 800, color: T.primary, flexShrink: 0, marginRight: 8 }}>
        {fmt(art.prix)} F
      </span>

      {/* Toggle */}
      <DispoToggle dispo={dispo} loading={toggling} onToggle={handleToggle} />
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function ArticlesStaff() {
  const { user } = useAuth();
  const restaurantId = [user?.restaurant?.id, user?.restaurantId].find(id => id && id.length > 10) || '';

  const [articles,   setArticles]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [catFilter,  setCatFilter]  = useState('Tous');
  const [filterDispo, setFilterDispo] = useState('tous'); // 'tous' | 'dispo' | 'rupture'
  const [toast,      setToast]      = useState(null);

  const showToast = (ok, msg) => {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { cible: 'TOUS', ...(restaurantId ? { restaurantId } : {}) };
      const [mr, cr] = await Promise.all([
        menuAPI.get(params),
        menuAPI.getCategories({ restaurantId }).catch(() => ({ data: [] })),
      ]);
      setArticles(mr.data || []);
      setCategories(cr.data || []);
    } catch { /* */ }
    finally { setLoading(false); }
  }, [restaurantId]);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (art, newDispo) => {
    try {
      await menuAPI.toggleArticle(art.id, newDispo);
      setArticles(prev => prev.map(a => a.id === art.id ? { ...a, disponible: newDispo } : a));
      showToast(true, `${art.nom} marqué ${newDispo ? 'disponible' : 'en rupture'}.`);
    } catch (e) {
      showToast(false, e?.response?.data?.message || 'Erreur mise à jour.');
    }
  };

  const allCats = ['Tous', ...categories.map(c => c.nom)];

  const shown = articles.filter(a => {
    const matchSearch = !search || a.nom.toLowerCase().includes(search.toLowerCase());
    const matchCat    = catFilter === 'Tous' || a.categorie?.nom === catFilter || a.categorieNom === catFilter;
    const matchDispo  = filterDispo === 'tous' || (filterDispo === 'dispo' ? a.disponible !== false : a.disponible === false);
    return matchSearch && matchCat && matchDispo;
  });

  const nbDispo    = articles.filter(a => a.disponible !== false).length;
  const nbRupture  = articles.length - nbDispo;

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 300,
          background: toast.ok ? '#d1fae5' : '#fee2e2',
          color: toast.ok ? T.secondary : T.red,
          borderRadius: 14, padding: '12px 18px',
          fontSize: 13, fontWeight: 700,
          boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
        }}>
          {toast.msg}
        </div>
      )}

      {/* ── En-tête ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 22 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: T.onSurface, letterSpacing: '-0.5px' }}>
            Gestion des Articles
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: T.onSurfaceVariant }}>
            {articles.length} articles · {nbDispo} disponibles · {nbRupture} en rupture
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 99, border: 'none', background: T.surfaceLow, color: T.onSurfaceVariant, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Actualiser
        </button>
      </div>

      {/* ── KPI chips ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { id: 'tous',    label: `Tous (${articles.length})`,        bg: filterDispo === 'tous'    ? T.primary      : T.surfaceHigh, color: filterDispo === 'tous'    ? '#fff' : T.onSurfaceVariant },
          { id: 'dispo',   label: `Disponibles (${nbDispo})`,         bg: filterDispo === 'dispo'   ? T.secondary     : T.surfaceHigh, color: filterDispo === 'dispo'   ? '#fff' : T.onSurfaceVariant },
          { id: 'rupture', label: `En rupture (${nbRupture})`,        bg: filterDispo === 'rupture' ? T.red           : T.surfaceHigh, color: filterDispo === 'rupture' ? '#fff' : T.onSurfaceVariant },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilterDispo(f.id)}
            style={{ padding: '7px 16px', borderRadius: 99, border: 'none', background: f.bg, color: f.color, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.14s', fontFamily: 'inherit' }}
          >{f.label}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Sidebar catégories ── */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: '14px 0', position: 'sticky', top: 76, boxShadow: SH2 }}>
          <p style={{ margin: '0 16px 10px', fontSize: 11, textTransform: 'uppercase', fontWeight: 700, color: T.onSurfaceVariant, letterSpacing: '0.12em' }}>
            Catégories
          </p>
          {allCats.map(c => {
            const active = c === catFilter;
            return (
              <button
                key={c}
                onClick={() => setCatFilter(c)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '9px 16px', border: 'none',
                  background: active ? T.primaryLight : 'transparent',
                  color: active ? T.primary : T.onSurfaceVariant,
                  fontSize: 13, fontWeight: active ? 700 : 500,
                  cursor: 'pointer', borderRadius: 0,
                  fontFamily: 'inherit',
                  transition: 'all 0.1s',
                }}
              >{c}</button>
            );
          })}
        </div>

        {/* ── Liste articles ── */}
        <div>
          {/* Recherche */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: T.surfaceLow, borderRadius: 12, padding: '9px 14px', marginBottom: 16 }}>
            <Search size={13} color={T.onSurfaceVariant} />
            <input
              type="text"
              placeholder="Rechercher un article…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, color: T.onSurface, background: 'transparent', fontFamily: 'inherit' }}
            />
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: T.onSurfaceVariant, fontSize: 14 }}>
              Chargement des articles…
            </div>
          ) : shown.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: T.onSurfaceVariant, fontSize: 14 }}>
              Aucun article trouvé
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {shown.map(a => (
                <ArticleRow key={a.id} art={a} onToggle={handleToggle} />
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
