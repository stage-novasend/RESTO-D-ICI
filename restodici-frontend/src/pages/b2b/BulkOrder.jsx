import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Plus, Trash2, Clock, MapPin, ChevronRight, AlertCircle, CheckCircle } from 'lucide-react';
import { menuAPI, b2bAPI } from '../../services/api';

const ACCENT = '#C05015';
const CREAM = '#0F172A';
const MUTED = '#64748B';
const GOLD = '#F97316';
const BORDER = 'rgba(89,67,42,0.10)';

export default function BulkOrder() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [collaborateurs, setCollaborateurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [livraison, setLivraison] = useState({
    dateLivraison: '',
    heureLivraison: '',
    lieuLivraison: '',
    adresseLivraison: '',
  });

  const [lignes, setLignes] = useState([
    { articleId: '', nomArticle: '', quantite: 1, prixUnitaire: 0, collaborateurId: '', instructions: '' },
  ]);

  useEffect(() => { void load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [menuRes, collabRes] = await Promise.allSettled([
        menuAPI.getAll({}),
        b2bAPI.getCollaborateurs(),
      ]);
      setArticles(menuRes.status === 'fulfilled' ? (menuRes.value.data || []) : []);
      setCollaborateurs(collabRes.status === 'fulfilled' ? (collabRes.value.data || []) : []);
    } catch {
      setError('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const addLigne = () => {
    setLignes(prev => [...prev, { articleId: '', nomArticle: '', quantite: 1, prixUnitaire: 0, collaborateurId: '', instructions: '' }]);
  };

  const removeLigne = (idx) => {
    if (lignes.length === 1) return;
    setLignes(prev => prev.filter((_, i) => i !== idx));
  };

  const updateLigne = (idx, field, value) => {
    setLignes(prev => prev.map((l, i) => {
      if (i !== idx) return l;
      if (field === 'articleId') {
        const art = articles.find(a => a.id === value);
        return { ...l, articleId: value, nomArticle: art?.nom ?? '', prixUnitaire: Number(art?.prix ?? 0) };
      }
      return { ...l, [field]: value };
    }));
  };

  const totalEstime = lignes.reduce((s, l) => s + (l.quantite || 0) * (l.prixUnitaire || 0), 0);
  const totalCouverts = lignes.reduce((s, l) => s + (Number(l.quantite) || 0), 0);

  // Min delivery: now + 4h
  const minDateTime = (() => {
    const d = new Date(Date.now() + 4 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 16);
  })();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!livraison.dateLivraison || !livraison.heureLivraison || !livraison.lieuLivraison) {
      setError('Date, heure et lieu de livraison requis');
      return;
    }
    if (lignes.some(l => !l.articleId)) {
      setError('Sélectionnez un article pour chaque ligne');
      return;
    }
    if (totalCouverts < 1) {
      setError('Au moins 1 couvert requis');
      return;
    }

    const deliveryDateTime = new Date(`${livraison.dateLivraison}T${livraison.heureLivraison}`);
    if (deliveryDateTime < new Date(Date.now() + 4 * 60 * 60 * 1000)) {
      setError('Délai minimum de 4 heures avant la livraison');
      return;
    }

    setSubmitting(true);
    try {
      await b2bAPI.createCommandeGroupee({
        dateLivraison: livraison.dateLivraison,
        heureLivraison: livraison.heureLivraison,
        lieuLivraison: livraison.lieuLivraison,
        adresseLivraison: livraison.adresseLivraison || livraison.lieuLivraison,
        lignes: lignes.map(l => ({
          articleId: l.articleId,
          nomArticle: l.nomArticle,
          quantite: Number(l.quantite),
          prixUnitaire: Number(l.prixUnitaire),
          collaborateurId: l.collaborateurId || undefined,
          instructions: l.instructions || undefined,
        })),
      });
      setSuccess('Commande groupée créée — le restaurant a été notifié');
      setTimeout(() => navigate('/b2b/orders'), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la commande');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDF5EF]">
        <div className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: ACCENT, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8 bg-[#FDF5EF]">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: GOLD }}>Commande groupée</p>
          <h1 className="mt-1 text-2xl font-bold" style={{ color: CREAM }}>Nouvelle commande d'équipe</h1>
          <p className="mt-1 text-sm" style={{ color: MUTED }}>Délai minimum 4 heures · Budget collaborateur vérifié automatiquement</p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 shrink-0" /> {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Delivery info */}
          <section className="rounded-2xl border bg-white p-5" style={{ borderColor: BORDER }}>
            <h2 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: CREAM }}>
              <Clock className="h-4 w-4" style={{ color: GOLD }} />
              Livraison
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: MUTED }}>Date *</label>
                <input
                  type="date" required
                  min={minDateTime.slice(0, 10)}
                  value={livraison.dateLivraison}
                  onChange={e => setLivraison(p => ({ ...p, dateLivraison: e.target.value }))}
                  className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                  style={{ borderColor: BORDER }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: MUTED }}>Heure *</label>
                <input
                  type="time" required
                  value={livraison.heureLivraison}
                  onChange={e => setLivraison(p => ({ ...p, heureLivraison: e.target.value }))}
                  className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                  style={{ borderColor: BORDER }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: MUTED }}>Lieu de livraison *</label>
                <input
                  type="text" required
                  value={livraison.lieuLivraison}
                  onChange={e => setLivraison(p => ({ ...p, lieuLivraison: e.target.value }))}
                  placeholder="Siège social, Cocody"
                  className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                  style={{ borderColor: BORDER }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: MUTED }}>Adresse complète</label>
                <input
                  type="text"
                  value={livraison.adresseLivraison}
                  onChange={e => setLivraison(p => ({ ...p, adresseLivraison: e.target.value }))}
                  placeholder="Rue, Quartier, Ville"
                  className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                  style={{ borderColor: BORDER }}
                />
              </div>
            </div>
          </section>

          {/* Order lines */}
          <section className="rounded-2xl border bg-white p-5" style={{ borderColor: BORDER }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-sm flex items-center gap-2" style={{ color: CREAM }}>
                <Package className="h-4 w-4" style={{ color: GOLD }} />
                Plats commandés
              </h2>
              <button
                type="button" onClick={addLigne}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-white transition"
                style={{ background: ACCENT }}
              >
                <Plus className="h-3.5 w-3.5" /> Ajouter
              </button>
            </div>

            <div className="space-y-3">
              {lignes.map((ligne, idx) => (
                <div key={idx} className="rounded-xl border p-3 space-y-2" style={{ borderColor: BORDER, background: '#FDFCFB' }}>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-medium mb-1" style={{ color: MUTED }}>Article *</label>
                      <select
                        required
                        value={ligne.articleId}
                        onChange={e => updateLigne(idx, 'articleId', e.target.value)}
                        className="w-full rounded-lg border px-2.5 py-2 text-sm outline-none"
                        style={{ borderColor: BORDER }}
                      >
                        <option value="">— Choisir —</option>
                        {articles.map(a => (
                          <option key={a.id} value={a.id}>{a.nom} — {Number(a.prix).toLocaleString()} FCFA</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium mb-1" style={{ color: MUTED }}>Quantité</label>
                      <input
                        type="number" min="1" required
                        value={ligne.quantite}
                        onChange={e => updateLigne(idx, 'quantite', e.target.value)}
                        className="w-full rounded-lg border px-2.5 py-2 text-sm outline-none"
                        style={{ borderColor: BORDER }}
                      />
                    </div>
                    <div className="flex items-end gap-1">
                      <div className="flex-1">
                        <label className="block text-[10px] font-medium mb-1" style={{ color: MUTED }}>Sous-total</label>
                        <div className="rounded-lg border px-2.5 py-2 text-sm font-medium" style={{ borderColor: BORDER, color: GOLD }}>
                          {((ligne.quantite || 0) * (ligne.prixUnitaire || 0)).toLocaleString()} F
                        </div>
                      </div>
                      {lignes.length > 1 && (
                        <button type="button" onClick={() => removeLigne(idx)} className="p-2 rounded-lg hover:bg-red-50 transition">
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {collaborateurs.length > 0 && (
                      <div>
                        <label className="block text-[10px] font-medium mb-1" style={{ color: MUTED }}>Collaborateur (optionnel)</label>
                        <select
                          value={ligne.collaborateurId}
                          onChange={e => updateLigne(idx, 'collaborateurId', e.target.value)}
                          className="w-full rounded-lg border px-2.5 py-2 text-sm outline-none"
                          style={{ borderColor: BORDER }}
                        >
                          <option value="">— Sans attribution —</option>
                          {collaborateurs.filter(c => c.actif).map(c => (
                            <option key={c.id} value={c.id}>
                              {c.nom} (solde: {(c.soldeDisponible ?? 0).toLocaleString()} F)
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="block text-[10px] font-medium mb-1" style={{ color: MUTED }}>Instructions spéciales</label>
                      <input
                        type="text"
                        value={ligne.instructions}
                        onChange={e => updateLigne(idx, 'instructions', e.target.value)}
                        placeholder="Sans piment, extra sauce..."
                        className="w-full rounded-lg border px-2.5 py-2 text-sm outline-none"
                        style={{ borderColor: BORDER }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Summary */}
          <section className="sticky bottom-0 rounded-2xl border bg-white p-5 shadow-sm" style={{ borderColor: BORDER }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs" style={{ color: MUTED }}>{totalCouverts} couvert(s)</p>
                <p className="text-2xl font-bold mt-1" style={{ color: CREAM }}>{totalEstime.toLocaleString()} FCFA</p>
                <p className="text-xs mt-0.5" style={{ color: GOLD }}>TVA 18% sera ajoutée à la facturation mensuelle</p>
              </div>
              <button
                type="submit" disabled={submitting || !!success}
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3 font-semibold text-white transition disabled:opacity-50"
                style={{ background: ACCENT }}
              >
                {submitting ? 'Envoi...' : 'Confirmer la commande'}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        </form>
      </div>
    </div>
  );
}
