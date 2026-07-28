// src/components/staff/NewOrderModal.jsx
// Modal de prise de commande en salle par le staff (US-08)
import { useEffect, useMemo, useState } from 'react';
import {
  X, Search, Plus, Minus, ShoppingCart, Send, UtensilsCrossed, Package,
  ChevronRight, Loader2,
} from 'lucide-react';
import { menuAPI, commandesService } from '../../services/api';
import { formatFCFA } from '../../utils/formatters';
import { getArticleImage } from '../../utils/articleImage';

import {
  ORANGE as ACCENT, ORANGE_DARK as ACCENT_D, SURFACE,
  BORDER_SAND as BORDER, TEXT_STONE as TEXT, MUTED_STONE as MUTED,
} from '../../theme/colors';
const sans    = "'Plus Jakarta Sans', system-ui, sans-serif";

const FOOD_IMGS = [
  'photo-1665332195309-9d75071138f0','photo-1665400808116-f0e6339b7e9a',
  'photo-1664993101841-036f189719b6','photo-1664992960082-0ea299a9c53e',
  'photo-1665333048952-a3ee97714c6b','photo-1665332305771-e49a5dd5ba80',
  'photo-1665334217407-6688e6941a47','photo-1665332561290-cc6757172890',
  'photo-1665401015549-712c0dc5ef85','photo-1603496987674-79600a000f55',
  'photo-1773620494293-e9e075dd48fd','photo-1665833613236-7c1d087463b1',
];
const fallback = (i) =>
  `https://images.unsplash.com/${FOOD_IMGS[i % FOOD_IMGS.length]}?q=80&w=300&auto=format&fit=crop`;

