/* ConfigTab — extrait de AdminDashboard */
import { useState, useEffect, useCallback } from 'react';
import {
  CreditCard, Smartphone, Bell, Mail, Database, Globe, Webhook, BarChart2, Zap,
  Activity, Settings, X, ToggleRight, ToggleLeft, CheckCircle, XCircle, Eye, EyeOff,
  Building2, Lock, Shield, Save, Plus, Check, Trash2,
} from 'lucide-react';
import { adminAPI, authAPI } from '../../../services/api';
import { useAuth } from '../../../hooks/useAuth';
import { useAdminRevision } from '../../../hooks/useAdminRealtime';
import { ACCENT, inputStyle, labelStyle, card } from '../_colors';

/* ══════════════════ TAB: CONFIGURATION ══════════════════ */
const INTEGRATION_TYPES = [
  'REST_API', 'WEBHOOK', 'PAYMENT', 'SMS', 'PUSH_NOTIFICATION', 'EMAIL', 'STORAGE', 'ANALYTICS', 'CUSTOM',
];
const TYPE_COLOR = {
  PAYMENT: '#F59E0B', SMS: '#F43F5E', PUSH_NOTIFICATION: '#FF3A03',
  EMAIL: '#6366F1', STORAGE: '#0EA5E9', REST_API: '#10B981',
  WEBHOOK: '#8B5CF6', ANALYTICS: '#EC4899', CUSTOM: '#64748B',
};
const TYPE_ICON = {
  PAYMENT: CreditCard, SMS: Smartphone, PUSH_NOTIFICATION: Bell,
  EMAIL: Mail, STORAGE: Database, REST_API: Globe,
  WEBHOOK: Webhook, ANALYTICS: BarChart2, CUSTOM: Zap,
};
const CDC_NAMES = new Set(['Novasend', 'Firebase FCM', 'Twilio SMS', 'Resend (Email)', 'NovaSMS', 'Dobi Livraison']);

