// src/components/security/SecurityPanel.jsx
// Full security tab: password change + 2FA — shared across all roles
import { useState } from 'react';
import { Lock, Mail, Shield, Eye, EyeOff, X } from 'lucide-react';
import { authAPI } from '../../services/api';

function PanelAlert({ type, msg }) {
  const isErr = type === 'error';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 9, background: '#FFF0DF', border: `1px solid ${isErr ? '#E8906A' : '#86EFAC'}`, marginBottom: 12 }}>
      <span style={{ fontFamily: 'sans-serif', fontSize: 13, color: isErr ? '#EA580C' : '#166534' }}>{msg}</span>
    </div>
  );
}

function StrengthBar({ password }) {
  if (!password) return null;
  const score = Math.min(Math.floor(password.length / 3), 4);
  const color = password.length < 6 ? '#EF4444' : password.length < 9 ? '#EA580C' : password.length < 12 ? '#F59E0B' : '#16A34A';
  return (
    <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
      {[1,2,3,4].map(i => (
        <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= score ? color : 'rgba(0,0,0,0.08)', transition: 'background 0.2s' }} />
      ))}
    </div>
  );
}

export default function SecurityPanel({ user, accentColor = '#EA580C' }) {
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [pwd,      setPwd]      = useState({ current: '', next: '', confirm: '' });
  const [showPwd,  setShowPwd]  = useState({ current: false, next: false, confirm: false });
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdError,  setPwdError]  = useState('');
  const [pwdOk,     setPwdOk]     = useState('');

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.twoFactorEnabled ?? false);
  const [show2FA,     setShow2FA]     = useState(false);
  const [qrData,      setQrData]      = useState(null);
  const [backupCodes, setBackupCodes] = useState(null);
  const [tfaCode,     setTfaCode]     = useState('');

  const handleChangePwd = async () => {
    setPwdError(''); setPwdOk('');
    if (!pwd.current)           { setPwdError('Mot de passe actuel requis'); return; }
    if (pwd.next.length < 6)    { setPwdError('Minimum 6 caractères'); return; }
    if (pwd.next !== pwd.confirm){ setPwdError('Les mots de passe ne correspondent pas'); return; }
    setPwdSaving(true);
    try {
      await authAPI.changePassword({ currentPassword: pwd.current, newPassword: pwd.next });
      setPwdOk('Mot de passe modifié avec succès.');
      setPwd({ current: '', next: '', confirm: '' });
      setTimeout(() => { setShowPasswordForm(false); setPwdOk(''); }, 2500);
    } catch (e) { setPwdError(e?.response?.data?.message || 'Mot de passe actuel incorrect.'); }
    finally { setPwdSaving(false); }
  };

  const handleSetup2FA = async () => {
    setPwdSaving(true); setPwdError(''); setPwdOk('');
    try { const res = await authAPI.setup2FA(); setQrData(res.data); setShow2FA(true); }
    catch { setPwdError('Erreur lors de la configuration 2FA'); }
    finally { setPwdSaving(false); }
  };

  const handleEnable2FA = async () => {
    if (!/^\d{6}$/.test(tfaCode)) { setPwdError('Code à 6 chiffres requis'); return; }
    setPwdSaving(true); setPwdError('');
    try {
      const res = await authAPI.enable2FA(tfaCode);
      setTwoFactorEnabled(true); setShow2FA(false);
      if (res.data?.backupCodes?.length) setBackupCodes(res.data.backupCodes);
      setPwdOk('2FA activée — conservez vos codes de secours !');
      setTfaCode('');
    } catch (e) { setPwdError(e?.response?.data?.message || 'Code invalide'); }
    finally { setPwdSaving(false); }
  };

  const handleDisable2FA = async () => {
    setPwdSaving(true); setPwdError(''); setPwdOk('');
    try { await authAPI.disable2FA(); setTwoFactorEnabled(false); setShow2FA(false); setPwdOk('2FA désactivée.'); }
    catch { setPwdError('Erreur lors de la désactivation'); }
    finally { setPwdSaving(false); }
  };

  const s = {
    card:   { background: '#fff', border: '1px solid rgba(89,67,42,0.1)', borderRadius: 14, padding: '16px 18px', marginBottom: 10 },
    iconBox: { width: 38, height: 38, borderRadius: 10, background: '#FFF0DF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    label:  { fontFamily: 'sans-serif', fontSize: 13, fontWeight: 700, color: '#1A0C00', margin: '0 0 2px' },
    sub:    { fontFamily: 'sans-serif', fontSize: 11, color: '#8B6E50', margin: 0 },
    btn:    { border: 'none', borderRadius: 9, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'sans-serif' },
    input:  { width: '100%', boxSizing: 'border-box', padding: '11px 38px 11px 36px', border: '1px solid rgba(89,67,42,0.18)', borderRadius: 10, fontFamily: 'sans-serif', fontSize: 13, color: '#1A0C00', outline: 'none', background: '#FDFAF7' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Shield style={{ width: 16, height: 16, color: accentColor }} />
        <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 16, fontWeight: 700, color: '#1A0C00', margin: 0 }}>Authentification & Protection</h3>
      </div>

      {pwdOk   && <PanelAlert type="success" msg={pwdOk} />}
      {pwdError && <PanelAlert type="error"   msg={pwdError} />}

      {/* Email verified */}
      <div style={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={s.iconBox}><Mail style={{ width: 16, height: 16, color: '#C2410C' }} /></div>
            <div>
              <p style={s.label}>Vérification email</p>
              <p style={s.sub}>{user?.email || '—'}</p>
            </div>
          </div>
          <span style={{ background: '#F0FDF4', color: '#166534', border: '1px solid #86EFAC', borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 700, fontFamily: 'sans-serif' }}>✓ Vérifié</span>
        </div>
      </div>

      {/* Password */}
      <div style={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={s.iconBox}><Lock style={{ width: 16, height: 16, color: accentColor }} /></div>
            <div>
              <p style={s.label}>Mot de passe</p>
              <p style={s.sub}>Changez régulièrement pour sécuriser votre compte</p>
            </div>
          </div>
          <button onClick={() => { setShowPasswordForm(v => !v); setPwdError(''); setPwdOk(''); }}
            style={{ ...s.btn, background: accentColor, color: '#fff' }}>
            Modifier
          </button>
        </div>

        {showPasswordForm && (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { key: 'current', ph: 'Mot de passe actuel' },
              { key: 'next',    ph: 'Nouveau mot de passe (min. 6 car.)' },
              { key: 'confirm', ph: 'Confirmer le nouveau' },
            ].map(({ key, ph }) => (
              <div key={key}>
                <div style={{ position: 'relative' }}>
                  <Lock style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: '#A89070', pointerEvents: 'none' }} />
                  <input
                    type={showPwd[key] ? 'text' : 'password'}
                    value={pwd[key]}
                    onChange={e => setPwd(p => ({ ...p, [key]: e.target.value }))}
                    placeholder={ph}
                    style={s.input}
                    onFocus={e => e.target.style.borderColor = accentColor}
                    onBlur={e => e.target.style.borderColor = 'rgba(89,67,42,0.18)'}
                  />
                  <button type="button" onClick={() => setShowPwd(p => ({ ...p, [key]: !p[key] }))}
                    style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#A89070', padding: 4 }}>
                    {showPwd[key] ? <EyeOff style={{ width: 13, height: 13 }} /> : <Eye style={{ width: 13, height: 13 }} />}
                  </button>
                </div>
                {key === 'next' && <StrengthBar password={pwd.next} />}
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleChangePwd} disabled={pwdSaving}
                style={{ ...s.btn, flex: 1, background: pwdSaving ? 'rgba(0,0,0,0.2)' : accentColor, color: '#fff', opacity: pwdSaving ? 0.6 : 1, cursor: pwdSaving ? 'not-allowed' : 'pointer' }}>
                {pwdSaving ? 'En cours…' : 'Enregistrer'}
              </button>
              <button onClick={() => setShowPasswordForm(false)}
                style={{ ...s.btn, background: 'none', border: '1px solid rgba(89,67,42,0.15)', color: '#8B6E50' }}>
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2FA */}
      <div style={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ ...s.iconBox, background: twoFactorEnabled ? '#F0FDF4' : '#FFF0DF' }}>
              <Shield style={{ width: 16, height: 16, color: twoFactorEnabled ? '#16A34A' : accentColor }} />
            </div>
            <div>
              <p style={s.label}>Double authentification (2FA)</p>
              <p style={s.sub}>Application TOTP (Google Authenticator, Authy…)</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {twoFactorEnabled && (
              <span style={{ background: '#F0FDF4', color: '#166534', borderRadius: 20, padding: '3px 10px', fontSize: 10, fontWeight: 700, fontFamily: 'sans-serif' }}>Actif ✓</span>
            )}
            <button onClick={twoFactorEnabled ? handleDisable2FA : handleSetup2FA} disabled={pwdSaving}
              style={{ ...s.btn, background: twoFactorEnabled ? '#EF4444' : accentColor, color: '#fff', opacity: pwdSaving ? 0.6 : 1, cursor: pwdSaving ? 'not-allowed' : 'pointer' }}>
              {twoFactorEnabled ? 'Désactiver' : 'Configurer'}
            </button>
          </div>
        </div>

        {show2FA && qrData && (
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontFamily: 'sans-serif', fontSize: 12, color: '#8B6E50', margin: 0 }}>
              Scannez avec <strong>Google Authenticator</strong> ou <strong>Authy</strong>, puis entrez le code généré.
            </p>
            {qrData.qrCodeDataUrl ? (
              <div style={{ border: '1px solid rgba(89,67,42,0.12)', borderRadius: 12, background: '#FDFAF7', padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <img src={qrData.qrCodeDataUrl} alt="QR Code 2FA" style={{ width: 150, height: 150, borderRadius: 8 }} />
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontFamily: 'sans-serif', fontSize: 10, color: '#8B6E50', margin: '0 0 4px' }}>Clé manuelle :</p>
                  <code style={{ fontSize: 11, background: '#FDF5EF', borderRadius: 6, padding: '4px 10px', fontFamily: 'monospace', userSelect: 'all', letterSpacing: '0.08em' }}>{qrData.secret}</code>
                </div>
              </div>
            ) : (
              <div style={{ border: '1px dashed rgba(89,67,42,0.2)', borderRadius: 10, padding: 14, textAlign: 'center', background: '#FDFAF7' }}>
                <p style={{ fontFamily: 'monospace', fontSize: 10, color: '#8B6E50', wordBreak: 'break-all', margin: 0 }}>{qrData.otpAuthUrl}</p>
              </div>
            )}
            <input
              type="text" maxLength={6} placeholder="Code à 6 chiffres"
              value={tfaCode} onChange={e => setTfaCode(e.target.value.replace(/\D/g, ''))}
              style={{ width: '100%', boxSizing: 'border-box', border: `1px solid rgba(89,67,42,0.18)`, borderRadius: 10, padding: '12px', textAlign: 'center', fontFamily: 'monospace', fontSize: 22, letterSpacing: '0.4em', color: '#1A0C00', outline: 'none', background: '#FDFAF7' }}
              onFocus={e => e.target.style.borderColor = accentColor}
              onBlur={e => e.target.style.borderColor = 'rgba(89,67,42,0.18)'}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleEnable2FA} disabled={pwdSaving}
                style={{ ...s.btn, flex: 1, background: pwdSaving ? 'rgba(0,0,0,0.15)' : accentColor, color: '#fff', opacity: pwdSaving ? 0.6 : 1 }}>
                {pwdSaving ? 'Activation…' : 'Activer la 2FA'}
              </button>
              <button onClick={() => setShow2FA(false)}
                style={{ ...s.btn, background: 'none', border: '1px solid rgba(89,67,42,0.15)', color: '#8B6E50' }}>
                Annuler
              </button>
            </div>
          </div>
        )}

        {backupCodes && (
          <div style={{ marginTop: 12, background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <div>
                <p style={{ fontFamily: 'sans-serif', fontSize: 12, fontWeight: 700, color: '#92400E', margin: '0 0 2px' }}>Codes de secours — notez-les !</p>
                <p style={{ fontFamily: 'sans-serif', fontSize: 11, color: '#B45309', margin: 0 }}>Affichés une seule fois. Gardez-les en sécurité.</p>
              </div>
              <button onClick={() => setBackupCodes(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B45309', lineHeight: 0 }}>
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
              {backupCodes.map((code, i) => (
                <code key={i} style={{ background: '#fff', border: '1px solid #FCD34D', borderRadius: 7, padding: '6px 8px', textAlign: 'center', fontFamily: 'monospace', fontSize: 11, color: '#92400E', userSelect: 'all' }}>{code}</code>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 7 }}>
              <button onClick={() => navigator.clipboard.writeText(backupCodes.join('\n'))}
                style={{ flex: 1, border: '1px solid #FCD34D', background: 'none', borderRadius: 8, padding: '7px 0', fontSize: 11, fontWeight: 600, color: '#92400E', cursor: 'pointer', fontFamily: 'sans-serif' }}>
                Copier
              </button>
              <button onClick={() => { const b = new Blob([`Codes de secours 2FA\n\n${backupCodes.join('\n')}`], { type: 'text/plain' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = 'codes-2fa.txt'; a.click(); URL.revokeObjectURL(u); }}
                style={{ flex: 1, background: '#D97706', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 0', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'sans-serif' }}>
                Télécharger
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
