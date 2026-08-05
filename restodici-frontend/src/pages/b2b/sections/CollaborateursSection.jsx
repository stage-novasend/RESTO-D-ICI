import { Plus, Pencil, Trash2, RefreshCw, Check, X, AlertCircle, Users } from 'lucide-react';
import { formatFCFA } from '../../../utils/formatters';
import { Avatar, BudgetBar } from '../B2BDashboard';
import {
  BG, CARD, TEXT, MUTED, FAINT, BORDER, ORANGE, ORANGE_L, ORANGE_D, RED, RED_L, SH2,
} from '../_colors';

// Extrait de B2BDashboard.jsx — bloc { tab === 'collaborateurs' && (...) }.
export default function CollaborateursSection({
  collabs, setShowInvite, loading,
  confirmDeleteId, setConfirmDeleteId, editBudgetId, setEditBudgetId,
  editBudgetVal, setEditBudgetVal, editBudgetError, setEditBudgetError, editBudgetSaving,
  handleEditBudget, deletingId, deleteError, setDeleteError, handleDeleteCollab,
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold" style={{ color: TEXT }}>Équipe</h2>
          <p className="text-[12px] mt-0.5" style={{ color: FAINT }}>
            {collabs.length} collaborateur{collabs.length !== 1 ? 's' : ''} · budgets mensuels
          </p>
        </div>
        {/* Inviter — orange */}
        <button onClick={() => setShowInvite(true)}
          data-tour="b2b-invite-btn"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white transition hover:opacity-90"
          style={{ background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_D})`, boxShadow: `0 2px 8px ${ORANGE}40` }}>
          <Plus className="w-4 h-4" /> Inviter un collaborateur
        </button>
      </div>

      <div className="rounded-lg overflow-hidden" style={{ background: CARD, boxShadow: SH2 }}>
        {loading ? (
          <div className="p-4 space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-16 rounded-lg animate-pulse" style={{ background: BG }} />)}
          </div>
        ) : collabs.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-14 h-14 rounded-lg mx-auto mb-4 flex items-center justify-center"
              style={{ background: ORANGE_L }}>
              <Users className="w-7 h-7" style={{ color: ORANGE }} />
            </div>
            <p className="text-sm font-bold mb-1" style={{ color: TEXT }}>Aucun collaborateur</p>
            <p className="text-xs mb-5" style={{ color: FAINT }}>Invitez votre équipe pour gérer les déjeuners ensemble</p>
            <button onClick={() => setShowInvite(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold text-white"
              style={{ background: ORANGE }}>
              <Plus className="w-4 h-4" /> Inviter
            </button>
          </div>
        ) : collabs.map((c, idx, arr) => {
          const budget = Number(c.limiteBudget || c.budgetMax || 0);
          const spent  = Number(c.depenseActuelle || c.depenses || 0);
          const isConfirming = confirmDeleteId === c.id;
          const isEditing = editBudgetId === c.id;
          return (
            <div key={c.id} className="transition"
              style={{ borderBottom: idx < arr.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
              {/* Row principale */}
              <div className="flex items-center gap-4 px-5 py-4">
                <Avatar name={c.nom || ''} size={40} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold" style={{ color: TEXT }}>{c.nom || 'Collaborateur'}</p>
                  <p className="text-[11px] mt-0.5 mb-2" style={{ color: FAINT }}>{c.poste || c.email}</p>
                  <BudgetBar spent={spent} budget={budget} />
                </div>
                <div className="text-right shrink-0 hidden sm:block ml-4">
                  <p className="text-[11px]" style={{ color: FAINT }}>Budget mensuel</p>
                  <p className="text-sm font-bold" style={{ color: TEXT }}>{formatFCFA(budget)}</p>
                </div>
                <button
                  onClick={() => {
                    setEditBudgetId(isEditing ? null : c.id);
                    setEditBudgetVal(String(budget));
                    setEditBudgetError('');
                    setConfirmDeleteId(null);
                  }}
                  className="w-9 h-9 rounded-lg flex items-center justify-center border transition hover:opacity-90"
                  style={{ borderColor: BORDER, background: isEditing ? ORANGE_L : BG, color: isEditing ? ORANGE : MUTED }}
                  title="Modifier le budget">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => { setConfirmDeleteId(isConfirming ? null : c.id); setDeleteError(''); setEditBudgetId(null); }}
                  disabled={deletingId === c.id}
                  className="w-9 h-9 rounded-lg flex items-center justify-center border transition hover:opacity-90"
                  style={{ borderColor: '#FECACA', background: isConfirming ? RED : RED_L, color: isConfirming ? '#fff' : RED }}
                  title="Supprimer ce collaborateur">
                  {deletingId === c.id
                    ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </div>
              {/* Inline edit budget */}
              {isEditing && (
                <div className="mx-5 mb-3 px-4 py-3 rounded-lg" style={{ background: ORANGE_L, border: `1px solid ${ORANGE}30` }}>
                  <p className="text-[11px] font-semibold mb-2" style={{ color: ORANGE_D }}>Modifier le budget mensuel de {c.nom}</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={editBudgetVal}
                      onChange={e => setEditBudgetVal(e.target.value)}
                      placeholder="Ex : 50000"
                      className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                      style={{ background: CARD, border: `1.5px solid ${BORDER}`, color: TEXT }}
                      onKeyDown={e => e.key === 'Enter' && handleEditBudget(c.id)}
                    />
                    <span className="text-xs font-semibold shrink-0" style={{ color: MUTED }}>FCFA</span>
                    <button onClick={() => handleEditBudget(c.id)} disabled={editBudgetSaving}
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-white transition"
                      style={{ background: editBudgetSaving ? MUTED : ORANGE }}>
                      {editBudgetSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => { setEditBudgetId(null); setEditBudgetError(''); }}
                      className="w-9 h-9 rounded-lg flex items-center justify-center border text-sm"
                      style={{ borderColor: BORDER, color: MUTED, background: CARD }}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {editBudgetError && <p className="text-xs font-semibold mt-1.5" style={{ color: RED }}>{editBudgetError}</p>}
                </div>
              )}
              {/* Bandeau de confirmation inline */}
              {isConfirming && (
                <div className="mx-5 mb-3 px-4 py-3 rounded-lg flex items-center gap-3"
                  style={{ background: RED_L, border: `1px solid #FECACA` }}>
                  <AlertCircle className="w-4 h-4 shrink-0" style={{ color: RED }} />
                  <p className="flex-1 text-xs font-semibold" style={{ color: '#991B1B' }}>
                    Supprimer <strong>{c.nom}</strong> ? Action irréversible.
                  </p>
                  <button onClick={() => setConfirmDeleteId(null)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border"
                    style={{ borderColor: BORDER, color: MUTED, background: CARD }}>
                    Annuler
                  </button>
                  <button onClick={() => handleDeleteCollab(c.id)}
                    disabled={deletingId === c.id}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white flex items-center gap-1.5"
                    style={{ background: RED }}>
                    {deletingId === c.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
                    Confirmer
                  </button>
                </div>
              )}
              {/* Message d'erreur */}
              {isConfirming && deleteError && (
                <p className="mx-5 mb-3 text-xs font-semibold" style={{ color: RED }}>{deleteError}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
