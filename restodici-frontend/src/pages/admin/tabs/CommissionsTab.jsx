/* CommissionsTab — extrait de AdminDashboard */
import { useState, useEffect } from 'react';
import { X, RefreshCw, CreditCard, TrendingUp, BarChart2, Percent, AlertTriangle, CheckCircle, Pencil } from 'lucide-react';
import { adminAPI } from '../../../services/api';
import { useAdminRevision } from '../../../hooks/useAdminRealtime';
import { ACCENT, EMERALD } from '../_colors';

function CommissionLignesModal({ restaurantId, restaurantNom, onClose, onChanged }) {
  const [lignes, setLignes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    try { const r = await adminAPI.getCommissionLignes(restaurantId); setLignes(r.data || []); }
    catch { /* ignore */ }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [restaurantId]);

  const STATUT_BADGE = {
    DU: { label: 'Dette due', bg: '#FEF3C7', color: '#92400E' },
    PAYE: { label: 'Dette réglée', bg: '#ECFDF5', color: '#059669' },
    A_VERSER: { label: 'À verser', bg: '#EFF6FF', color: '#2563EB' },
    EN_COURS: { label: 'Versement en cours', bg: '#EFF6FF', color: '#2563EB' },
    VERSE: { label: 'Versé', bg: '#ECFDF5', color: '#059669' },
    ECHEC: { label: 'Échec versement', bg: '#FEF2F2', color: '#DC2626' },
    HISTORIQUE: { label: 'Historique', bg: '#F1F5F9', color: '#64748B' },
  };

  const handleRegulariser = async (id) => {
    setBusyId(id);
    try {
      await adminAPI.regulariserDette(id);
      await load();
      onChanged?.();
    } catch { /* ignore */ }
    finally { setBusyId(null); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 720, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0F172A' }}>{restaurantNom} — Commissions & versements</p>
          <button onClick={onClose} style={{ background: '#F1F5F9', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer' }}><X style={{ width: 16, height: 16 }} /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}><RefreshCw style={{ width: 20, height: 20, color: ACCENT, animation: 'spin 1s linear infinite' }} /></div>
          ) : lignes.length === 0 ? (
            <p style={{ padding: 40, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>Aucune ligne pour ce restaurant.</p>
          ) : (
            <div className="overflow-x-auto w-full"><table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['Date', 'Mode', 'Commission', 'Net', 'Statut', 'Échéance', ''].map(h => (
                    <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lignes.map(l => {
                  const badge = STATUT_BADGE[l.statut] || { label: l.statut, bg: '#F1F5F9', color: '#64748B' };
                  const enRetard = l.statut === 'DU' && l.dateEcheance && new Date(l.dateEcheance) < new Date();
                  return (
                    <tr key={l.id} style={{ borderTop: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: '#334155' }}>{new Date(l.createdAt).toLocaleDateString('fr-FR')}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: '#334155' }}>{l.modePaiement || '—'}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, color: '#0F172A' }}>{Number(l.montantCommission).toLocaleString('fr-FR')} FCFA</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: '#334155' }}>{l.montantNet != null ? `${Number(l.montantNet).toLocaleString('fr-FR')} FCFA` : '—'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ background: badge.bg, color: badge.color, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>{badge.label}</span>
                        {enRetard && <span style={{ marginLeft: 6, color: '#DC2626', fontSize: 11, fontWeight: 700 }}>⚠ en retard</span>}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: enRetard ? '#DC2626' : '#64748B' }}>{l.dateEcheance ? new Date(l.dateEcheance).toLocaleDateString('fr-FR') : '—'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        {l.statut === 'DU' && (
                          <button onClick={() => handleRegulariser(l.id)} disabled={busyId === l.id}
                            style={{ padding: '5px 10px', background: EMERALD, color: '#fff', border: 'none', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer', opacity: busyId === l.id ? 0.6 : 1 }}>
                            {busyId === l.id ? '…' : 'Marquer réglé'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CommissionsTab() {
  const revision = useAdminRevision();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [newTaux, setNewTaux] = useState('');
  const [saving, setSaving] = useState(false);
  const [detailResto, setDetailResto] = useState(null);

  const load = async () => {
    setLoading(true);
    try { const r = await adminAPI.getCommissions(); setData(r.data); }
    catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [revision]);

  const handleSaveTaux = async (id) => {
    setSaving(true);
    try {
      await adminAPI.updateTauxCommission(id, parseFloat(newTaux));
      setEditing(null);
      await load();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
      <RefreshCw style={{ width: 22, height: 22, color: ACCENT, animation: 'spin 1s linear infinite' }} />
    </div>
  );

  const kpis = [
    { label: 'Total commissions perçues', value: `${(data?.totalCommissions ?? 0).toLocaleString('fr-FR')} FCFA`, icon: CreditCard, color: '#10B981', bg: '#ECFDF5' },
    { label: 'Commissions ce mois', value: `${(data?.commissionsMois ?? 0).toLocaleString('fr-FR')} FCFA`, icon: TrendingUp, color: '#FF3A03', bg: '#FEF2F2' },
    { label: 'Commandes facturées', value: data?.totalCommandes ?? 0, icon: BarChart2, color: '#FF3A03', bg: 'rgba(234,60,12,0.08)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        {kpis.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} style={{ background: '#fff', borderRadius: 14, padding: '20px 22px', border: '1px solid #D1D9E6', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon style={{ width: 20, height: 20, color }} />
            </div>
            <div>
              <p style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: 0 }}>{value}</p>
              <p style={{ fontSize: 11, color: '#64748B', margin: 0, marginTop: 2 }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tableau par restaurant */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #D1D9E6', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #D1D9E6', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Percent style={{ width: 16, height: 16, color: ACCENT }} />
          <p style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>Commissions par restaurant</p>
          <span style={{ fontSize: 11, color: '#94A3B8', marginLeft: 'auto' }}>Taux modifiable — s'applique aux prochaines commandes</span>
        </div>
        <div className="overflow-x-auto w-full"><table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#EEF2FF', borderBottom: '1px solid #D1D9E6' }}>
              {['Restaurant', 'Statut', 'Commandes', 'Total perçu', 'Dette espèces', 'À verser', 'Taux (%)', 'Action'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data?.parRestaurant ?? []).map((r, i, arr) => (
              <tr key={r.restaurantId} style={{ borderBottom: i < arr.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#0F172A' }}>
                  <button onClick={() => setDetailResto(r)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#0F172A', fontWeight: 600, fontSize: 13, textAlign: 'left' }}>{r.nom}</button>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  {r.bloque ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#FEF2F2', color: '#DC2626', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>
                      <AlertTriangle style={{ width: 11, height: 11 }} /> Bloqué
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#ECFDF5', color: '#059669', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>
                      <CheckCircle style={{ width: 11, height: 11 }} /> OK
                    </span>
                  )}
                </td>
                <td style={{ padding: '12px 16px', fontSize: 13, color: '#334155' }}>{r.totalCommandes}</td>
                <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: '#10B981' }}>{r.totalCommissions.toLocaleString('fr-FR')} FCFA</td>
                <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: r.detteEnRetard > 0 ? '#DC2626' : '#334155' }}>
                  {r.detteEnCours > 0 ? `${r.detteEnCours.toLocaleString('fr-FR')} FCFA` : '—'}
                </td>
                <td style={{ padding: '12px 16px', fontSize: 13, color: '#2563EB' }}>
                  {r.aVerser > 0 ? `${r.aVerser.toLocaleString('fr-FR')} FCFA` : '—'}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  {editing === r.restaurantId ? (
                    <input
                      type="number" value={newTaux} min={0} max={50} step={0.5}
                      onChange={e => setNewTaux(e.target.value)}
                      style={{ width: 70, padding: '4px 8px', border: `1px solid ${ACCENT}`, borderRadius: 7, fontSize: 13, outline: 'none' }}
                    />
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(234,60,12,0.10)', color: ACCENT, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
                      {r.tauxCommission}%
                    </span>
                  )}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  {editing === r.restaurantId ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => handleSaveTaux(r.restaurantId)} disabled={saving}
                        style={{ padding: '5px 12px', background: ACCENT, color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                        {saving ? '…' : 'Sauver'}
                      </button>
                      <button onClick={() => setEditing(null)}
                        style={{ padding: '5px 10px', background: '#F1F5F9', color: '#64748B', border: 'none', borderRadius: 7, fontSize: 12, cursor: 'pointer' }}>
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditing(r.restaurantId); setNewTaux(String(r.tauxCommission)); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: '#F9F9FC', border: '1px solid #E2E8F0', borderRadius: 7, fontSize: 12, color: '#334155', cursor: 'pointer', fontWeight: 500 }}>
                      <Pencil style={{ width: 12, height: 12 }} /> Modifier
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {(data?.parRestaurant ?? []).length === 0 && (
              <tr><td colSpan={8} style={{ padding: '40px 16px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                Aucune commission enregistrée — les commandes livrées génèrent automatiquement les commissions.
              </td></tr>
            )}
          </tbody>
        </table></div>
      </div>

      <p style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center', margin: 0 }}>
        Commission prélevée automatiquement à chaque commande marquée <strong>LIVREE</strong> · Taux par défaut 8% ·
        Paiement en ligne → versement NovaSend automatique · Espèces → dette, 7 jours avant blocage des nouvelles commandes
      </p>

      {detailResto && (
        <CommissionLignesModal
          restaurantId={detailResto.restaurantId}
          restaurantNom={detailResto.nom}
          onClose={() => setDetailResto(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}
