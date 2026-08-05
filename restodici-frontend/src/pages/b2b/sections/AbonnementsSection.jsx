import { Plus, X, AlertCircle, RefreshCw, CheckCircle, CalendarDays, Trash2 } from 'lucide-react';
import { formatFCFA } from '../../../utils/formatters';
import {
  BG, CARD, TEXT, MUTED, FAINT, BORDER, ORANGE, ORANGE_L, ORANGE_D,
  GREEN, GREEN_L, RED, RED_L, AMBER, AMBER_L, SH2,
} from '../_colors';

// Extrait de B2BDashboard.jsx — bloc { tab === 'abonnements' && (...) }.
export default function AbonnementsSection({
  subs, setShowSubForm, setSubFormErr, showSubForm, subForm, setSubForm,
  subFormErr, handleAddSub, subSaving, handleToggleSub, handleDeleteSub,
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold" style={{ color: TEXT }}>Plans repas récurrents</h2>
          <p className="text-[12px] mt-0.5" style={{ color: FAINT }}>
            {subs.length} plan{subs.length !== 1 ? 's' : ''} · Commandes groupées automatiques
          </p>
        </div>
        <button onClick={() => { setShowSubForm(true); setSubFormErr(''); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white transition hover:opacity-90"
          style={{ background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_D})`, boxShadow: `0 2px 8px ${ORANGE}40` }}>
          <Plus className="w-4 h-4" /> Nouveau plan
        </button>
      </div>

      {/* Add form */}
      {showSubForm && (
        <div className="rounded-lg p-5 space-y-3" style={{ background: CARD, boxShadow: SH2 }}>
          <div className="flex items-center justify-between mb-1">
            <p className="font-semibold text-sm" style={{ color: TEXT }}>Nouveau plan repas</p>
            <button onClick={() => { setShowSubForm(false); setSubFormErr(''); }}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:opacity-70"
              style={{ background: BG }}>
              <X className="w-3.5 h-3.5" style={{ color: MUTED }} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold mb-1.5" style={{ color: MUTED }}>Nom du plan *</label>
              <input type="text" value={subForm.nom}
                onChange={e => setSubForm(p => ({ ...p, nom: e.target.value }))}
                placeholder="Ex : Déjeuner équipe commerciale"
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                style={{ background: BG, border: `1.5px solid ${BORDER}`, color: TEXT }} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1.5" style={{ color: MUTED }}>Fréquence</label>
              <select value={subForm.frequence}
                onChange={e => setSubForm(p => ({ ...p, frequence: e.target.value }))}
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                style={{ background: BG, border: `1.5px solid ${BORDER}`, color: TEXT }}>
                <option value="HEBDO">Hebdomadaire</option>
                <option value="MENSUEL">Mensuelle</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-1.5" style={{ color: MUTED }}>Nb repas / livraison</label>
              <input type="number" min="1" value={subForm.nbRepas}
                onChange={e => setSubForm(p => ({ ...p, nbRepas: e.target.value }))}
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                style={{ background: BG, border: `1.5px solid ${BORDER}`, color: TEXT }} />
            </div>
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold mb-1.5" style={{ color: MUTED }}>Budget par repas (FCFA) *</label>
              <input type="number" min="0" value={subForm.budgetRepas}
                onChange={e => setSubForm(p => ({ ...p, budgetRepas: e.target.value }))}
                placeholder="Ex : 5000"
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                style={{ background: BG, border: `1.5px solid ${BORDER}`, color: TEXT }} />
            </div>
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold mb-1.5" style={{ color: MUTED }}>Notes / instructions</label>
              <textarea value={subForm.notes} rows={2}
                onChange={e => setSubForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Allergènes, préférences, instructions particulières…"
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-none"
                style={{ background: BG, border: `1.5px solid ${BORDER}`, color: TEXT }} />
            </div>
          </div>
          {subFormErr && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: RED_L }}>
              <AlertCircle className="w-3.5 h-3.5 shrink-0" style={{ color: RED }} />
              <p className="text-xs font-medium" style={{ color: RED }}>{subFormErr}</p>
            </div>
          )}
          <button onClick={handleAddSub} disabled={subSaving}
            className="w-full py-2.5 rounded-lg text-sm font-bold text-white flex items-center justify-center gap-2 transition hover:opacity-90"
            style={{ background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_D})`, opacity: subSaving ? 0.7 : 1 }}>
            {subSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {subSaving ? 'Enregistrement…' : 'Créer le plan'}
          </button>
        </div>
      )}

      {/* Subscription list */}
      <div className="rounded-lg overflow-hidden" style={{ background: CARD, boxShadow: SH2 }}>
        {subs.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-14 h-14 rounded-lg mx-auto mb-4 flex items-center justify-center"
              style={{ background: ORANGE_L }}>
              <CalendarDays className="w-7 h-7" style={{ color: ORANGE }} />
            </div>
            <p className="text-sm font-bold mb-1" style={{ color: TEXT }}>Aucun plan repas</p>
            <p className="text-xs mb-5" style={{ color: FAINT }}>
              Planifiez des commandes récurrentes pour votre équipe
            </p>
            <button onClick={() => setShowSubForm(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold text-white"
              style={{ background: ORANGE }}>
              <Plus className="w-4 h-4" /> Créer un plan
            </button>
          </div>
        ) : subs.map((s, idx, arr) => (
          <div key={s.id} className="transition"
            style={{ borderBottom: idx < arr.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
            <div className="flex items-start gap-4 px-5 py-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: s.actif ? ORANGE_L : BG }}>
                <CalendarDays className="w-5 h-5" style={{ color: s.actif ? ORANGE : FAINT }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[13px] font-bold" style={{ color: TEXT }}>{s.nom}</p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: s.actif ? GREEN_L : BG, color: s.actif ? GREEN : FAINT }}>
                    {s.actif ? '● Actif' : '⏸ En pause'}
                  </span>
                </div>
                <p className="text-[11px] mt-0.5" style={{ color: FAINT }}>
                  {s.frequence === 'HEBDO' ? 'Hebdomadaire' : 'Mensuelle'} · {s.nbRepas} repas · {formatFCFA(s.budgetRepas)}/repas
                </p>
                {s.actif && (
                  <p className="text-[11px] mt-1 font-medium" style={{ color: ORANGE }}>
                    Prochaine livraison : {s.prochaineLivraison}
                  </p>
                )}
                {s.notes && (
                  <p className="text-[11px] mt-1 italic" style={{ color: MUTED }}>"{s.notes}"</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => handleToggleSub(s.id)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold border transition"
                  style={{
                    borderColor: s.actif ? BORDER : ORANGE,
                    background: s.actif ? BG : ORANGE_L,
                    color: s.actif ? MUTED : ORANGE,
                  }}>
                  {s.actif ? 'Pause' : 'Activer'}
                </button>
                <button onClick={() => handleDeleteSub(s.id)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center border transition"
                  style={{ borderColor: '#FECACA', background: RED_L, color: RED }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {subs.length > 0 && (
        <div className="rounded-lg px-4 py-3 flex items-start gap-3"
          style={{ background: AMBER_L, border: `1px solid ${AMBER}30` }}>
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: AMBER }} />
          <p className="text-[11px]" style={{ color: AMBER }}>
            <strong>Note :</strong> Les plans repas génèrent automatiquement une demande de commande groupée à la date prévue.
            Votre équipe en est notifiée par email.
          </p>
        </div>
      )}
    </div>
  );
}
