import { useEffect, useState } from 'react';
import { X, Truck, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { livraisonsExtAPI, commandesService } from '../../services/api';

const O = '#EA580C';

export default function DispatchModal({ commande, onClose, onDispatched }) {
  const [fournisseurs,  setFournisseurs]  = useState([]);
  const [fournisseurId, setFournisseurId] = useState('__manuel__');
  const [adresse,       setAdresse]       = useState(commande?.adresseLivraison || '');
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState('');
  const [success,       setSuccess]       = useState(false);

  useEffect(() => {
    livraisonsExtAPI.getFournisseurs()
      .then(r => {
        const actifs = (r.data || []).filter(f => f.actif);
        setFournisseurs(actifs);
        if (actifs.length > 0) setFournisseurId(actifs[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDispatch = async () => {
    setSaving(true); setError('');
    try {
      if (fournisseurId === '__manuel__') {
        // Flux normal sans API externe — on passe juste la commande EN_LIVRAISON
        await commandesService.updateStatus(commande.id, 'EN_LIVRAISON');
      } else {
        await livraisonsExtAPI.dispatch({
          commandeId:       commande.id,
          fournisseurId,
          adresseLivraison: adresse || undefined,
        });
      }
      setSuccess(true);
      setTimeout(() => { onDispatched?.(); onClose(); }, 1500);
    } catch (e) {
      setError(e?.response?.data?.message || 'Dispatch impossible');
    } finally {
      setSaving(false);
    }
  };

  const S = {
    overlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(3px)', zIndex: 990 },
    modal: {
      position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
      background: '#fff', borderRadius: 20, width: 440, maxWidth: '95vw',
      zIndex: 991, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', overflow: 'hidden',
    },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' },
    body: { padding: '20px 22px' },
    footer: { padding: '12px 20px', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'flex-end', gap: 10 },
    label: { display: 'block', fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 5 },
    input: { width: '100%', border: '1px solid #D1D9E6', borderRadius: 10, padding: '9px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' },
    select: { width: '100%', border: '1px solid #D1D9E6', borderRadius: 10, padding: '9px 12px', fontSize: 13, outline: 'none', background: '#fff' },
  };

  const isManuel = fournisseurId === '__manuel__';

  return (
    <>
      <div onClick={onClose} style={S.overlay} />
      <div style={S.modal}>

        {/* Header */}
        <div style={S.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: `${O}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Truck style={{ width: 16, height: 16, color: O }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Dispatcher la livraison</h3>
              <p style={{ margin: 0, fontSize: 11, color: '#94A3B8' }}>Commande #{commande?.numero}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94A3B8', display: 'flex' }}>
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* Body */}
        <div style={S.body}>
          {success ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <CheckCircle style={{ width: 40, height: 40, color: '#10B981', margin: '0 auto 12px' }} />
              <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                {isManuel ? 'En livraison !' : 'Commande dispatchée !'}
              </p>
              <p style={{ fontSize: 12, color: '#64748B', marginTop: 6 }}>
                {isManuel ? 'Statut mis à jour — EN LIVRAISON.' : 'Le livreur va prendre en charge la commande.'}
              </p>
            </div>
          ) : loading ? (
            <div style={{ textAlign: 'center', padding: 28, color: '#94A3B8', fontSize: 13 }}>Chargement…</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Fournisseur */}
              <div>
                <label style={S.label}>Mode de livraison</label>
                <select value={fournisseurId} onChange={e => setFournisseurId(e.target.value)} style={S.select}>
                  <option value="__manuel__">Manuel (sans API externe)</option>
                  {fournisseurs.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.nom} ({f.type}){f.fraisLivraisonDefaut ? ` — ${Number(f.fraisLivraisonDefaut).toLocaleString('fr-FR')} FCFA` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Adresse — uniquement utile pour les providers externes */}
              {!isManuel && (
                <div>
                  <label style={S.label}>Adresse de livraison</label>
                  <input type="text" value={adresse} onChange={e => setAdresse(e.target.value)}
                    placeholder="Ex : Cocody Riviera 3, Villa 42" style={S.input} />
                </div>
              )}

              {/* Info manuel */}
              {isManuel && (
                <div style={{ padding: '10px 12px', borderRadius: 8, background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                  <p style={{ margin: 0, fontSize: 12, color: '#166534' }}>
                    La commande passera directement au statut <strong>EN LIVRAISON</strong>. Vous gérez le livreur vous-même.
                  </p>
                </div>
              )}

              {/* Info provider externe */}
              {!isManuel && fournisseurs.length > 0 && (
                <div style={{ padding: '10px 12px', borderRadius: 8, background: '#FFF7ED', border: '1px solid #FED7AA' }}>
                  <p style={{ margin: 0, fontSize: 12, color: '#92400E' }}>
                    La commande sera transmise à <strong>{fournisseurs.find(f => f.id === fournisseurId)?.nom}</strong> via son API. La clé API doit être configurée dans Admin → Livraisons ext.
                  </p>
                </div>
              )}

              {error && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#DC2626', fontWeight: 600 }}>
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!success && !loading && (
          <div style={S.footer}>
            <button onClick={onClose}
              style={{ border: '1px solid #D1D9E6', borderRadius: 9, padding: '9px 16px', fontSize: 13, fontWeight: 600, background: '#fff', cursor: 'pointer', color: '#64748B' }}>
              Annuler
            </button>
            <button onClick={handleDispatch} disabled={saving}
              style={{ border: 'none', borderRadius: 9, padding: '9px 18px', fontSize: 13, fontWeight: 700, background: O, color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 7 }}>
              {saving
                ? <><Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> En cours…</>
                : <><Truck style={{ width: 14, height: 14 }} /> {isManuel ? 'Marquer en livraison' : 'Dispatcher'}</>
              }
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
