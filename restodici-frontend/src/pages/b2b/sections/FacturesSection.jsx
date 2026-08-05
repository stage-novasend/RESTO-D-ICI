import { Eye, RefreshCw, Download, Clock, FileText, Plus, CreditCard } from 'lucide-react';
import { b2bAPI } from '../../../services/api';
import { formatFCFA } from '../../../utils/formatters';
import {
  BG, CARD, NAVY, TEXT, MUTED, FAINT, BORDER,
  ORANGE, ORANGE_D, GREEN, GREEN_L, GREEN_D, RED, RED_L, AMBER, AMBER_L, SH, SH2,
} from '../_colors';

// Extrait de B2BDashboard.jsx — bloc { tab === 'factures' && (...) }.
export default function FacturesSection({
  setViewingSyscohada, isLastDayOfMonth, downloadSyscohadaReport, downloading,
  lastDayDisplay, factures, loading, loadData, setViewingFacture, setPayingFacture,
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold" style={{ color: TEXT }}>Facturation</h2>
          <p className="text-[12px] mt-0.5" style={{ color: FAINT }}>
            Factures mensuelles consolidées · SYSCOHADA TVA 18%
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setViewingSyscohada(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition hover:opacity-80"
            style={{ background: BG, border: `1.5px solid ${BORDER}`, color: TEXT }}>
            <Eye className="w-4 h-4" /> Voir SYSCOHADA
          </button>
          {isLastDayOfMonth ? (
            <button onClick={downloadSyscohadaReport} disabled={downloading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold text-white transition hover:opacity-90"
              style={{ background: `linear-gradient(135deg, ${GREEN}, ${GREEN_D})`, boxShadow: `0 2px 8px ${GREEN}40`, opacity: downloading ? 0.7 : 1 }}>
              {downloading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {downloading ? 'Génération…' : 'Télécharger PDF'}
            </button>
          ) : (
            <span className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold"
              style={{ background: AMBER_L, color: AMBER }}>
              <Clock className="w-4 h-4" /> Export le {lastDayDisplay}
            </span>
          )}
        </div>
      </div>

      {/* KPI factures */}
      {factures.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: 'Total facturé',
              value: formatFCFA(factures.reduce((s, f) => s + Number(f.montantTTC || f.montantTotal || 0), 0)),
              color: NAVY, bg: BG,
            },
            {
              label: 'En attente',
              value: `${factures.filter(f => f.statut !== 'PAYEE').length} facture${factures.filter(f => f.statut !== 'PAYEE').length !== 1 ? 's' : ''}`,
              color: AMBER, bg: AMBER_L,
            },
            {
              label: 'Réglées',
              value: `${factures.filter(f => f.statut === 'PAYEE').length} facture${factures.filter(f => f.statut === 'PAYEE').length !== 1 ? 's' : ''}`,
              color: GREEN, bg: GREEN_L,
            },
          ].map(s => (
            <div key={s.label} className="rounded-lg px-5 py-4" style={{ background: s.bg, boxShadow: SH }}>
              <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[11px] mt-1" style={{ color: MUTED }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg overflow-hidden" style={{ background: CARD, boxShadow: SH2 }}>
        {loading ? (
          <div className="p-4 space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-20 rounded-lg animate-pulse" style={{ background: BG }} />)}
          </div>
        ) : factures.length === 0 ? (
          <div className="py-24 text-center px-6">
            <div className="w-16 h-16 rounded-lg mx-auto mb-4 flex items-center justify-center"
              style={{ background: '#F5F3FF' }}>
              <FileText className="w-8 h-8" style={{ color: '#7C3AED' }} />
            </div>
            <p className="text-base font-bold mb-1" style={{ color: TEXT }}>Aucune facture disponible</p>
            <p className="text-sm mb-6" style={{ color: FAINT }}>Générées automatiquement en fin de mois</p>
            <button
              onClick={async () => {
                try {
                  await b2bAPI.seedFactureTest();
                  await loadData(true);
                } catch (e) {
                  alert(e.response?.data?.message || 'Erreur lors de la création');
                }
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold text-white transition hover:opacity-90"
              style={{ background: `linear-gradient(135deg, #7C3AED, #6D28D9)`, boxShadow: '0 3px 12px rgba(124,58,237,0.35)' }}>
              <Plus className="w-4 h-4" /> Créer une facture de test
            </button>
            <p className="text-[11px] mt-3" style={{ color: FAINT }}>
              Génère une facture fictive de 50 000 FCFA pour tester le paiement
            </p>
          </div>
        ) : factures.map((f, idx, arr) => {
          const isPaid   = f.statut === 'PAYEE' || f.statut === 'paid';
          const isLate   = f.statut === 'RETARDEE' || f.statut === 'OVERDUE';
          const montant  = Number(f.montantTTC || f.montantTotal || 0);
          const montantHT = Math.round(montant / 1.18);
          const tva       = montant - montantHT;
          return (
            <div key={f.id} className="transition"
              style={{ borderBottom: idx < arr.length - 1 ? `1px solid ${BORDER}` : 'none' }}
              onMouseEnter={e => e.currentTarget.style.background = BG}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div className="flex items-center gap-4 px-6 py-5">
                <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: isPaid ? GREEN_L : isLate ? RED_L : AMBER_L }}>
                  <FileText className="w-5 h-5"
                    style={{ color: isPaid ? GREEN : isLate ? RED : AMBER }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[14px] font-bold" style={{ color: TEXT }}>
                      {f.numeroFacture || `Facture ${f.periode || idx + 1}`}
                    </p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: isPaid ? GREEN_L : isLate ? RED_L : AMBER_L,
                        color: isPaid ? GREEN : isLate ? RED : AMBER,
                      }}>
                      {isPaid ? 'Payée ✓' : isLate ? 'En retard !' : 'En attente'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1">
                    <p className="text-[11px]" style={{ color: FAINT }}>
                      {f.periode || ''}
                      {f.echeance ? ` · Échéance ${new Date(f.echeance).toLocaleDateString('fr-FR')}` : ''}
                    </p>
                    <p className="text-[11px]" style={{ color: FAINT }}>
                      HT : {formatFCFA(montantHT)} · TVA 18% : {formatFCFA(tva)}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0 hidden sm:block">
                  <p className="text-[15px] font-bold" style={{ color: TEXT }}>{formatFCFA(montant)}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: FAINT }}>TTC</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {/* Voir le reçu — icône œil ; modal gère download si payée */}
                  <button
                    onClick={() => setViewingFacture(f)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[12px] font-semibold transition hover:opacity-80"
                    style={{
                      borderColor: isPaid ? '#FFE4CC' : BORDER,
                      background: isPaid ? GREEN_L : BG,
                      color: isPaid ? GREEN : MUTED,
                    }}
                    title={isPaid ? 'Voir et télécharger le reçu' : 'Visualiser (lecture seule)'}>
                    <FileText className="w-3.5 h-3.5" />
                    {isPaid ? 'Reçu PDF' : 'Voir'}
                  </button>
                  {/* Payer — orange si en attente / rouge si en retard */}
                  {!isPaid && (
                    <button
                      onClick={() => setPayingFacture(f)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-bold text-white transition hover:opacity-90"
                      style={{
                        background: isLate
                          ? `linear-gradient(135deg, ${RED}, #B91C1C)`
                          : `linear-gradient(135deg, ${ORANGE}, ${ORANGE_D})`,
                        boxShadow: `0 2px 8px ${isLate ? '#DC262640' : '#FF3A0340'}`,
                      }}>
                      <CreditCard className="w-3.5 h-3.5" />
                      {isLate ? 'Régler !' : 'Payer'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