function IntegrationDynamicCard({ integration, onToggle, onEdit, onDelete, onTest, testResult, testing }) {
  const isNovasend = integration.name.toLowerCase().includes('novasend');
  const color = isNovasend ? '#16A34A' : TYPE_COLOR[integration.type] || '#64748B';
  const Icon = TYPE_ICON[integration.type] || Zap;
  const isCdc = CDC_NAMES.has(integration.name);

  return (
    <div style={{ ...card, marginBottom: 10, border: isCdc ? `1.5px solid ${color}28` : '1px solid #D1D9E6', overflow: 'hidden' }}>
      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon style={{ width: 17, height: 17, color }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: 0 }}>{integration.name}</p>
            {isCdc && <span style={{ fontSize: 9, background: 'rgba(234,60,12,0.10)', color: '#FF3A03', borderRadius: 4, padding: '1px 6px', fontWeight: 800, letterSpacing: '0.04em' }}>CDC</span>}
            <span style={{ background: `${color}14`, color, borderRadius: 4, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>{integration.type.replace(/_/g, ' ')}</span>
          </div>
          <p style={{ fontSize: 11, color: '#64748B', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {integration.description || integration.baseUrl || 'Aucune description'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          <button onClick={() => onTest(integration.id)} disabled={testing} title="Tester"
            style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 7, padding: '5px 8px', cursor: testing ? 'not-allowed' : 'pointer', color: '#475569', display: 'flex', alignItems: 'center' }}>
            <Activity style={{ width: 12, height: 12 }} />
          </button>
          <button onClick={() => onEdit(integration)} title="Configurer"
            style={{ background: 'rgba(234,60,12,0.10)', border: 'none', borderRadius: 7, padding: '5px 8px', cursor: 'pointer', color: ACCENT, display: 'flex', alignItems: 'center' }}>
            <Settings style={{ width: 12, height: 12 }} />
          </button>
          {!isCdc && (
            <button onClick={() => onDelete(integration.id)} title="Supprimer"
              style={{ background: '#FEE2E2', border: 'none', borderRadius: 7, padding: '5px 8px', cursor: 'pointer', color: '#FF3A03', display: 'flex', alignItems: 'center' }}>
              <X style={{ width: 12, height: 12 }} />
            </button>
          )}
          <button onClick={() => onToggle(integration)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
            {integration.enabled
              ? <ToggleRight style={{ width: 26, height: 26, color: '#059669' }} />
              : <ToggleLeft style={{ width: 26, height: 26, color: '#CBD5E1' }} />}
          </button>
        </div>
      </div>
      {testResult && (
        <div style={{ margin: '0 12px 10px', padding: '7px 10px', borderRadius: 7, background: testResult.ok ? '#DCFCE7' : '#FEE2E2', color: testResult.ok ? '#166534' : '#991B1B', fontSize: 11, fontWeight: 600 }}>
          {testResult.ok ? <CheckCircle style={{ width: 11, height: 11, marginRight: 5, display: 'inline' }} /> : <XCircle style={{ width: 11, height: 11, marginRight: 5, display: 'inline' }} />}
          {testResult.message}
        </div>
      )}
    </div>
  );
}

function IntegrationModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState({
    name: '', description: '', type: 'REST_API', baseUrl: '', apiKey: '', webhookSecret: '',
    customHeaders: '', enabled: false, ...initial,
  });
  const [showKey, setShowKey] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);

  const handle = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      let headers;
      try { headers = form.customHeaders ? JSON.parse(form.customHeaders) : undefined; } catch { headers = undefined; }
      await onSave({ ...form, customHeaders: headers });
      onClose();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(2px)' }}>
      <div onClick={e => e.stopPropagation()} className="fade-up" style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.22)' }}>
        <div style={{ padding: '20px 28px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0F172A' }}>{initial?.id ? 'Modifier' : 'Nouvelle'} intégration</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X style={{ width: 20, height: 20, color: '#64748B' }} /></button>
        </div>
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div><label style={labelStyle}>Nom *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} placeholder="Ex: Stripe, Twilio, Novasend…" /></div>
          <div><label style={labelStyle}>Description</label><input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={inputStyle} placeholder="Rôle de cette intégration" /></div>
          <div>
            <label style={labelStyle}>Type</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={{ ...inputStyle, appearance: 'none' }}>
              {INTEGRATION_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div><label style={labelStyle}>URL de base</label><input value={form.baseUrl} onChange={e => setForm(f => ({ ...f, baseUrl: e.target.value }))} style={inputStyle} placeholder="https://api.exemple.com/v1" /></div>
          <div>
            <label style={labelStyle}>Clé API / Bearer Token</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type={showKey ? 'text' : 'password'} value={form.apiKey} onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))} style={{ ...inputStyle, flex: 1 }} placeholder="sk_live_…" />
              <button onClick={() => setShowKey(v => !v)} style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 10, padding: '0 14px', cursor: 'pointer', color: '#64748B' }}>
                {showKey ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
              </button>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Webhook Secret</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type={showSecret ? 'text' : 'password'} value={form.webhookSecret} onChange={e => setForm(f => ({ ...f, webhookSecret: e.target.value }))} style={{ ...inputStyle, flex: 1 }} placeholder="whsec_…" />
              <button onClick={() => setShowSecret(v => !v)} style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 10, padding: '0 14px', cursor: 'pointer', color: '#64748B' }}>
                {showSecret ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
              </button>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Headers personnalisés (JSON)</label>
            <textarea value={form.customHeaders} onChange={e => setForm(f => ({ ...f, customHeaders: e.target.value }))} style={{ ...inputStyle, minHeight: 80, resize: 'vertical', fontFamily: 'monospace' }} placeholder={'{"X-Custom-Header": "valeur"}'} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setForm(f => ({ ...f, enabled: !f.enabled }))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              {form.enabled ? <ToggleRight style={{ width: 28, height: 28, color: '#059669' }} /> : <ToggleLeft style={{ width: 28, height: 28, color: '#CBD5E1' }} />}
            </button>
            <span style={{ fontSize: 14, color: '#475569', fontWeight: 600 }}>{form.enabled ? 'Activée' : 'Désactivée'}</span>
          </div>
        </div>
        <div style={{ padding: '16px 28px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: 10, padding: '12px 0', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>Annuler</button>
          <button onClick={handle} disabled={saving || !form.name.trim()} style={{ flex: 2, background: ACCENT, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 0', cursor: 'pointer', fontWeight: 700, fontSize: 14, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ConfigTab() {
  const revision = useAdminRevision();
  const { user } = useAuth();
  const [, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState(null);
  const [pwSaving, setPwSaving] = useState(false);
  const [secEdits, setSecEdits] = useState({});
  const [integrations, setIntegrations] = useState([]);
  const [payMethods, setPayMethods] = useState([]);
  const [payToggling, setPayToggling] = useState({});
  const [modal, setModal] = useState(null); // null | {} | {id,…}
  const [testResults, setTestResults] = useState({});
  const [testing, setTesting] = useState({});
  const [twoFAEnabled, setTwoFAEnabled] = useState(!!user?.twoFactorEnabled);
  const [twoFAStep, setTwoFAStep] = useState(0); // 0=idle, 1=qr, 2=done
  const [twoFAData, setTwoFAData] = useState(null);
  const [twoFACode, setTwoFACode] = useState('');
  const [twoFASaving, setTwoFASaving] = useState(false);
  const [twoFAMsg, setTwoFAMsg] = useState(null);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const [cfgRes, intRes, payRes] = await Promise.all([
        adminAPI.getConfig(),
        adminAPI.getIntegrations(),
        adminAPI.getPaymentMethods(),
      ]);
      setConfigs(cfgRes.data);
      setIntegrations(intRes.data);
      setPayMethods(payRes.data);
      const initial = {};
      cfgRes.data.forEach(c => { initial[c.key] = c.value ?? ''; });
      setSecEdits(initial);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig, revision]);

  // `keys` limite la sauvegarde aux champs du panneau réellement affiché.
  // Sans ça, secEdits (peuplé avec TOUTES les clés de config au premier
  // chargement) faisait ressauvegarder chaque clé de la plateforme entière
  // (twilio_*, sla_*, rate_limit_*…) au moindre clic sur un seul champ —
  // une rafale de 20+ PATCH simultanés qui déclenchait le rate limit (429).
  const saveSecurityFields = async (keys) => {
    setSaving(s => ({ ...s, security: true }));
    try {
      const entries = (keys ?? Object.keys(secEdits)).map(k => [k, secEdits[k] ?? '']);
      await Promise.all(entries.map(([k, v]) => adminAPI.setConfig(k, v)));
      // Mise à jour locale plutôt que loadConfig() : celui-ci repasse `loading`
      // à true, ce qui remplace tout le panneau Réglages par un spinner
      // (perçu comme un rechargement de page) pour un simple champ enregistré.
      setConfigs(prev => {
        const map = new Map(prev.map(c => [c.key, c]));
        entries.forEach(([k, v]) => {
          map.set(k, { ...(map.get(k) || { key: k }), value: v });
        });
        return Array.from(map.values());
      });
    } catch { /* ignore */ }
    finally { setSaving(s => ({ ...s, security: false })); }
  };

  const handleChangePassword = async () => {
    if (pwForm.next !== pwForm.confirm) { setPwMsg({ ok: false, text: 'Les mots de passe ne correspondent pas.' }); return; }
    if (pwForm.next.length < 8) { setPwMsg({ ok: false, text: 'Minimum 8 caractères.' }); return; }
    setPwSaving(true); setPwMsg(null);
    try {
      await adminAPI.changePassword(pwForm.current, pwForm.next);
      setPwMsg({ ok: true, text: 'Mot de passe modifié avec succès.' });
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (e) {
      setPwMsg({ ok: false, text: e?.response?.data?.message || 'Échec de la modification.' });
    } finally { setPwSaving(false); }
  };

  const saveIntegration = async (data) => {
    if (data.id) {
      const res = await adminAPI.updateIntegration(data.id, data);
      setIntegrations(prev => prev.map(i => i.id === data.id ? res.data : i));
    } else {
      const res = await adminAPI.createIntegration(data);
      setIntegrations(prev => [res.data, ...prev]);
    }
  };

  const toggleIntegration = async (integration) => {
    const res = await adminAPI.updateIntegration(integration.id, { enabled: !integration.enabled });
    setIntegrations(prev => prev.map(i => i.id === integration.id ? res.data : i));
  };

  const deleteIntegration = async (id) => {
    if (!window.confirm('Supprimer cette intégration ?')) return;
    await adminAPI.deleteIntegration(id);
    setIntegrations(prev => prev.filter(i => i.id !== id));
  };

  const togglePayMethod = async (m) => {
    setPayToggling(t => ({ ...t, [m.id]: true }));
    try {
      const res = await adminAPI.togglePaymentMethod(m.id);
      setPayMethods(prev => prev.map(p => p.id === m.id ? { ...p, enabled: res.data.enabled } : p));
    } catch { /* ignore */ }
    finally { setPayToggling(t => ({ ...t, [m.id]: false })); }
  };

  const testIntegration = async (id) => {
    setTesting(t => ({ ...t, [id]: true }));
    try {
      const res = await adminAPI.testIntegration(id);
      setTestResults(t => ({ ...t, [id]: res.data }));
    } catch { setTestResults(t => ({ ...t, [id]: { ok: false, message: 'Erreur réseau.' } })); }
    finally { setTesting(t => ({ ...t, [id]: false })); }
  };

  const handleSetup2FA = async () => {
    setTwoFASaving(true); setTwoFAMsg(null);
    try {
      const res = await authAPI.setup2FA();
      setTwoFAData(res.data);
      setTwoFAStep(1);
    } catch (e) {
      setTwoFAMsg({ ok: false, text: e?.response?.data?.message || 'Erreur lors de la configuration.' });
    } finally { setTwoFASaving(false); }
  };

  const handleEnable2FA = async () => {
    if (twoFACode.length !== 6) { setTwoFAMsg({ ok: false, text: 'Entrez un code à 6 chiffres.' }); return; }
    setTwoFASaving(true); setTwoFAMsg(null);
    try {
      await authAPI.enable2FA(twoFACode);
      setTwoFAEnabled(true);
      setTwoFAStep(0);
      setTwoFAData(null);
      setTwoFACode('');
      setTwoFAMsg({ ok: true, text: '2FA activé avec succès.' });
    } catch (e) {
      setTwoFAMsg({ ok: false, text: e?.response?.data?.message || 'Code incorrect.' });
    } finally { setTwoFASaving(false); }
  };

  const handleDisable2FA = async () => {
    if (!window.confirm('Désactiver la double authentification ?')) return;
    setTwoFASaving(true); setTwoFAMsg(null);
    try {
      await authAPI.disable2FA();
      setTwoFAEnabled(false);
      setTwoFAMsg({ ok: true, text: '2FA désactivé.' });
    } catch (e) {
      setTwoFAMsg({ ok: false, text: e?.response?.data?.message || 'Erreur lors de la désactivation.' });
    } finally { setTwoFASaving(false); }
  };

  const [cfgTab, setCfgTab] = useState('plateforme');

  if (loading) return (
    <div style={{ padding: 60, textAlign: 'center' }}>
      <div style={{ width: 28, height: 28, border: `3px solid ${ACCENT}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
      <p style={{ fontSize: 13, fontWeight: 600, color: '#64748B', margin: 0 }}>Chargement…</p>
    </div>
  );

  const CFG_TABS = [
    { id: 'plateforme', label: 'Plateforme', icon: Building2 },
    { id: 'securite', label: 'Sécurité', icon: Lock },
    { id: 'integrations', label: 'Intégrations', icon: Zap },
    { id: 'paiements', label: 'Paiements', icon: CreditCard },
    { id: 'compte', label: 'Compte admin', icon: Shield },
  ];

  const Inp = (k, type = 'text', placeholder = '', suffix = null) => (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <input type={type} placeholder={placeholder}
        value={secEdits[k] ?? ''}
        onChange={e => setSecEdits(s => ({ ...s, [k]: e.target.value }))}
        style={{ ...inputStyle, flex: 1, color: '#0F172A', fontWeight: 500 }} />
      {suffix && <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>{suffix}</span>}
    </div>
  );

  return (
    <div style={{ display: 'flex', gap: 0, ...card, overflow: 'hidden', minHeight: 480 }}>

      {/* ── Sidebar navigation ── */}
      <div style={{ width: 180, borderRight: '1px solid #CBD5E1', background: '#F8FAFC', padding: '12px 0', flexShrink: 0 }}>
        {CFG_TABS.map(t => {
          const Icon = t.icon;
          const active = cfgTab === t.id;
          return (
            <button key={t.id} onClick={() => setCfgTab(t.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 18px', border: 'none', background: active ? '#FFFFFF' : 'transparent', cursor: 'pointer', borderLeft: `4px solid ${active ? '#2563EB' : 'transparent'}`, boxShadow: active ? '0 2px 8px rgba(0,0,0,0.04)' : 'none', transition: 'all 0.15s' }}>
              <Icon style={{ width: 15, height: 15, color: active ? '#2563EB' : '#64748B', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? '#0F172A' : '#475569', textAlign: 'left' }}>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Contenu ── */}
      <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>

        {/* ── PLATEFORME ── */}
        {cfgTab === 'plateforme' && (
          <div>
            <p style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', margin: '0 0 18px' }}>Identité légale</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
              <div style={{ marginBottom: 14 }}><label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>Nom commercial</label>{Inp('platform_nom', 'text', "Resto d'ici")}</div>
              <div style={{ marginBottom: 14 }}><label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>Adresse siège</label>{Inp('platform_adresse', 'text', "Abidjan, Côte d'Ivoire")}</div>
              <div style={{ marginBottom: 14 }}><label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>NIF</label>{Inp('platform_nif', 'text', 'NIF : CI-ABJ-XXXX-XXX')}</div>
              <div style={{ marginBottom: 14 }}><label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>RCCM</label>{Inp('platform_rccm', 'text', 'RCCM : CI-ABJ-XXXX-X-XXX')}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
              <div style={{ marginBottom: 14 }}><label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>Fuseau horaire</label>{Inp('timezone', 'text', 'Africa/Abidjan')}</div>
              <div style={{ marginBottom: 14 }}><label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>Devise</label>{Inp('currency', 'text', 'FCFA')}</div>
            </div>
            <button onClick={() => saveSecurityFields(['platform_nom', 'platform_adresse', 'platform_nif', 'platform_rccm', 'timezone', 'currency'])} disabled={saving.security} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 0', fontWeight: 700, fontSize: 12, cursor: saving.security ? 'not-allowed' : 'pointer', opacity: saving.security ? 0.65 : 1, marginTop: 4 }}>
              <Save style={{ width: 13, height: 13 }} /> {saving.security ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        )}

        {/* ── SÉCURITÉ ── */}
        {cfgTab === 'securite' && (
          <div>
            <p style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', margin: '0 0 18px' }}>Politiques d'accès</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
              <div style={{ marginBottom: 14 }}><label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>JWT TTL</label>{Inp('jwt_ttl_hours', 'number', '24', 'heures')}</div>
              <div style={{ marginBottom: 14 }}><label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>Coût bcrypt</label>{Inp('bcrypt_cost', 'number', '12')}</div>
              <div style={{ marginBottom: 14 }}><label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>Rate limit /auth</label>{Inp('rate_limit_auth', 'number', '10', 'req/min')}</div>
              <div style={{ marginBottom: 14 }}><label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>Rate limit global</label>{Inp('rate_limit_global', 'number', '100', 'req/min')}</div>
              <div style={{ marginBottom: 14 }}><label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>Rétention backups</label>{Inp('backup_retention_days', 'number', '90', 'jours')}</div>
            </div>
            <button onClick={() => saveSecurityFields(['jwt_ttl_hours', 'bcrypt_cost', 'rate_limit_auth', 'rate_limit_global', 'backup_retention_days'])} disabled={saving.security} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 0', fontWeight: 700, fontSize: 12, cursor: saving.security ? 'not-allowed' : 'pointer', opacity: saving.security ? 0.65 : 1, marginTop: 4 }}>
              <Save style={{ width: 13, height: 13 }} /> {saving.security ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        )}

        {/* ── INTÉGRATIONS ── */}
        {cfgTab === 'integrations' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', margin: 0 }}>Services connectés</p>
              <button onClick={() => setModal({})}
                style={{ background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Plus style={{ width: 13, height: 13 }} /> Ajouter
              </button>
            </div>

            {integrations.filter(i => CDC_NAMES.has(i.name)).length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 10, fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 8px' }}>Requis</p>
                {integrations.filter(i => CDC_NAMES.has(i.name)).map(i => (
                  <IntegrationDynamicCard key={i.id} integration={i}
                    onToggle={toggleIntegration} onEdit={(x) => setModal(x)}
                    onDelete={deleteIntegration} onTest={testIntegration}
                    testResult={testResults[i.id]} testing={testing[i.id]} />
                ))}
              </div>
            )}

            {integrations.filter(i => !CDC_NAMES.has(i.name)).length > 0 && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 8px' }}>Personnalisés</p>
                {integrations.filter(i => !CDC_NAMES.has(i.name)).map(i => (
                  <IntegrationDynamicCard key={i.id} integration={i}
                    onToggle={toggleIntegration} onEdit={(x) => setModal(x)}
                    onDelete={deleteIntegration} onTest={testIntegration}
                    testResult={testResults[i.id]} testing={testing[i.id]} />
                ))}
              </div>
            )}

            {integrations.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94A3B8' }}>
                <Zap style={{ width: 32, height: 32, margin: '0 auto 10px', display: 'block', opacity: 0.3 }} />
                <p style={{ fontSize: 13, fontWeight: 600, color: '#475569', margin: 0 }}>Aucune intégration</p>
              </div>
            )}
          </div>
        )}

        {/* ── PAIEMENTS ── */}
        {cfgTab === 'paiements' && (
          <div>
            <p style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', margin: '0 0 6px' }}>Moyens de paiement</p>
            <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 18px' }}>
              Activez ou désactivez les moyens proposés au client au moment du paiement. Un moyen désactivé disparaît du checkout.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {payMethods.map(m => {
                const on = m.enabled;
                const busy = !!payToggling[m.id];
                return (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 14px', border: '1px solid #E2E8F0', borderRadius: 10, background: on ? '#fff' : '#F8FAFC' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: on ? '#FFF5ED' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <CreditCard style={{ width: 16, height: 16, color: on ? ACCENT : '#94A3B8' }} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: on ? '#0F172A' : '#64748B', margin: 0 }}>{m.label}</p>
                        <p style={{ fontSize: 11, color: '#94A3B8', margin: '2px 0 0' }}>{m.provider} · {m.gateway}{m.needsPhone ? ' · téléphone requis' : ''}</p>
                      </div>
                    </div>
                    <button onClick={() => togglePayMethod(m)} disabled={busy}
                      title={on ? 'Désactiver' : 'Activer'}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.5 : 1, flexShrink: 0 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: on ? '#16A34A' : '#94A3B8' }}>{on ? 'Activé' : 'Désactivé'}</span>
                      {on
                        ? <ToggleRight style={{ width: 30, height: 30, color: '#16A34A' }} />
                        : <ToggleLeft style={{ width: 30, height: 30, color: '#CBD5E1' }} />}
                    </button>
                  </div>
                );
              })}
              {payMethods.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94A3B8' }}>
                  <CreditCard style={{ width: 32, height: 32, margin: '0 auto 10px', display: 'block', opacity: 0.3 }} />
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#475569', margin: 0 }}>Aucun moyen de paiement</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── COMPTE ADMIN ── */}
        {cfgTab === 'compte' && (
          <div>
            <p style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', margin: '0 0 18px' }}>Paramètres financiers</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0 20px', marginBottom: 24 }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>Numéro de réception Novasend</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="tel" placeholder="ex: 07XXXXXXXX" value={secEdits['ADMIN_NOVASEND_NUMBER'] ?? ''}
                    onChange={e => setSecEdits(s => ({ ...s, ADMIN_NOVASEND_NUMBER: e.target.value }))}
                    style={{ ...inputStyle, flex: 1, color: '#0F172A', fontWeight: 500 }} />
                </div>
                <p style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>Numéro utilisé pour recevoir les commissions de la plateforme.</p>
              </div>
              <button onClick={() => saveSecurityFields(['ADMIN_NOVASEND_NUMBER'])} disabled={saving.security} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 0', fontWeight: 700, fontSize: 12, cursor: saving.security ? 'not-allowed' : 'pointer', opacity: saving.security ? 0.65 : 1, marginTop: 4 }}>
                <Save style={{ width: 13, height: 13 }} /> {saving.security ? 'Enregistrement…' : 'Enregistrer le numéro'}
              </button>
            </div>

            <div style={{ borderTop: '1px solid #E2E8F0', margin: '22px 0 18px' }} />

            <p style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', margin: '0 0 18px' }}>Mot de passe</p>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>Mot de passe actuel</label>
              <input type="password" placeholder="••••••••" value={pwForm.current}
                onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))}
                style={{ ...inputStyle, color: '#0F172A', fontWeight: 500 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>Nouveau mot de passe</label>
                <input type="password" placeholder="Min. 8 caractères" value={pwForm.next}
                  onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))}
                  style={{ ...inputStyle, color: '#0F172A', fontWeight: 500 }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>Confirmer</label>
                <input type="password" placeholder="••••••••" value={pwForm.confirm}
                  onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                  style={{ ...inputStyle, color: '#0F172A', fontWeight: 500 }} />
              </div>
            </div>
            {pwMsg && (
              <div style={{ padding: '8px 12px', borderRadius: 8, background: pwMsg.ok ? '#DCFCE7' : '#FEE2E2', color: pwMsg.ok ? '#166534' : '#991B1B', fontSize: 12, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                {pwMsg.ok ? <CheckCircle style={{ width: 13, height: 13 }} /> : <XCircle style={{ width: 13, height: 13 }} />}
                {pwMsg.text}
              </div>
            )}
            <button onClick={handleChangePassword} disabled={pwSaving} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', background: '#059669', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 0', fontWeight: 700, fontSize: 12, cursor: pwSaving ? 'not-allowed' : 'pointer', opacity: pwSaving ? 0.65 : 1, marginTop: 4 }}>
              <Save style={{ width: 13, height: 13 }} /> {pwSaving ? 'Enregistrement…' : 'Changer le mot de passe'}
            </button>

            <div style={{ borderTop: '1px solid #E2E8F0', margin: '22px 0 18px' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', margin: 0 }}>Double authentification</p>
              <span style={{ background: twoFAEnabled ? '#DCFCE7' : '#F1F5F9', color: twoFAEnabled ? '#166534' : '#475569', borderRadius: 20, padding: '2px 10px', fontSize: 10, fontWeight: 800 }}>
                {twoFAEnabled ? 'ACTIVÉ' : 'DÉSACTIVÉ'}
              </span>
            </div>

            {twoFAMsg && (
              <div style={{ padding: '8px 12px', borderRadius: 8, background: twoFAMsg.ok ? '#DCFCE7' : '#FEE2E2', color: twoFAMsg.ok ? '#166534' : '#991B1B', fontSize: 12, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                {twoFAMsg.ok ? <CheckCircle style={{ width: 13, height: 13 }} /> : <XCircle style={{ width: 13, height: 13 }} />}
                {twoFAMsg.text}
              </div>
            )}

            {twoFAStep === 0 && !twoFAEnabled && (
              <button onClick={handleSetup2FA} disabled={twoFASaving}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', background: '#7C3AED', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 0', fontWeight: 700, fontSize: 12, cursor: twoFASaving ? 'not-allowed' : 'pointer', opacity: twoFASaving ? 0.65 : 1 }}>
                <Smartphone style={{ width: 13, height: 13 }} />
                {twoFASaving ? 'Génération…' : 'Configurer le 2FA'}
              </button>
            )}

            {twoFAStep === 1 && twoFAData && (
              <>
                <div style={{ textAlign: 'center', marginBottom: 12 }}>
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(twoFAData.otpauthUrl)}`}
                    alt="QR 2FA" style={{ borderRadius: 8, border: '1px solid #D1D9E6' }} />
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: 11, background: '#FFF5EB', border: '1px solid rgba(234,60,12,0.2)', borderRadius: 6, padding: '6px 10px', marginBottom: 12, wordBreak: 'break-all', color: '#FF3A03', letterSpacing: '0.1em' }}>
                  {twoFAData.secret}
                </div>
                <div>
                  <label style={labelStyle}>Code de vérification</label>
                  <input type="text" inputMode="numeric" maxLength={6} placeholder="000000" value={twoFACode}
                    onChange={e => setTwoFACode(e.target.value.replace(/\D/g, ''))}
                    style={{ ...inputStyle, letterSpacing: '0.4em', fontSize: 18, fontWeight: 800, textAlign: 'center', color: '#0F172A' }} />
                </div>
                <button onClick={handleEnable2FA} disabled={twoFASaving || twoFACode.length !== 6}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', background: '#7C3AED', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 0', fontWeight: 700, fontSize: 12, cursor: 'pointer', opacity: (twoFASaving || twoFACode.length !== 6) ? 0.55 : 1 }}>
                  <Check style={{ width: 13, height: 13 }} />
                  {twoFASaving ? 'Vérification…' : 'Activer le 2FA'}
                </button>
              </>
            )}

            {twoFAEnabled && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '10px 14px' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle style={{ width: 14, height: 14 }} /> Compte protégé par 2FA
                </span>
                <button onClick={handleDisable2FA} disabled={twoFASaving}
                  style={{ background: '#FEE2E2', color: '#991B1B', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <XCircle style={{ width: 12, height: 12 }} /> Désactiver
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {modal !== null && (
        <IntegrationModal initial={modal} onClose={() => setModal(null)} onSave={saveIntegration} />
      )}

      {/* ── Zone Maintenance ── */}
      <MaintenancePanel />
    </div>
  );
}

/* ══════════════════ PANNEAU MAINTENANCE ══════════════════ */
const PURGE_TARGETS = [
  { key: 'audit', label: "Logs d'audit", color: '#7C3AED', bg: '#F5F3FF' },
  { key: 'commandes', label: 'Historique commandes', color: '#DC2626', bg: '#FEF2F2' },
  { key: 'livraisons', label: 'Livraisons externes', color: '#FF3A03', bg: '#FFF5ED' },
  { key: 'notifications', label: 'Notifications', color: '#0284C7', bg: '#F0F9FF' },
];

function MaintenancePanel() {
  const [before, setBefore] = useState('');
  const [busy, setBusy] = useState({});
  const [results, setResults] = useState({});

  const purge = async (target) => {
    const label = target === 'all' ? 'TOUTES les données listées' : PURGE_TARGETS.find(t => t.key === target)?.label || target;
    const msg = before
      ? `Supprimer les données "${label}" antérieures au ${new Date(before).toLocaleDateString('fr-FR')} ?`
      : `Supprimer TOUT l'historique "${label}" sans limite de date ?`;
    if (!window.confirm(msg + '\n\nCette action est irréversible.')) return;
    setBusy(b => ({ ...b, [target]: true }));
    setResults(r => ({ ...r, [target]: null }));
    try {
      const res = await adminAPI.purgeHistorique(target, before || undefined);
      const total = Object.values(res.data.purged || {}).reduce((s, v) => s + Number(v), 0);
      setResults(r => ({ ...r, [target]: { ok: true, count: total } }));
    } catch {
      setResults(r => ({ ...r, [target]: { ok: false } }));
    } finally {
      setBusy(b => ({ ...b, [target]: false }));
    }
  };

  return (
    <div style={{ ...card, marginTop: 24, borderTop: '3px solid #EF4444' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <Trash2 style={{ width: 16, height: 16, color: '#DC2626' }} />
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0F172A' }}>Maintenance — Purger l'historique</h3>
      </div>
      <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 18px' }}>Supprime définitivement les enregistrements sélectionnés. Aucune restauration possible.</p>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>
          Supprimer les données antérieures au <span style={{ color: '#94A3B8', fontWeight: 400 }}>(laisser vide = tout supprimer)</span>
        </label>
        <input
          type="date"
          value={before}
          onChange={e => setBefore(e.target.value)}
          max={new Date().toISOString().slice(0, 10)}
          style={{ border: '1px solid #D1D9E6', borderRadius: 9, padding: '9px 14px', fontSize: 13, outline: 'none' }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginBottom: 16 }}>
        {PURGE_TARGETS.map(({ key, label, color, bg }) => (
          <div key={key} style={{ background: bg, borderRadius: 12, padding: '14px 16px', border: `1px solid ${color}22` }}>
            <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color }}>{label}</p>
            {results[key]?.ok === true && <p style={{ margin: '0 0 8px', fontSize: 11, color: '#059669', fontWeight: 600 }}>✓ {results[key].count} ligne(s) supprimée(s)</p>}
            {results[key]?.ok === false && <p style={{ margin: '0 0 8px', fontSize: 11, color: '#DC2626', fontWeight: 600 }}>✗ Erreur lors de la purge</p>}
            <button
              onClick={() => purge(key)}
              disabled={!!busy[key]}
              style={{ width: '100%', padding: '8px', borderRadius: 8, border: `1px solid ${color}44`, background: '#fff', color, fontWeight: 700, fontSize: 12, cursor: busy[key] ? 'wait' : 'pointer', opacity: busy[key] ? 0.7 : 1 }}
            >
              {busy[key] ? 'Suppression…' : 'Purger'}
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={() => purge('all')}
        disabled={Object.values(busy).some(Boolean)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FEF2F2', border: '1.5px solid #FCA5A5', color: '#DC2626', borderRadius: 10, padding: '11px 18px', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
      >
        <Trash2 style={{ width: 14, height: 14 }} />
        Tout purger (audit + commandes + livraisons + notifications)
      </button>
    </div>
  );
}
