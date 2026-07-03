import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Plus, Trash2, X, Send, CheckCircle, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
import { b2bAPI } from '../../services/api';
import { formatFCFA } from '../../utils/formatters';

// ── Design tokens ──────────────────────────────────────────────────────────────
const BG     = '#FFF4ED';
const CARD   = '#FFFFFF';
const TEXT   = '#1A0C00';
const MUTED  = '#8B6E50';
const FAINT  = '#A89070';
const BORDER = '#E2E8F0';
const ORANGE = '#EA580C';    // CTA — inviter, enregistrer
const ORANGE_L = '#FFF3E0';
const ORANGE_D = '#E07800';
const GREEN  = '#16A34A';    // succès, invitation envoyée
const GREEN_L= '#DCFCE7';
const GREEN_D= '#15803D';
const RED    = '#DC2626';    // supprimer (action risquée)
const RED_L  = '#FEF2F2';
const SH     = '0 1px 3px rgba(139,110,80,0.07),0 1px 2px rgba(139,110,80,0.04)';
const SH2    = '0 4px 16px rgba(139,110,80,0.10),0 2px 4px rgba(139,110,80,0.06)';
const SH3    = '0 20px 40px rgba(139,110,80,0.15),0 4px 8px rgba(139,110,80,0.06)';

function Avatar({ name = '', size = 36 }) {
  const ini = name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  const hue = ((name.charCodeAt(0) || 0) * 37) % 360;
  return (
    <div className="rounded-full flex items-center justify-center font-bold shrink-0 select-none"
      style={{ width: size, height: size, fontSize: size * 0.38,
        background: `hsl(${hue},65%,88%)`, color: `hsl(${hue},65%,32%)` }}>
      {ini}
    </div>
  );
}

function BudgetBar({ spent, budget }) {
  const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const bar = pct > 85 ? RED : pct > 65 ? ORANGE : GREEN;
  return (
    <div>
      <div className="flex justify-between text-[10px] mb-1" style={{ color: FAINT }}>
        <span>{formatFCFA(spent)} dépensé</span>
        <span style={{ color: pct > 85 ? RED : pct > 65 ? ORANGE : MUTED, fontWeight: 600 }}>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: BORDER }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: bar }} />
      </div>
    </div>
  );
}

