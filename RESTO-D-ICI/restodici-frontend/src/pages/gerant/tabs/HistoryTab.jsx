/* HistoryTab — extrait de GerantDashboard */
import { useCallback, useEffect, useState } from "react";
import { Activity, AlertTriangle, RefreshCcw, Users } from "lucide-react";
import { commandesService } from "../../../services/api";

export default function HistoryTab({ restaurantId }) {
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [limit, setLimit] = useState(50);

  const load = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    setError('');
    try {
      const res = await commandesService.getRestaurantActivity(limit);
      setActivity(Array.isArray(res.data) ? res.data : []);
    } catch {
      setError('Impossible de charger l\'historique');
    } finally {
      setLoading(false);
    }
  }, [restaurantId, limit]);

  useEffect(() => { void load(); }, [load]);

  const STATUS_COLORS_MAP = {
    RECUE: { bg: '#DBEAFE', color: '#1D4ED8' },
    CONFIRMEE: { bg: '#EDE9FE', color: '#6D28D9' },
    EN_PREP: { bg: '#FEF3C7', color: '#B45309' },
    PRETE: { bg: '#D1FAE5', color: '#065F46' },
    EN_LIVRAISON: { bg: '#FCE7F3', color: '#9D174D' },
    LIVREE: { bg: '#D1FAE5', color: '#065F46' },
    ANNULEE: { bg: '#FEE2E2', color: '#991B1B' },
  };

  const STAT_LABELS = {
    RECUE: 'Reçue', CONFIRMEE: 'Confirmée', EN_PREP: 'En préparation',
    PRETE: 'Prête', EN_LIVRAISON: 'En livraison', LIVREE: 'Livrée', ANNULEE: 'Annulée',
  };

  const byDay = {};
  for (const e of activity) {
    const day = new Date(e.createdAt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(e);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#1A0C00]">Historique d'activité</h2>
          <p className="text-sm text-[#8B6E50] mt-0.5">Audit complet des changements de statut des commandes</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={limit}
            onChange={e => setLimit(Number(e.target.value))}
            className="text-sm rounded-xl border border-[#E2E8F0] px-3 py-2 bg-white focus:outline-none"
          >
            <option value={20}>20 derniers</option>
            <option value={50}>50 derniers</option>
            <option value={100}>100 derniers</option>
            <option value={200}>200 derniers</option>
          </select>
          <button
            onClick={() => void load()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: '#EA580C' }}
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#EA580C', borderTopColor: 'transparent' }} />
        </div>
      ) : activity.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-[#E2E8F0] bg-white">
          <Activity className="w-10 h-10 text-[#D1D5DB] mx-auto mb-3" />
          <p className="text-sm font-semibold text-[#374151]">Aucune activité enregistrée</p>
          <p className="text-xs text-[#9CA3AF] mt-1">Les changements de statut s'afficheront ici</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byDay).map(([day, entries]) => (
            <div key={day}>
              <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider mb-3">{day}</p>
              <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden divide-y divide-[#FFF5E6]">
                {entries.map(entry => {
                  const prevStyle = entry.statutPrecedent ? STATUS_COLORS_MAP[entry.statutPrecedent] : null;
                  const nextStyle = STATUS_COLORS_MAP[entry.statutNouvel] || { bg: '#F3F4F6', color: '#374151' };
                  const time = new Date(entry.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div key={entry.id} className="flex items-center gap-4 px-5 py-3.5">
                      <div className="w-12 text-right shrink-0">
                        <span className="text-xs text-[#9CA3AF] font-medium">{time}</span>
                      </div>
                      <div className="w-px h-8 bg-[#E2E8F0] shrink-0" />
                      <div className="flex-1 min-w-0 flex items-center gap-3 flex-wrap">
                        <span className="text-sm font-bold text-[#1A0C00]">
                          #{entry.commandeNumero || entry.commandeId?.slice(0, 8)}
                        </span>
                        {prevStyle && (
                          <>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: prevStyle.bg, color: prevStyle.color }}>
                              {STAT_LABELS[entry.statutPrecedent] || entry.statutPrecedent}
                            </span>
                            <span className="text-[#9CA3AF] text-xs">→</span>
                          </>
                        )}
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: nextStyle.bg, color: nextStyle.color }}>
                          {STAT_LABELS[entry.statutNouvel] || entry.statutNouvel}
                        </span>
                        {entry.actorNom && (
                          <span className="text-xs text-[#8B6E50] flex items-center gap-1">
                            <Users className="w-3 h-3" /> {entry.actorNom}
                          </span>
                        )}
                        {entry.actorRole && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                            style={{ background: '#FFF5E6', color: '#8B6E50' }}>
                            {entry.actorRole}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════ Module Vue d'ensemble dynamique ══════════════════ */

/* ── Setup completion banner ── */
