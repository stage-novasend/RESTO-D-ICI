import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Bike, CheckCircle, ChevronRight, CreditCard,
  Edit2, MapPin, Package, ShoppingBag, Star, Store, Tag,
  Truck, User,
} from 'lucide-react';
import { formatFCFA } from '../utils/formatters';

/* ── Palette (identique à CartDrawer + Home) ── */
const ORANGE   = '#EA580C';
const ORANGE_D = '#C2410C';
const NAVY     = '#1A0C00';
const BG       = '#FFF4ED';
const BORDER   = 'rgba(255,140,0,0.14)';
const MUTED    = '#9E8B7A';

const MODE_META = {
  SUR_PLACE: { label: 'Sur place',   Icon: Store,    color: '#059669', bg: '#F0FDF4' },
  EMPORTER:  { label: 'À emporter',  Icon: Package,  color: '#7C3AED', bg: '#F5F3FF' },
  LIVRAISON: { label: 'Livraison',   Icon: Truck,    color: ORANGE,    bg: '#FFF4EE' },
};

const PAYMENT_LABELS = {
  orange_money: 'Orange Money',
  mtn_momo:     'MTN MoMo',
  moov_money:   'Moov Money',
  wave:         'Wave',
  card:         'Carte Bancaire',
};

/* ── Sous-composant ligne récap ── */
function Row({ label, value, accent }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 13, color: accent ?? MUTED }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: accent ?? NAVY }}>{value}</span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   CartPage — Récapitulatif de commande
   Charge automatiquement les données du CartDrawer (pendingOrder)