function InviteModal({ onClose, onDone }) {
  const [form, setForm] = useState({ nom: '', email: '', poste: '', budgetMensuel: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [sent, setSent] = useState(false);
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="rounded-2xl w-full max-w-sm overflow-hidden" style={{ background: CARD, boxShadow: SH3 }}>

        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: ORANGE_L }}>
              <Users className="w-4 h-4" style={{ color: ORANGE }} />
            </div>
            <p className="text-sm font-bold" style={{ color: TEXT }}>Inviter un collaborateur</p>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:opacity-70 transition"
            style={{ background: BG }}>
            <X className="w-3.5 h-3.5" style={{ color: MUTED }} />
          </button>
        </div>

        {sent ? (
          <div className="p-8 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: GREEN_L }}>
              <CheckCircle className="w-7 h-7" style={{ color: GREEN }} />
            </div>
            <p className="text-base font-bold mb-1" style={{ color: TEXT }}>Invitation envoyée !</p>
            <p className="text-xs mb-5" style={{ color: MUTED }}>
              Email envoyé à <strong style={{ color: TEXT }}>{form.email}</strong>
            </p>
            <button onClick={() => { onDone(); onClose(); }}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition hover:opacity-90"
              style={{ background: GREEN }}>
              Fermer
            </button>
          </div>
        ) : (
          <div className="p-5 space-y-3">
            {[
              { k: 'nom',           label: 'Nom complet *',          type: 'text',   ph: 'Jean Konan' },
              { k: 'email',         label: 'Email professionnel *',  type: 'email',  ph: 'jean@entreprise.ci' },
              { k: 'poste',         label: 'Poste',                  type: 'text',   ph: 'Directeur commercial' },
              { k: 'budgetMensuel', label: 'Budget mensuel (FCFA)',   type: 'number', ph: '50 000' },
            ].map(f => (
              <div key={f.k}>
                <label className="block text-[11px] font-bold mb-1.5" style={{ color: MUTED }}>{f.label}</label>
                <input type={f.type} value={form[f.k]} placeholder={f.ph} onChange={set(f.k)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition"
                  style={{ background: BG, border: `1.5px solid ${BORDER}`, color: TEXT }} />
              </div>
            ))}
            {err && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: RED_L }}>
                <AlertCircle className="w-3.5 h-3.5 shrink-0" style={{ color: RED }} />
                <p className="text-xs font-medium" style={{ color: RED }}>{err}</p>
              </div>
            )}
            <p className="text-[11px]" style={{ color: FAINT }}>Un lien d'activation sera envoyé par email.</p>
            {/* Envoyer invitation — orange */}
            <button
              onClick={async () => {
                if (!form.nom || !form.email) { setErr('Nom et email requis'); return; }
                setSaving(true); setErr('');
                try {
                  await b2bAPI.createCollaborateur({
                    nom: form.nom, email: form.email, poste: form.poste,
                    budgetMensuel: form.budgetMensuel ? parseFloat(form.budgetMensuel) : undefined,
                  });
                  setSent(true);
                } catch (e) { setErr(e.response?.data?.message || 'Erreur'); }
                finally { setSaving(false); }
              }}
              disabled={saving}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition hover:opacity-90"
              style={{ background: saving ? MUTED : ORANGE, cursor: saving ? 'wait' : 'pointer' }}>
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {saving ? 'Envoi en cours…' : "Envoyer l'invitation"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function B2BTeams() {
  const [collabs, setCollabs]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showInvite, setShowInvite]     = useState(false);
  const [deleting, setDeleting]         = useState('');
  const [editingBudget, setEditingBudget] = useState(null);

  const load = () => {
    setLoading(true);
    b2bAPI.getCollaborateurs()
      .then(r => setCollabs(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id, nom) => {
    if (!confirm(`Supprimer ${nom || 'ce collaborateur'} ? Cette action est irréversible.`)) return;
    setDeleting(id);
    try { await b2bAPI.deleteCollaborateur(id); load(); } catch { /* ignore */ }
    finally { setDeleting(''); }
  };

  const totalBudget = collabs.reduce((s, c) => s + Number(c.limiteBudget || 0), 0);
  const totalSpent  = collabs.reduce((s, c) => s + Number(c.depenseActuelle || 0), 0);

  return (
    <div className="min-h-screen" style={{ background: BG }}>

      {/* Header — unified white/orange */}
      <div className="sticky top-0 z-10 bg-white" style={{ borderBottom: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <Link to="/b2b" className="flex items-center gap-1.5 text-[12px] font-medium hover:opacity-70 transition"
            style={{ color: '#8B6E50' }}>
            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
          </Link>
          <span style={{ color: 'rgba(0,0,0,0.15)' }}>›</span>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #EA580C, #C2410C)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Users className="w-3.5 h-3.5 text-white" />
          </div>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#1A0C00', margin: 0, flex: 1 }}>Équipe</p>
          {/* Inviter — orange (CTA principal) */}
          <button onClick={() => setShowInvite(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold text-white transition hover:opacity-90"
            style={{
              background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_D})`,
              boxShadow: `0 2px 8px ${ORANGE}50`,
            }}>
            <Plus className="w-3.5 h-3.5" /> Inviter un collaborateur
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* KPI summary */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Membres actifs',  value: collabs.length,          bg: '#1A0C00' },
            { label: 'Budget total',    value: formatFCFA(totalBudget),  bg: ORANGE    },
            { label: 'Dépenses mois',   value: formatFCFA(totalSpent),   bg: GREEN     },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-4 text-center text-white"
              style={{ background: s.bg, boxShadow: `0 4px 14px ${s.bg}40` }}>
              <p className="text-xl font-bold truncate">{s.value}</p>
              <p className="text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.72)' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Collaborateurs list */}
        <div className="rounded-2xl overflow-hidden" style={{ background: CARD, boxShadow: SH2 }}>
          {loading ? (
            <div className="p-4 space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: BG }} />)}
            </div>
          ) : collabs.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                style={{ background: ORANGE_L }}>
                <Users className="w-7 h-7" style={{ color: ORANGE }} />
              </div>
              <p className="text-sm font-bold mb-1" style={{ color: TEXT }}>Aucun collaborateur</p>
              <p className="text-xs mb-5" style={{ color: FAINT }}>
                Invitez votre équipe pour gérer les déjeuners ensemble
              </p>
              <button onClick={() => setShowInvite(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ background: ORANGE }}>
                <Plus className="w-4 h-4" /> Inviter
              </button>
            </div>
          ) : collabs.map((c, idx, arr) => {
            const budget = Number(c.limiteBudget || c.budgetMax || 0);
            const spent  = Number(c.depenseActuelle || c.depenses || 0);
            const pct    = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
            return (
              <div key={c.id} className="flex items-center gap-4 px-5 py-4 transition"
                style={{ borderBottom: idx < arr.length - 1 ? `1px solid ${BORDER}` : 'none' }}
                onMouseEnter={e => e.currentTarget.style.background = BG}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <Avatar name={c.nom || ''} size={44} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <p className="text-[13px] font-bold" style={{ color: TEXT }}>
                      {c.nom || 'Collaborateur'}
                    </p>
                    {c.poste && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: BG, color: MUTED }}>{c.poste}</span>
                    )}
                    {pct >= 100 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                        style={{ background: RED_L, color: RED }}>Budget dépassé</span>
                    )}
                  </div>
                  <p className="text-[11px] mb-2.5" style={{ color: FAINT }}>{c.email}</p>
                  <BudgetBar spent={spent} budget={budget} />
                </div>
                <div className="text-right shrink-0 hidden sm:block ml-4">
                  <p className="text-[11px]" style={{ color: FAINT }}>Budget mensuel</p>
                  <p className="text-[13px] font-bold" style={{ color: TEXT }}>{formatFCFA(budget)}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: pct >= 100 ? RED : GREEN }}>
                    Solde : {formatFCFA(Math.max(0, budget - spent))}
                  </p>
                  {editingBudget?.id === c.id ? (
                    <div className="flex items-center gap-1 mt-1">
                      <input
                        type="number"
                        value={editingBudget.value}
                        onChange={e => setEditingBudget(p => ({ ...p, value: e.target.value }))}
                        className="w-24 rounded-lg px-2 py-1 text-xs font-medium"
                        style={{ border: '1.5px solid #EA580C', outline: 'none', background: '#FFF0DF', color: '#1A0C00' }}
                        autoFocus
                      />
                      <button
                        onClick={async () => {
                          try {
                            await b2bAPI.updateCollaborateur(c.id, { limiteBudget: parseFloat(editingBudget.value) });
                            setEditingBudget(null);
                            load();
                          } catch { setEditingBudget(null); }
                        }}
                        className="rounded-lg px-2 py-1 text-[10px] font-bold text-white"
                        style={{ background: '#16A34A' }}>OK</button>
                      <button onClick={() => setEditingBudget(null)}
                        className="rounded-lg px-2 py-1 text-[10px] font-medium"
                        style={{ border: '1px solid rgba(0,0,0,0.1)', background: '#fff', color: '#8B6E50' }}>✕</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingBudget({ id: c.id, value: String(budget) })}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-md mt-1 transition hover:opacity-80"
                      style={{ background: '#FFF0DF', color: '#EA580C', border: 'none', cursor: 'pointer' }}>
                      Modifier budget
                    </button>
                  )}
                </div>
                {/* Supprimer — rouge (action risquée / irréversible) */}
                <button onClick={() => handleDelete(c.id, c.nom)}
                  disabled={deleting === c.id}
                  className="w-9 h-9 rounded-xl flex items-center justify-center border transition hover:opacity-80 disabled:opacity-40"
                  style={{ borderColor: '#FECACA', background: RED_L, color: RED }}
                  title="Supprimer ce collaborateur">
                  {deleting === c.id
                    ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-center text-[11px]" style={{ color: FAINT }}>
          Les collaborateurs reçoivent un email d'invitation avec un lien d'activation
        </p>
      </div>

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} onDone={load} />}
    </div>
  );
}
