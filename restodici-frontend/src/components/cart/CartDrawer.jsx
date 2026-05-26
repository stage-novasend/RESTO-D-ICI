import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChefHat, MapPin, Minus, Plus, ShoppingBag, Store, X } from 'lucide-react';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../hooks/useAuth';
import { formatFCFA } from '../../utils/formatters';

const KENTE = ['#C05015', '#F97316', '#0F172A', '#9A3E10'];

function KenteStrip() {
  return (
    <div style={{ display: 'flex', height: 4, flexShrink: 0 }}>
      {KENTE.map((c, i) => <div key={i} style={{ flex: 1, background: c }} />)}
    </div>
  );
}

function ItemPhoto({ item }) {
  if (item.photoUrl) {
    return (
      <img
        src={item.photoUrl}
        alt={item.nom}
        style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
        onError={e => { e.currentTarget.style.display = 'none'; }}
      />
    );
  }
  const initials = item.nom.slice(0, 2).toUpperCase();
  const hue = item.nom.charCodeAt(0) % 360;
  return (
    <div style={{ width: 52, height: 52, borderRadius: 10, background: `hsl(${hue},55%,92%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ fontSize: 14, fontWeight: 800, color: `hsl(${hue},45%,38%)` }}>{initials}</span>
    </div>
  );
}

const MODES = [
  { id: 'SUR_PLACE', label: 'Sur place', icon: Store },
  { id: 'EMPORTER',  label: 'À emporter', icon: ShoppingBag },
  { id: 'LIVRAISON', label: 'Livraison',  icon: MapPin },
];

export default function CartDrawer({ isOpen, onClose }) {
  const { items, total, updateQuantity, removeItem, restaurantId, restaurantName } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode]       = useState('SUR_PLACE');
  const [address, setAddress] = useState('');

  const totalItems = items.reduce((s, i) => s + i.quantite, 0);

  const handleCheckout = () => {
    if (mode === 'LIVRAISON' && !address.trim()) {
      alert('Adresse obligatoire pour la livraison');
      return;
    }
    const pendingOrder = {
      restaurantId,
      restaurantName: restaurantName || 'Restaurant',
      orderMode: mode.toLowerCase(),
      deliveryAddress: mode === 'LIVRAISON' ? address : null,
      total: total(),
      items: items.map(item => ({
        articleId: item.articleId,
        nom: item.nom,
        prix: item.prix,
        quantite: item.quantite,
        instructions: item.instructions,
        photoUrl: item.photoUrl,
      })),
    };
    localStorage.setItem('pendingOrder', JSON.stringify(pendingOrder));
    onClose();
    navigate('/checkout');
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 49,
          background: 'rgba(0,0,0,0.48)',
          backdropFilter: 'blur(3px)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.25s',
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed', right: 0, top: 0, bottom: 0, zIndex: 50,
          width: 'min(420px, 100vw)',
          background: '#FDFAF7',
          boxShadow: '-16px 0 60px rgba(0,0,0,0.22)',
          display: 'flex', flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.28s cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        <KenteStrip />

        {/* Header */}
        <div style={{ background: '#0F172A', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#C05015', textTransform: 'uppercase', letterSpacing: '0.2em', margin: '0 0 4px' }}>Mon panier</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.2 }}>
              {restaurantName || 'Sélectionnez un restaurant'}
              {totalItems > 0 && (
                <span style={{ marginLeft: 8, background: '#C05015', color: '#fff', borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 800 }}>
                  {totalItems}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: '8px', cursor: 'pointer', color: 'rgba(255,255,255,0.75)', lineHeight: 0 }}
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              <ChefHat style={{ width: 52, height: 52, color: '#D0C4B8', margin: '0 auto 14px', display: 'block' }} />
              <p style={{ fontFamily: 'Georgia, serif', fontSize: 16, fontWeight: 700, color: '#64748B', margin: '0 0 6px' }}>Panier vide</p>
              <p style={{ fontSize: 13, color: '#BDB0A7', margin: 0 }}>Ajoutez des articles depuis le menu</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.lineId} style={{ background: '#fff', border: '1px solid rgba(89,67,42,0.1)', borderRadius: 14, padding: '12px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <ItemPhoto item={item} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: 0, lineHeight: 1.3 }}>{item.nom}</p>
                    <button onClick={() => removeItem(item.lineId)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D0C4B8', padding: 2, flexShrink: 0, lineHeight: 0 }}>
                      <X style={{ width: 13, height: 13 }} />
                    </button>
                  </div>
                  {item.instructions && (
                    <p style={{ fontSize: 11, color: '#9E8B7A', fontStyle: 'italic', margin: '0 0 8px' }}>{item.instructions}</p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {/* Qty controls */}
                    <div style={{ display: 'inline-flex', alignItems: 'center', background: '#FDF5EF', borderRadius: 20, padding: '2px 4px', gap: 2 }}>
                      <button
                        onClick={() => updateQuantity(item.lineId, item.quantite - 1)}
                        style={{ width: 26, height: 26, borderRadius: '50%', background: item.quantite <= 1 ? '#E8E0D6' : '#C05015', color: item.quantite <= 1 ? '#B0A090' : '#fff', border: 'none', cursor: item.quantite <= 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                      >
                        <Minus style={{ width: 10, height: 10 }} />
                      </button>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', minWidth: 24, textAlign: 'center' }}>{item.quantite}</span>
                      <button
                        onClick={() => updateQuantity(item.lineId, item.quantite + 1)}
                        style={{ width: 26, height: 26, borderRadius: '50%', background: '#C05015', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                      >
                        <Plus style={{ width: 10, height: 10 }} />
                      </button>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#C05015' }}>
                      {formatFCFA(Number(item.prix) * item.quantite)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div style={{ borderTop: '1px solid rgba(89,67,42,0.12)', background: '#fff', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14, flexShrink: 0 }}>
            {/* Mode */}
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#9E8B7A', textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 10px' }}>Mode de commande</p>
              <div style={{ display: 'flex', gap: 8 }}>
                {MODES.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setMode(id)}
                    style={{
                      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      padding: '10px 6px',
                      border: `2px solid ${mode === id ? '#C05015' : 'rgba(89,67,42,0.12)'}`,
                      borderRadius: 12,
                      background: mode === id ? '#FFF4EE' : '#FDFAF7',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <Icon style={{ width: 15, height: 15, color: mode === id ? '#C05015' : '#9E8B7A' }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: mode === id ? '#C05015' : '#9E8B7A' }}>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {mode === 'LIVRAISON' && (
              <input
                type="text"
                placeholder="Adresse complète de livraison..."
                value={address}
                onChange={e => setAddress(e.target.value)}
                style={{ border: '1.5px solid rgba(89,67,42,0.18)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#0F172A', outline: 'none', background: '#FDFAF7', boxSizing: 'border-box', width: '100%' }}
                onFocus={e => e.target.style.borderColor = '#C05015'}
                onBlur={e => e.target.style.borderColor = 'rgba(89,67,42,0.18)'}
              />
            )}

            {/* Total */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid rgba(89,67,42,0.1)' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>Total</span>
              <span style={{ fontSize: 22, fontWeight: 900, color: '#C05015', fontFamily: 'Georgia, serif', letterSpacing: '-0.02em' }}>
                {formatFCFA(total())}
              </span>
            </div>

            {!user && (
              <p style={{ fontSize: 11, color: '#9E8B7A', textAlign: 'center', margin: '-6px 0 0' }}>Connexion requise pour commander</p>
            )}

            <button
              onClick={handleCheckout}
              disabled={!user}
              style={{
                background: !user ? '#D0C4B8' : '#C05015',
                color: '#fff', border: 'none', borderRadius: 14,
                padding: '15px 0', fontSize: 15, fontWeight: 800,
                cursor: !user ? 'not-allowed' : 'pointer',
                width: '100%', letterSpacing: '-0.01em',
                boxShadow: !user ? 'none' : '0 6px 24px rgba(224,78,26,0.35)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { if (user) e.currentTarget.style.background = '#9A3E10'; }}
              onMouseLeave={e => { if (user) e.currentTarget.style.background = '#C05015'; }}
            >
              Commander · {formatFCFA(total())}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
