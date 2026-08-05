import { LogOut, AlertCircle, CheckCircle, FileText } from 'lucide-react';
import SecurityPanel from '../../../components/security/SecurityPanel';
import { formatFCFA } from '../../../utils/formatters';
import { Avatar } from '../B2BDashboard';
import {
  BG, CARD, NAVY, NAVY2, TEXT, MUTED, FAINT, BORDER,
  ORANGE, ORANGE_L, GREEN, GREEN_L, RED, RED_L, SH2,
} from '../_colors';

// Extrait de B2BDashboard.jsx — bloc { tab === 'settings' && (...) }.
export default function SettingsSection({
  setShowLogoutModal, settingsTab, setSettingsTab, user,
  handleProfileSave, profileForm, setProfileForm, profileMsg,
  compte, collabs, setTab,
}) {
  return (
    <div className="space-y-6 max-w-4xl">

      {/* En-tête */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold" style={{ color: TEXT }}>Paramètres</h2>
          <p className="text-[12px] mt-0.5" style={{ color: FAINT }}>Gérez votre profil, votre entreprise et vos accès</p>
        </div>
        <button onClick={() => setShowLogoutModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[12px] font-semibold border transition hover:opacity-80"
          style={{ borderColor: BORDER, color: MUTED, background: CARD }}>
          <LogOut className="w-3.5 h-3.5" /> Déconnexion
        </button>
      </div>

      {/* Sidebar + contenu */}
      <div className="flex gap-5 items-start">

        {/* Sidebar 160px */}
        <div className="shrink-0 rounded-lg overflow-hidden" style={{ width: 160, background: ORANGE_L, border: `1px solid ${BORDER}` }}>
          {[
            { id: 'profil',     label: 'Profil',      icon: '👤' },
            { id: 'entreprise', label: 'Entreprise',  icon: '🏢' },
            { id: 'securite',   label: 'Sécurité',    icon: '🔒' },
          ].map(t => {
            const isActive = settingsTab === t.id;
            return (
              <button key={t.id} onClick={() => setSettingsTab(t.id)}
                className="w-full flex items-center gap-2 px-3 py-3 text-left text-[12px] font-semibold transition-colors"
                style={{
                  background: isActive ? '#E6F5EE' : 'transparent',
                  color: isActive ? NAVY : MUTED,
                  borderLeft: isActive ? `3px solid ${NAVY}` : '3px solid transparent',
                }}>
                <span>{t.icon}</span> {t.label}
              </button>
            );
          })}
        </div>

        {/* Panneau de contenu */}
        <div className="flex-1 min-w-0">

          {/* Onglet Profil */}
          {settingsTab === 'profil' && (
            <div className="rounded-lg overflow-hidden" style={{ background: CARD, boxShadow: SH2 }}>
              <div className="flex items-center gap-4 px-6 py-5" style={{ borderBottom: `1px solid ${BORDER}` }}>
                <Avatar name={user?.nom || 'B2B'} size={52} />
                <div>
                  <p className="text-base font-bold" style={{ color: TEXT }}>{user?.prenom ? `${user.prenom} ${user.nom || ''}`.trim() : (user?.nom || 'Gestionnaire')}</p>
                  <p className="text-[12px] mt-0.5" style={{ color: FAINT }}>{user?.email || ''}</p>
                  <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ background: `${ORANGE}18`, color: ORANGE }}>
                    Gestionnaire B2B
                  </span>
                </div>
              </div>
              <form onSubmit={handleProfileSave} className="p-6 space-y-4">
                <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: FAINT }}>Informations personnelles</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    { k: 'prenom',    label: 'Prénom',     type: 'text'  },
                    { k: 'nom',       label: 'Nom',        type: 'text'  },
                    { k: 'email',     label: 'Email',      type: 'email' },
                    { k: 'telephone', label: 'Téléphone',  type: 'tel'   },
                  ].map(f => (
                    <div key={f.k} className={f.k === 'email' ? 'sm:col-span-2' : ''}>
                      <label className="block text-[11px] font-bold mb-1.5" style={{ color: MUTED }}>{f.label}</label>
                      <input value={profileForm[f.k] || ''} type={f.type}
                        onChange={e => setProfileForm(p => ({ ...p, [f.k]: e.target.value }))}
                        className="w-full rounded-lg px-3.5 py-3 text-sm outline-none transition"
                        style={{ background: BG, border: `1.5px solid ${BORDER}`, color: TEXT }} />
                    </div>
                  ))}
                </div>
                {profileMsg && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-lg"
                    style={{ background: profileMsg.includes('Erreur') ? RED_L : GREEN_L, border: `1px solid ${profileMsg.includes('Erreur') ? '#FECACA' : '#FFE4CC'}` }}>
                    {profileMsg.includes('Erreur')
                      ? <AlertCircle className="w-3.5 h-3.5 shrink-0" style={{ color: RED }} />
                      : <CheckCircle className="w-3.5 h-3.5 shrink-0" style={{ color: GREEN }} />}
                    <p className="text-xs font-semibold" style={{ color: profileMsg.includes('Erreur') ? RED : GREEN }}>{profileMsg}</p>
                  </div>
                )}
                <button type="submit"
                  className="w-full py-3.5 rounded-lg text-sm font-bold text-white transition hover:opacity-90"
                  style={{ background: `linear-gradient(135deg, ${NAVY}, ${NAVY2})`, boxShadow: `0 2px 8px ${NAVY}40` }}>
                  Enregistrer les modifications
                </button>
              </form>
            </div>
          )}

          {/* Onglet Entreprise */}
          {settingsTab === 'entreprise' && compte && (
            <div className="rounded-lg p-6" style={{ background: CARD, boxShadow: SH2 }}>
              <p className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: FAINT }}>Informations entreprise</p>
              {[
                { label: 'Raison sociale', value: compte.raisonSociale },
                { label: 'Secteur',         value: compte.secteurActivite },
                { label: 'RCCM',            value: compte.numeroRCCM },
                { label: 'NIF',             value: compte.numeroContribuable },
                { label: 'Budget mensuel',  value: formatFCFA(compte.budgetMensuel || 0) },
                { label: 'Collaborateurs',  value: collabs.length ? `${collabs.length} membre${collabs.length > 1 ? 's' : ''}` : null },
              ].filter(r => r.value).map(r => (
                <div key={r.label} className="flex items-center justify-between py-3"
                  style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <p className="text-[12px]" style={{ color: MUTED }}>{r.label}</p>
                  <p className="text-[13px] font-semibold" style={{ color: TEXT }}>{r.value}</p>
                </div>
              ))}
              <button onClick={() => setTab('factures')}
                className="w-full mt-4 rounded-lg py-3 text-sm font-semibold flex items-center justify-center gap-2 transition hover:opacity-80"
                style={{ background: BG, border: `1.5px solid ${BORDER}`, color: TEXT }}>
                <FileText className="w-4 h-4" /> Voir les rapports SYSCOHADA dans Facturation
              </button>
            </div>
          )}
          {settingsTab === 'entreprise' && !compte && (
            <div className="rounded-lg p-6 text-center" style={{ background: CARD, boxShadow: SH2 }}>
              <p className="text-sm" style={{ color: FAINT }}>Aucune information entreprise disponible.</p>
            </div>
          )}

          {/* Onglet Sécurité */}
          {settingsTab === 'securite' && (
            <SecurityPanel user={user} accentColor={NAVY} />
          )}


        </div>
      </div>
    </div>
  );
}