/* ── ArticleCard ─────────────────────────────────────────────────────────────── */
function ArticleCard({ article, qty, onAdd, onRemove, idx }) {
  const img = getArticleImage(article) || fallback(idx);
  const avail = article.disponible !== false;

  return (
    <div style={{
      background: '#fff', borderRadius: 14, border: `1px solid ${BORDER}`,
      display: 'flex', alignItems: 'center', gap: 0, overflow: 'hidden',
      opacity: avail ? 1 : 0.5,
    }}>
      <div style={{ width: 72, height: 72, flexShrink: 0 }}>
        <img src={img} alt={article.nom}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={e => { e.target.src = fallback(idx); }} />
      </div>
      <div style={{ flex: 1, padding: '8px 10px', minWidth: 0 }}>
        <p style={{ margin: 0, fontFamily: sans, fontSize: 13, fontWeight: 700, color: TEXT,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {article.nom}
        </p>
        <p style={{ margin: '2px 0 0', fontFamily: sans, fontSize: 13, fontWeight: 800, color: ACCENT }}>
          {formatFCFA(article.prixClient ?? article.prix)}
        </p>
      </div>
      <div style={{ padding: '0 10px', flexShrink: 0 }}>
        {qty > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', background: ACCENT, borderRadius: 99 }}>
            <button onClick={() => onRemove(article)}
              style={{ width: 28, height: 28, border: 'none', background: 'transparent', color: '#fff',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Minus size={12} />
            </button>
            <span style={{ fontFamily: sans, fontSize: 13, fontWeight: 800, color: '#fff', minWidth: 18, textAlign: 'center' }}>
              {qty}
            </span>
            <button onClick={() => onAdd(article)}
              style={{ width: 28, height: 28, border: 'none', background: 'transparent', color: '#fff',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plus size={12} />
            </button>
          </div>
        ) : (
          <button onClick={() => avail && onAdd(article)} disabled={!avail}
            style={{ width: 30, height: 30, borderRadius: '50%', border: 'none',
              background: avail ? ACCENT : BORDER, color: avail ? '#fff' : MUTED,
              cursor: avail ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: avail ? `0 2px 8px ${ACCENT}44` : 'none' }}>
            <Plus size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Main Modal ──────────────────────────────────────────────────────────────── */
export default function NewOrderModal({ restaurantId, onClose, onSuccess }) {
  const [articles,    setArticles]    = useState([]);
  const [categories,  setCategories]  = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [search,      setSearch]      = useState('');
  const [activeCat,   setActiveCat]   = useState('__all__');
  const [cart,        setCart]        = useState([]); // [{article, qty, notes}]
  const [mode,        setMode]        = useState('SUR_PLACE');
  const [tableNumber, setTableNumber] = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState('');

  useEffect(() => {
    if (!restaurantId) return;
    Promise.all([
      menuAPI.getByRestaurant(restaurantId),
      menuAPI.getCategories({ restaurantId }),
    ]).then(([ar, cr]) => {
      setArticles(ar.data || []);
      setCategories(cr.data || []);
    }).catch(() => setError('Impossible de charger le menu.')).finally(() => setLoadingMenu(false));
  }, [restaurantId]);

  /* — qty helpers — */
  const qty = (id) => cart.find(c => c.article.id === id)?.qty || 0;

  const addToCart = (article) => {
    setCart(prev => {
      const idx = prev.findIndex(c => c.article.id === article.id);
      if (idx >= 0) return prev.map((c, i) => i === idx ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { article, qty: 1, notes: '' }];
    });
  };

  const removeFromCart = (article) => {
    setCart(prev => {
      const idx = prev.findIndex(c => c.article.id === article.id);
      if (idx < 0) return prev;
      const current = prev[idx].qty;
      if (current <= 1) return prev.filter((_, i) => i !== idx);
      return prev.map((c, i) => i === idx ? { ...c, qty: c.qty - 1 } : c);
    });
  };

  const updateNotes = (articleId, notes) => {
    setCart(prev => prev.map(c => c.article.id === articleId ? { ...c, notes } : c));
  };

  /* — filtered articles — */
  const cats = useMemo(() => [
    { id: '__all__', nom: 'Tout' },
    ...categories,
  ], [categories]);

  const shown = useMemo(() => articles.filter(a => {
    const matchSearch = !search || a.nom.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCat === '__all__' || a.categorieId === activeCat || a.categorie?.id === activeCat;
    return matchSearch && matchCat;
  }), [articles, search, activeCat]);

  /* — cart totals — */
  const cartTotal = cart.reduce((s, c) => s + (c.article.prixClient ?? c.article.prix) * c.qty, 0);
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);

  /* — submit — */
  const handleSubmit = async () => {
    if (cart.length === 0) { setError('Ajoutez au moins un article.'); return; }
    if (mode === 'SUR_PLACE' && !tableNumber.trim()) { setError('Indiquez le numéro de table.'); return; }
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        restaurantId,
        modeLivraison: mode,
        ...(mode === 'SUR_PLACE' ? { tableNumber: tableNumber.trim() } : {}),
        lignes: cart.map(c => ({
          articleId: c.article.id,
          quantite: c.qty,
          ...(c.notes ? { instructions: c.notes } : {}),
        })),
      };
      const res = await commandesService.create(payload);
      onSuccess?.(res.data);
      onClose();
    } catch (e) {
      setError(e?.response?.data?.message || 'Erreur lors de la création de la commande.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 900, backdropFilter: 'blur(3px)' }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 910,
        display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end',
      }}>
        <div style={{
          width: '100%', maxWidth: 860, background: SURFACE,
          display: 'flex', flexDirection: 'column', height: '100%',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.18)',
          animation: 'slideInRight 0.25s cubic-bezier(.4,0,.2,1)',
        }}>
          <style>{`@keyframes slideInRight{from{transform:translateX(60px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>

          {/* ── Header ── */}
          <div style={{ background: '#fff', borderBottom: `1px solid ${BORDER}`, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${BORDER}`, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={15} color={MUTED} />
            </button>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontFamily: sans, fontSize: 16, fontWeight: 900, color: TEXT }}>Nouvelle commande en salle</p>
              <p style={{ margin: 0, fontFamily: sans, fontSize: 12, color: MUTED }}>Composez la commande puis envoyez-la en cuisine</p>
            </div>
            {cartCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: `${ACCENT}18`, borderRadius: 99, padding: '5px 12px' }}>
                <ShoppingCart size={14} color={ACCENT} />
                <span style={{ fontFamily: sans, fontSize: 13, fontWeight: 800, color: ACCENT }}>{cartCount} article{cartCount > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          {/* ── Body (split: menu left + cart right) ── */}
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 300px', minHeight: 0 }}>

            {/* ── Left: menu browser ── */}
            <div style={{ display: 'flex', flexDirection: 'column', borderRight: `1px solid ${BORDER}`, minHeight: 0 }}>

              {/* Search */}
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${BORDER}`, background: '#fff', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '8px 12px' }}>
                  <Search size={13} color={MUTED} />
                  <input
                    type="text" placeholder="Rechercher un plat…"
                    value={search} onChange={e => setSearch(e.target.value)}
                    style={{ flex: 1, border: 'none', outline: 'none', fontFamily: sans, fontSize: 13, color: TEXT, background: 'transparent' }}
                  />
                  {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}><X size={12} color={MUTED} /></button>}
                </div>
              </div>

              {/* Category chips */}
              <div style={{ display: 'flex', gap: 6, padding: '10px 16px', overflowX: 'auto', scrollbarWidth: 'none', background: '#fff', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
                {cats.map(c => {
                  const isA = c.id === activeCat;
                  return (
                    <button key={c.id} onClick={() => setActiveCat(c.id)}
                      style={{ flexShrink: 0, padding: '5px 14px', borderRadius: 99, border: 'none',
                        background: isA ? ACCENT : '#fff', color: isA ? '#fff' : MUTED,
                        fontFamily: sans, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.07)', transition: 'all 0.12s' }}>
                      {c.nom}
                    </button>
                  );
                })}
              </div>

              {/* Articles list */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
                {loadingMenu ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                    <Loader2 size={24} color={ACCENT} style={{ animation: 'spin 1s linear infinite' }} />
                    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                  </div>
                ) : shown.length === 0 ? (
                  <p style={{ textAlign: 'center', fontFamily: sans, fontSize: 13, color: MUTED, marginTop: 40 }}>Aucun article trouvé</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {shown.map((a, i) => (
                      <ArticleCard key={a.id} article={a} idx={i}
                        qty={qty(a.id)} onAdd={addToCart} onRemove={removeFromCart} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Right: cart + order config ── */}
            <div style={{ display: 'flex', flexDirection: 'column', background: '#fff', minHeight: 0 }}>

              {/* Mode + table */}
              <div style={{ padding: '14px 16px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
                <p style={{ margin: '0 0 8px', fontFamily: sans, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: MUTED }}>Mode</p>
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  {[
                    { id: 'SUR_PLACE', label: 'Sur place', icon: UtensilsCrossed },
                    { id: 'EMPORTER',  label: 'À emporter', icon: Package },
                  ].map(({ id, label, icon: Icon }) => (
                    <button key={id} onClick={() => setMode(id)}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                        padding: '8px', borderRadius: 10, border: `1.5px solid ${mode === id ? ACCENT : BORDER}`,
                        background: mode === id ? `${ACCENT}12` : 'transparent',
                        color: mode === id ? ACCENT : MUTED,
                        fontFamily: sans, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      <Icon size={13} /> {label}
                    </button>
                  ))}
                </div>
                {mode === 'SUR_PLACE' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: SURFACE, border: `1.5px solid ${BORDER}`, borderRadius: 10, padding: '8px 12px' }}>
                    <span style={{ fontFamily: sans, fontSize: 12, color: MUTED, whiteSpace: 'nowrap' }}>Table n°</span>
                    <input
                      type="text" placeholder="Ex : 5, T-12…"
                      value={tableNumber} onChange={e => setTableNumber(e.target.value)}
                      style={{ flex: 1, border: 'none', outline: 'none', fontFamily: sans, fontSize: 13, fontWeight: 700, color: TEXT, background: 'transparent' }}
                    />
                  </div>
                )}
              </div>

              {/* Cart items */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px' }}>
                {cart.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 0' }}>
                    <ShoppingCart size={32} color={BORDER} style={{ marginBottom: 8 }} />
                    <p style={{ fontFamily: sans, fontSize: 13, color: MUTED, margin: 0 }}>Panier vide</p>
                    <p style={{ fontFamily: sans, fontSize: 11, color: MUTED, margin: '4px 0 0' }}>Ajoutez des articles depuis le menu</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {cart.map(({ article, qty: q, notes }) => (
                      <div key={article.id} style={{ background: SURFACE, borderRadius: 12, padding: '10px 12px', border: `1px solid ${BORDER}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontFamily: sans, fontSize: 13, fontWeight: 700, color: TEXT, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {article.nom}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', background: ACCENT, borderRadius: 99, flexShrink: 0 }}>
                            <button onClick={() => removeFromCart(article)}
                              style={{ width: 22, height: 22, border: 'none', background: 'transparent', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Minus size={10} />
                            </button>
                            <span style={{ fontFamily: sans, fontSize: 12, fontWeight: 800, color: '#fff', minWidth: 16, textAlign: 'center' }}>{q}</span>
                            <button onClick={() => addToCart(article)}
                              style={{ width: 22, height: 22, border: 'none', background: 'transparent', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Plus size={10} />
                            </button>
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <input
                            type="text" placeholder="Note pour la cuisine…"
                            value={notes}
                            onChange={e => updateNotes(article.id, e.target.value)}
                            style={{ flex: 1, border: 'none', outline: 'none', fontFamily: sans, fontSize: 11, color: MUTED, background: 'transparent', marginRight: 8 }}
                          />
                          <span style={{ fontFamily: sans, fontSize: 12, fontWeight: 800, color: ACCENT, flexShrink: 0 }}>
                            {formatFCFA((article.prixClient ?? article.prix) * q)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer: total + submit */}
              <div style={{ borderTop: `1px solid ${BORDER}`, padding: '14px 16px', flexShrink: 0 }}>
                {error && (
                  <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 12px', marginBottom: 10 }}>
                    <p style={{ margin: 0, fontFamily: sans, fontSize: 12, color: '#DC2626' }}>{error}</p>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontFamily: sans, fontSize: 13, color: MUTED, fontWeight: 600 }}>Total</span>
                  <span style={{ fontFamily: sans, fontSize: 18, fontWeight: 900, color: TEXT }}>{formatFCFA(cartTotal)}</span>
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || cart.length === 0}
                  style={{
                    width: '100%', padding: '12px', borderRadius: 12, border: 'none',
                    background: cart.length > 0 ? `linear-gradient(135deg,${ACCENT},${ACCENT_D})` : BORDER,
                    color: cart.length > 0 ? '#fff' : MUTED,
                    fontFamily: sans, fontSize: 14, fontWeight: 800,
                    cursor: cart.length > 0 && !submitting ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: cart.length > 0 ? `0 4px 16px ${ACCENT}44` : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  {submitting
                    ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Envoi en cuisine…</>
                    : <><Send size={14} /> Envoyer en cuisine {mode === 'SUR_PLACE' && tableNumber ? `· Table ${tableNumber}` : ''}</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
