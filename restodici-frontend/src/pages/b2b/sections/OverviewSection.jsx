import {
  ShoppingBag, Users, FileText, Download, CalendarDays, Shield,
  TrendingUp, Clock, Eye, RefreshCw,
} from 'lucide-react';
import { formatFCFA } from '../../../utils/formatters';
import { CostCenterChart, StatusPill } from '../B2BDashboard';
import {
  BG, CARD, NAVY, TEXT, MUTED, FAINT, BORDER,
  ORANGE, ORANGE_L, ORANGE_D,
  GREEN, GREEN_L, GREEN_D,
  RED, RED_L, AMBER, AMBER_L, SH,
} from '../_colors';

// Extrait de B2BDashboard.jsx — bloc { tab === 'overview' && (...) }.
// Composant purement présentationnel : tout l'état/handlers reste dans l'orchestrateur.
export default function OverviewSection({
  loading, monthlyExp, budgetPct, activeOrders, orders, collabs, unpaidInvoices,
  isBlocked, goTo, budgetTotal, prochainFactureDisplay, navigate,
  doneOrders, orderFilter, setOrderFilter, displayed,
  factures, setViewingSyscohada, isLastDayOfMonth, downloadSyscohadaReport, downloading,
  lastDayDisplay, daysUntilExport, centerCounts,
}) {
  return (
    <div className="space-y-8">

      {/* ── KPI strip ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Dépenses du mois',  value: loading ? '—' : formatFCFA(monthlyExp),        sub: `${budgetPct}% du budget`,                                    color: ORANGE,                          bg: ORANGE_L,  Icon: TrendingUp  },
          { label: 'Commandes actives',  value: loading ? '—' : String(activeOrders.length),  sub: `${orders.length} au total`,                                  color: ORANGE,                          bg: ORANGE_L,  Icon: ShoppingBag },
          { label: 'Collaborateurs',     value: loading ? '—' : String(collabs.length),       sub: 'Budgets maîtrisés',                                           color: GREEN,                           bg: GREEN_L,   Icon: Users       },
          { label: 'Factures impayées',  value: loading ? '—' : String(unpaidInvoices),       sub: unpaidInvoices > 0 ? 'À régler rapidement' : 'Tout est à jour', color: unpaidInvoices > 0 ? RED : MUTED, bg: unpaidInvoices > 0 ? RED_L : BG, Icon: FileText },
        ].map(({ label, value, sub, color, bg, Icon }) => (
          <div key={label}
            className="rounded-lg px-5 py-4 flex items-center gap-4 transition-transform hover:-translate-y-0.5"
            style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: SH, cursor: 'default' }}>
            <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0" style={{ background: bg }}>
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-black leading-none" style={{ color }}>{value}</p>
              <p className="text-[12px] font-semibold mt-1 truncate" style={{ color: TEXT }}>{label}</p>
              <p className="text-[10px] mt-0.5 truncate" style={{ color: FAINT }}>{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Blocked banner */}
      {isBlocked && (
        <div className="rounded-lg border px-5 py-4 flex items-start gap-4"
          style={{ background: RED_L, borderColor: '#FECACA' }}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#FEE2E2' }}>
            <Shield className="w-5 h-5" style={{ color: RED }} />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm" style={{ color: '#991B1B' }}>Compte suspendu — commandes désactivées</p>
            <p className="text-xs mt-1" style={{ color: '#B91C1C' }}>
              Une facture mensuelle est impayée. Réglez votre solde pour rétablir l'accès.
            </p>
          </div>
          <button onClick={() => goTo('factures')}
            className="shrink-0 px-4 py-2 rounded-lg text-xs font-bold text-white" style={{ background: RED }}>
            Voir les factures
          </button>
        </div>
      )}

      {/* ── BENTO GRID ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-5">

        {/* ── Facturation mensuelle — col 8 ─────────────────────────── */}
        <div className="col-span-12 lg:col-span-8 rounded-[32px] p-8 flex flex-col md:flex-row gap-6 transition-all duration-200 hover:-translate-y-1 cursor-default"
          style={{
            background: CARD,
            boxShadow: '0 2px 16px rgba(15,23,42,0.08)',
            border: `1px solid ${BORDER}`,
            animation: 'kpiIn 0.45s cubic-bezier(0.22,1,0.36,1) both',
          }}>
          {/* Left */}
          <div className="flex-1 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: ORANGE_L }}>
                <Download className="w-6 h-6" style={{ color: ORANGE }} />
              </div>
              <p className="text-lg font-bold" style={{ color: TEXT }}>Facturation Mensuelle</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: MUTED }}>
                Montant cumulé en cours
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="px-3 py-1.5 rounded-full text-[11px] font-bold"
                style={{
                  background: budgetPct > 85 ? RED_L : budgetPct > 65 ? ORANGE_L : '#FFECDF',
                  color: budgetPct > 85 ? RED : budgetPct > 65 ? ORANGE_D : GREEN,
                }}>
                Budget utilisé : {budgetPct}%
              </span>
              <span className="px-3 py-1.5 rounded-full text-[11px] font-bold"
                style={{ background: ORANGE_L, color: ORANGE }}>
                {orders.length} commande{orders.length !== 1 ? 's' : ''} ce mois
              </span>
              {activeOrders.length > 0 && (
                <span className="px-3 py-1.5 rounded-full text-[11px] font-bold"
                  style={{ background: AMBER_L, color: AMBER }}>
                  {activeOrders.length} en cours
                </span>
              )}
            </div>
            {budgetTotal > 0 && (
              <div>
                <div className="flex justify-between text-[11px] mb-1.5" style={{ color: MUTED }}>
                  <span>Consommation</span>
                  <span style={{ fontWeight: 700, color: budgetPct > 85 ? RED : budgetPct > 65 ? ORANGE : GREEN }}>
                    {formatFCFA(monthlyExp)} / {formatFCFA(budgetTotal)}
                  </span>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden" style={{ background: BG }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${budgetPct}%`,
                      background: budgetPct > 85
                        ? 'linear-gradient(90deg,#EF4444,#F87171)'
                        : budgetPct > 65
                          ? `linear-gradient(90deg,${ORANGE},#FFA040)`
                          : 'linear-gradient(90deg,#FF3A03,#F59E0B)',
                    }} />
                </div>
              </div>
            )}
          </div>
          {/* Right panel */}
          <div className="rounded-lg p-6 flex flex-col justify-between min-w-[200px]"
            style={{
              background: isBlocked ? RED_L : BG,
              border: `1px solid ${isBlocked ? '#FECACA' : BORDER}`,
            }}>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em]"
                style={{ color: isBlocked ? RED : MUTED }}>
                {isBlocked ? 'COMPTE BLOQUÉ' : 'PROCHAIN PRÉLÈVEMENT'}
              </p>
              <p className="text-xl font-bold mt-2" style={{ color: isBlocked ? RED : TEXT }}>
                {loading ? '—' : isBlocked ? 'Facture impayée' : (prochainFactureDisplay || 'Fin du mois')}
              </p>
              {!isBlocked && (
                <p className="text-[11px] mt-1" style={{ color: FAINT }}>Génération automatique</p>
              )}
            </div>
            <button
              onClick={() => isBlocked ? goTo('factures') : goTo('factures')}
              className="mt-5 w-full py-3 rounded-lg font-bold text-sm transition hover:opacity-90"
              style={{
                background: isBlocked ? RED : NAVY,
                color: '#fff',
              }}>
              {isBlocked ? 'Régler maintenant' : 'Voir Détails'}
            </button>
          </div>
        </div>

        {/* ── Commandes groupées — col 4 ────────────────────────────── */}
        <div className="col-span-12 lg:col-span-4 rounded-[32px] p-8 flex flex-col justify-between relative overflow-hidden transition-all duration-200 hover:-translate-y-1 cursor-default"
          style={{
            background: `linear-gradient(135deg, ${ORANGE} 0%, #FF6B00 50%, ${ORANGE_D} 100%)`,
            boxShadow: `0 8px 28px ${ORANGE}50`,
            animation: 'kpiIn 0.45s 0.1s cubic-bezier(0.22,1,0.36,1) both',
          }}>
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.20)' }}>
              <Users className="w-6 h-6 text-white" />
            </div>
            <h4 className="text-xl font-bold text-white">Commandes Groupées</h4>
            <p className="text-sm text-white/70 leading-relaxed">
              Planifiez les repas groupés de la semaine pour vos {collabs.length > 0 ? `${collabs.length} collaborateur${collabs.length > 1 ? 's' : ''}` : 'équipes'}.
            </p>
          </div>
          {isBlocked ? (
            <button disabled
              className="relative mt-8 w-full py-3.5 rounded-lg font-bold text-sm"
              style={{ background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.5)', cursor: 'not-allowed' }}>
              Commandes désactivées
            </button>
          ) : (
            <div className="mt-8 flex flex-col gap-2">
              <button onClick={() => navigate('/b2b/order?mode=instant')}
                className="w-full py-3 rounded-lg font-bold text-sm transition hover:opacity-90"
                style={{ background: 'rgba(255,255,255,0.22)', color: '#fff', border: '1px solid rgba(255,255,255,0.30)' }}>
                ⚡ Commander maintenant
              </button>
              <button onClick={() => navigate('/b2b/order?mode=schedule')}
                className="w-full py-2.5 rounded-lg font-semibold text-sm transition hover:opacity-80"
                style={{ background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.20)' }}>
                <span className="flex items-center justify-center gap-1.5">
                  <CalendarDays className="w-4 h-4" /> Planifier pour plus tard
                </span>
              </button>
            </div>
          )}
        </div>

        {/* ── Historique commandes — col 12 ─────────────────────────── */}
        <div className="col-span-12 rounded-[32px] overflow-hidden transition-all duration-200 hover:-translate-y-1"
          style={{ background: CARD, boxShadow: '0 2px 16px rgba(139,110,80,0.08)', border: `1px solid ${BORDER}` }}>

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 px-8 py-6"
            style={{ borderBottom: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-5 h-5" style={{ color: ORANGE }} />
              <h4 className="text-lg font-bold" style={{ color: TEXT }}>Historique des Commandes</h4>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Cost center tabs */}
              <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: BG }}>
                {[
                  { k: 'all',    label: 'Tous' },
                  { k: 'active', label: `En cours (${activeOrders.length})` },
                  { k: 'done',   label: `Terminées (${doneOrders.length})` },
                ].map(f => (
                  <button key={f.k} onClick={() => setOrderFilter(f.k)}
                    className="px-4 py-2 rounded-lg text-[12px] font-semibold transition"
                    style={{
                      background: orderFilter === f.k ? CARD : 'transparent',
                      color: orderFilter === f.k ? TEXT : MUTED,
                      boxShadow: orderFilter === f.k ? '0 1px 4px rgba(15,23,42,0.08)' : 'none',
                    }}>
                    {f.label}
                  </button>
                ))}
              </div>
              <button onClick={() => goTo('orders')}
                className="px-4 py-2 rounded-lg text-[12px] font-semibold transition hover:opacity-80"
                style={{ background: ORANGE_L, color: ORANGE }}>
                Voir tout →
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <div className="overflow-x-auto w-full"><table className="w-full text-left">
              <thead style={{ borderBottom: `1px solid ${BORDER}` }}>
                <tr>
                  {['COMMANDE #', 'DATE', 'CENTRE DE COÛTS', 'ARTICLES', 'MONTANT', 'STATUT'].map(h => (
                    <th key={h} className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.18em]"
                      style={{ color: FAINT }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [1,2,3,4].map(i => (
                    <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <td colSpan={6} className="px-8 py-5">
                        <div className="h-5 rounded-full animate-pulse w-3/4" style={{ background: BG }} />
                      </td>
                    </tr>
                  ))
                ) : displayed.slice(0, 6).map((o, idx, arr) => {
                  const st = o.statut ?? o.status ?? '';
                  const center = o.centreDeCout || o.centre || o.costCenter || 'Autres';
                  const items  = o.lignes?.length || o.nombrePlats || '—';
                  return (
                    <tr key={o.id}
                      className="cursor-pointer transition-colors"
                      style={{ borderBottom: idx < arr.length - 1 ? `1px solid ${BORDER}` : 'none' }}
                      onMouseEnter={e => e.currentTarget.style.background = BG}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      onClick={() => navigate(o.numero?.startsWith('GRP-') ? `/b2b/suivi/${o.id}` : `/suivi/${o.id}`)}>
                      <td className="px-8 py-5 font-bold text-[13px]" style={{ color: TEXT }}>
                        {o.numero || `#${o.id?.slice(0, 8)}`}
                      </td>
                      <td className="px-8 py-5 text-[13px]" style={{ color: MUTED }}>
                        {o.dateLivraison
                          ? new Date(o.dateLivraison).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                          : '—'}
                      </td>
                      <td className="px-8 py-5">
                        <span className="px-3 py-1 rounded-full text-[11px] font-bold"
                          style={{ background: ORANGE_L, color: ORANGE_D }}>
                          {center}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-[13px]" style={{ color: MUTED }}>
                        {items !== '—' ? `${items} article${items > 1 ? 's' : ''}` : '—'}
                      </td>
                      <td className="px-8 py-5 font-bold text-[13px]" style={{ color: ORANGE }}>
                        {formatFCFA(o.total || o.totalEstime || o.montantTotal || 0)}
                      </td>
                      <td className="px-8 py-5"><StatusPill statut={st} /></td>
                    </tr>
                  );
                })}
                {!loading && orders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-8 py-16 text-center text-sm" style={{ color: FAINT }}>
                      Aucune commande ce mois — passez votre première commande d'équipe
                    </td>
                  </tr>
                )}
              </tbody>
            </table></div>
          </div>
        </div>

        {/* ── SYSCOHADA — col 5 ─────────────────────────────────────── */}
        <div className="col-span-12 lg:col-span-5 rounded-[32px] p-8 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1"
          style={{ background: BG, border: `1px solid ${BORDER}`, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: GREEN_L }}>
                <Download className="w-6 h-6" style={{ color: GREEN }} />
              </div>
              <h4 className="text-lg font-bold" style={{ color: TEXT }}>Reporting SYSCOHADA</h4>
            </div>
            <p className="text-sm leading-relaxed mb-6" style={{ color: MUTED }}>
              Générez automatiquement vos rapports de conformité fiscale pour la comptabilité OHADA en un clic.
            </p>
            {/* Latest facture preview */}
            {factures.length > 0 && (
              <div className="rounded-lg border p-4 flex items-center justify-between"
                style={{ background: CARD, borderColor: BORDER }}>
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 shrink-0" style={{ color: GREEN }} />
                  <p className="text-[13px] font-semibold" style={{ color: TEXT }}>
                    {factures[0].numeroFacture || `Rapport ${factures[0].periode || ''}`}
                  </p>
                </div>
                <p className="text-[11px] font-bold" style={{ color: MUTED }}>
                  {formatFCFA(factures[0].montantTTC || 0)}
                </p>
              </div>
            )}
          </div>
          <div className="mt-8 space-y-2.5">
            <button onClick={() => setViewingSyscohada(true)}
              className="w-full py-3.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition hover:opacity-80"
              style={{ background: BG, border: `1.5px solid ${BORDER}`, color: TEXT }}>
              <Eye className="w-4 h-4" /> Voir le rapport
            </button>
            {isLastDayOfMonth ? (
              <button onClick={downloadSyscohadaReport} disabled={downloading}
                className="w-full py-3.5 rounded-lg font-bold text-sm text-white flex items-center justify-center gap-2 transition hover:opacity-90"
                style={{ background: `linear-gradient(135deg, ${GREEN}, ${GREEN_D})`, boxShadow: `0 4px 16px ${GREEN}40`, opacity: downloading ? 0.7 : 1 }}>
                {downloading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {downloading ? 'Génération…' : 'Télécharger Rapport Mensuel'}
              </button>
            ) : (
              <div className="rounded-lg p-3.5 flex items-center gap-3"
                style={{ background: AMBER_L, border: `1px solid #FDE68A` }}>
                <Clock className="w-4 h-4 shrink-0" style={{ color: AMBER }} />
                <div>
                  <p className="text-[12px] font-bold" style={{ color: AMBER }}>Téléchargement le {lastDayDisplay}</p>
                  <p className="text-[11px]" style={{ color: '#92400E' }}>
                    {daysUntilExport > 1 ? `encore ${daysUntilExport} jours` : 'demain'} · OHADA · TVA 18%
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Centres de coûts — Doughnut Chart — col 7 ─────────────────── */}
        <div className="col-span-12 lg:col-span-7 rounded-lg p-7 relative overflow-hidden transition-all duration-200"
          style={{ background: '#FFFFFF', border: `1px solid #E2E8F0`, boxShadow: '0 4px 20px rgba(15, 23, 42, 0.05)' }}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-base font-bold text-slate-800">Répartition par Centre de Coûts</h4>
              <p className="text-[12px] text-slate-500 font-medium mt-0.5">Mois en cours</p>
            </div>
            {Object.keys(centerCounts).length > 0 && (
              <span className="text-[11px] font-bold px-3 py-1.5 rounded-lg" style={{ background: '#FFF5ED', color: '#CC2402' }}>
                {Object.keys(centerCounts).length} centres
              </span>
            )}
          </div>

          <div className="mt-4">
            <CostCenterChart data={centerCounts} total={orders.length} />
          </div>
        </div>

      </div>
    </div>
  );
}