══════════════════════════════════════════════════════════════ */
export default function CartPage() {
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('pendingOrder');
    if (saved) {
      try { setOrder(JSON.parse(saved)); }
      catch { navigate('/menu'); }
    } else {
      navigate('/menu');
    }
  }, [navigate]);

  if (!order) return null;

  const items        = order.items ?? [];
  const mode         = (order.orderMode ?? 'SUR_PLACE').toUpperCase();
  const meta         = MODE_META[mode] ?? MODE_META.SUR_PLACE;
  const { Icon: ModeIcon } = meta;
  const subtotal     = items.reduce((s, i) => s + Number(i.prix ?? 0) * Number(i.quantite ?? 1), 0);
  const deliveryFee  = Number(order.deliveryFee ?? 0);
  const promoDiscount = Number(order.promoDiscount ?? 0);
  const grandTotal   = Number(order.total ?? subtotal + deliveryFee - promoDiscount);
  const driver       = order.driver ?? null;
  const payLabel     = PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod ?? 'Paiement mobile';

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Header sticky ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 30,
        background: 'rgba(255,250,243,0.95)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${BORDER}`, boxShadow: '0 1px 8px rgba(0,0,0,0.05)',
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 16px', height: 56, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/menu')}
            style={{ width: 36, height: 36, borderRadius: 12, border: `1px solid ${BORDER}`, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: MUTED }}>
            <ArrowLeft style={{ width: 16, height: 16 }} />
          </button>
          <h1 style={{ fontSize: 15, fontWeight: 800, color: NAVY, margin: 0 }}>Récapitulatif de commande</h1>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: ORANGE }}>
            <ShoppingBag style={{ width: 14, height: 14 }} />
            {items.length} article{items.length > 1 ? 's' : ''}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px 110px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* ── Restaurant + Mode ── */}
        <section style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 20, padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: '#FFF4EE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Store style={{ width: 20, height: 20, color: ORANGE }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: NAVY, margin: 0 }}>{order.restaurantName ?? 'Restaurant'}</p>
              <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: meta.color, background: meta.bg, padding: '3px 10px', borderRadius: 99 }}>
                  <ModeIcon style={{ width: 10, height: 10 }} /> {meta.label}
                </span>
                {order.tableNumber && (
                  <span style={{ fontSize: 11, color: MUTED, fontWeight: 600 }}>Table {order.tableNumber}</span>
                )}
              </div>
            </div>
            <button onClick={() => navigate('/menu')}
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: ORANGE, background: '#FFF4EE', border: 'none', borderRadius: 10, padding: '7px 12px', cursor: 'pointer' }}>
              <Edit2 style={{ width: 11, height: 11 }} /> Modifier
            </button>
          </div>
        </section>

        {/* ── Articles ── */}
        <section style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 20, overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', borderBottom: `1px solid ${BORDER}` }}>
            <p style={{ fontSize: 10, fontWeight: 800, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.18em', margin: 0 }}>Votre commande</p>
          </div>
          {items.map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
              borderBottom: i < items.length - 1 ? `1px solid ${BORDER}` : 'none',
            }}>
              {item.photoUrl ? (
                <img src={item.photoUrl} alt={item.nom}
                  style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#FFF4EE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Package style={{ width: 18, height: 18, color: ORANGE }} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: NAVY, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.nom}
                </p>
                {item.variantLabel && (
                  <p style={{ fontSize: 11, color: ORANGE, fontWeight: 600, margin: '1px 0 0' }}>{item.variantLabel}</p>
                )}
                {item.instructions && (
                  <p style={{ fontSize: 11, color: MUTED, fontStyle: 'italic', margin: '1px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.instructions}
                  </p>
                )}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: MUTED, margin: 0 }}>×{item.quantite ?? 1}</p>
                <p style={{ fontSize: 13, fontWeight: 800, color: ORANGE, margin: '2px 0 0' }}>
                  {formatFCFA(Number(item.prix ?? 0) * Number(item.quantite ?? 1))}
                </p>
              </div>
            </div>
          ))}
        </section>

        {/* ── Livraison ── */}
        {mode === 'LIVRAISON' && (
          <section style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 20, overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', borderBottom: `1px solid ${BORDER}` }}>
              <p style={{ fontSize: 10, fontWeight: 800, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.18em', margin: 0 }}>Livraison</p>
            </div>
            <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {order.deliveryAddress && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <MapPin style={{ width: 14, height: 14, color: ORANGE, marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: MUTED, margin: 0 }}>Adresse</p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: NAVY, margin: '2px 0 0' }}>{order.deliveryAddress}</p>
                    {order.deliveryZone && (
                      <p style={{ fontSize: 11, color: MUTED, margin: '2px 0 0' }}>Zone · {order.deliveryZone}</p>
                    )}
                  </div>
                </div>
              )}

              {driver && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 14, padding: '10px 14px' }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: `linear-gradient(135deg,${ORANGE},${ORANGE_D})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <User style={{ width: 16, height: 16, color: '#fff' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 800, color: NAVY, margin: 0 }}>{driver.name}</p>
                    <p style={{ fontSize: 11, color: '#8B6E50', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                      <Bike style={{ width: 11, height: 11 }} /> {driver.vehicle}
                      {driver.rating && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                          · <Star style={{ width: 10, height: 10, fill: '#F59E0B', color: '#F59E0B' }} /> {driver.rating}
                        </span>
                      )}
                    </p>
                  </div>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#16A34A' }}>
                    <CheckCircle style={{ width: 13, height: 13 }} /> Confirmé
                  </span>
                </div>
              )}

              {deliveryFee > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: MUTED, fontWeight: 600 }}>Frais de livraison</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: ORANGE }}>{formatFCFA(deliveryFee)}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Promo appliquée ── */}
        {promoDiscount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 16, padding: '12px 18px' }}>
            <Tag style={{ width: 16, height: 16, color: '#16A34A', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#16A34A', margin: 0 }}>Code promo appliqué</p>
              <p style={{ fontSize: 11, color: '#065F46', margin: '2px 0 0' }}>Réduction de {formatFCFA(promoDiscount)}</p>
            </div>
            <CheckCircle style={{ width: 16, height: 16, color: '#16A34A', flexShrink: 0 }} />
          </div>
        )}

        {/* ── Moyen de paiement ── */}
        <section style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 20, padding: '14px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: '#FFF4EE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CreditCard style={{ width: 16, height: 16, color: ORANGE }} />
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: MUTED, margin: 0 }}>Méthode de paiement</p>
              <p style={{ fontSize: 13, fontWeight: 800, color: NAVY, margin: '2px 0 0' }}>{payLabel}</p>
            </div>
          </div>
        </section>

        {/* ── Récap financier ── */}
        <section style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 20, padding: '16px 20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <Row label="Sous-total" value={formatFCFA(subtotal)} />
            {deliveryFee > 0 && <Row label="Livraison" value={formatFCFA(deliveryFee)} />}
            {promoDiscount > 0 && <Row label="Remise promo" value={`-${formatFCFA(promoDiscount)}`} accent="#16A34A" />}
            <div style={{ borderTop: `1px solid ${BORDER}`, marginTop: 4, paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>Total TTC</span>
              <span style={{ fontSize: 26, fontWeight: 900, color: ORANGE, fontFamily: 'Georgia, serif', letterSpacing: '-0.02em' }}>
                {formatFCFA(grandTotal)}
              </span>
            </div>
          </div>
        </section>

      </main>

      {/* ── Bouton fixe bas ── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        padding: '14px 16px env(safe-area-inset-bottom, 12px)',
        background: 'rgba(255,250,243,0.96)', backdropFilter: 'blur(12px)',
        borderTop: `1px solid ${BORDER}`, zIndex: 40,
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <button onClick={() => navigate('/checkout')}
            style={{
              width: '100%', background: ORANGE, color: '#fff', border: 'none',
              borderRadius: 16, padding: '15px 0', fontSize: 15, fontWeight: 800,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 8, boxShadow: '0 6px 24px rgba(255,140,0,0.35)', transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = ORANGE_D}
            onMouseLeave={e => e.currentTarget.style.background = ORANGE}>
            Procéder au paiement · {formatFCFA(grandTotal)}
            <ChevronRight style={{ width: 16, height: 16 }} />
          </button>
        </div>
      </div>
    </div>
  );
}
