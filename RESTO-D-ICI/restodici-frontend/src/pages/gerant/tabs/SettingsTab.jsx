/* SettingsTab — extrait de GerantDashboard */
import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { CheckCircle, Eye, EyeOff, Lock, Mail, MapPin, Plus, Printer, QrCode, Settings, Shield, UserPlus, Users, X } from "lucide-react";
import { authAPI, restaurantAPI, staffAPI, uploadsAPI } from "../../../services/api";
import { CI_PHONE_PATTERN, EMAIL_PATTERN, MSG } from "../../../utils/validators";
import { DeliveryZonesMap } from "../_shared";

export default function SettingsTab({ restaurantId, user }) {
  const defaultLat = 5.3364;
  const defaultLng = -4.0267;
  const [settings, setSettings] = useState({
    nom: "",
    description: "",
    adresse: "",
    telephone: "",
    email: "",
    logo: "",
    horaires: { ouverture: "08:00", fermeture: "22:00" },
    zonesLivraison: [],
    newZone: { nom: "", lat: defaultLat, lng: defaultLng },
    latitude: defaultLat,
    longitude: defaultLng,
    darkMode: localStorage.getItem("darkMode") === "true",
  });
  const [staffAccounts, setStaffAccounts] = useState([]);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [staffForm, setStaffForm] = useState({
    email: "",
    nom: "",
    telephone: "",
    password: "",
  });
  const [staffCreationNotice, setStaffCreationNotice] = useState("");
  const [loadingStaff, setLoadingStaff] = useState(false);

  /* ── Security state ── */
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [secPwd, setSecPwd] = useState({ current: "", next: "", confirm: "" });
  const [showSecPwd, setShowSecPwd] = useState({ current: false, next: false, confirm: false });
  const [secSaving, setSecSaving] = useState(false);
  const [secSuccess, setSecSuccess] = useState("");
  const [secError, setSecError] = useState("");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.twoFactorEnabled ?? false);
  const [show2FA, setShow2FA] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [backupCodes, setBackupCodes] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");

  /* ── QR Codes tables ── */
  const [nbTables, setNbTables] = useState(10);
  const [tableQrCodes, setTableQrCodes] = useState([]);
  const [tableQrLoading, setTableQrLoading] = useState(false);

  /* ── Sidebar active section tracking ── */
  const [activeSection, setActiveSection] = useState('sec-profil');

  const handleGenerateTableQR = async () => {
    setTableQrLoading(true);
    try {
      const origin = window.location.origin;
      const codes = await Promise.all(
        Array.from({ length: nbTables }, (_, i) => i + 1).map(async (n) => {
          const url = `${origin}/menu?restaurant=${restaurantId}&table=${n}`;
          const dataUrl = await QRCode.toDataURL(url, {
            width: 220, margin: 1,
            color: { dark: '#1A0C00', light: '#FFF9F3' },
          });
          return { table: n, dataUrl, url };
        })
      );
      setTableQrCodes(codes);
    } catch (e) {
      console.error('QR gen error', e);
    } finally {
      setTableQrLoading(false);
    }
  };

  const handlePrintTableQR = () => {
    const rows = tableQrCodes.map(({ table, dataUrl }) =>
      `<div style="display:inline-flex;flex-direction:column;align-items:center;margin:16px;page-break-inside:avoid;border:1px solid #eee;border-radius:12px;padding:16px;background:#fffaf3">
        <img src="${dataUrl}" style="width:180px;height:180px"/>
        <p style="font-family:sans-serif;font-weight:900;font-size:18px;margin:10px 0 2px;color:#1a0c00">Table ${table}</p>
        <p style="font-family:sans-serif;font-size:11px;color:#b09070;margin:0">Scannez pour commander</p>
      </div>`
    ).join('');
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>QR Codes Tables</title><style>@media print{body{margin:0}}body{text-align:center;padding:24px;background:#fff}</style></head><body>${rows}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  const handleLogoUpload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Image uniquement (jpg, png, webp)'); return; }
    if (file.size > 5 * 1024 * 1024) { alert("Taille max : 5 Mo"); return; }
    setUploadingLogo(true);
    try {
      const res = await uploadsAPI.uploadImage(file);
      setSettings(p => ({ ...p, logo: res.data.url }));
    } catch {
      const localUrl = URL.createObjectURL(file);
      setSettings(p => ({ ...p, logo: localUrl }));
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleChangePwd = async () => {
    setSecError(""); setSecSuccess("");
    if (!secPwd.current) { setSecError("Mot de passe actuel requis"); return; }
    if (secPwd.next.length < 6) { setSecError("Minimum 6 caractères"); return; }
    if (secPwd.next !== secPwd.confirm) { setSecError("Les mots de passe ne correspondent pas"); return; }
    setSecSaving(true);
    try {
      await authAPI.changePassword({ currentPassword: secPwd.current, newPassword: secPwd.next });
      setSecSuccess("Mot de passe modifié avec succès.");
      setSecPwd({ current: "", next: "", confirm: "" });
      setTimeout(() => { setShowPasswordForm(false); setSecSuccess(""); }, 2500);
    } catch (e) { setSecError(e?.response?.data?.message || "Mot de passe actuel incorrect."); }
    finally { setSecSaving(false); }
  };

  const handleSetup2FA = async () => {
    setSecSaving(true); setSecError(""); setSecSuccess("");
    try {
      const res = await authAPI.setup2FA();
      setQrData(res.data); setShow2FA(true);
    } catch { setSecError("Erreur lors de la configuration 2FA"); }
    finally { setSecSaving(false); }
  };

  const handleEnable2FA = async () => {
    if (!/^\d{6}$/.test(twoFactorCode)) { setSecError("Code à 6 chiffres requis"); return; }
    setSecSaving(true); setSecError("");
    try {
      const res = await authAPI.enable2FA(twoFactorCode);
      setTwoFactorEnabled(true); setShow2FA(false);
      if (res.data?.backupCodes?.length) setBackupCodes(res.data.backupCodes);
      setSecSuccess("2FA activée avec succès — conservez vos codes de secours !");
      setTwoFactorCode("");
    } catch (e) { setSecError(e?.response?.data?.message || "Code invalide"); }
    finally { setSecSaving(false); }
  };

  const handleDisable2FA = async () => {
    setSecSaving(true); setSecError(""); setSecSuccess("");
    try {
      await authAPI.disable2FA();
      setTwoFactorEnabled(false); setShow2FA(false);
      setSecSuccess("2FA désactivée.");
    } catch { setSecError("Erreur lors de la désactivation"); }
    finally { setSecSaving(false); }
  };

  const syncStoredUserRestaurant = useCallback((restaurantData) => {
    const cachedUser = JSON.parse(localStorage.getItem("user") || "{}");
    const nextUser = {
      ...cachedUser,
      restaurant: {
        ...(cachedUser.restaurant || {}),
        ...restaurantData,
      },
    };
    localStorage.setItem("user", JSON.stringify(nextUser));
    window.dispatchEvent(new CustomEvent("gerant-restaurant-updated", { detail: nextUser.restaurant }));
  }, []);

  useEffect(() => {
    const loadSettings = async () => {
      if (!restaurantId) return;
      try {
        setLoadingProfile(true);
        const profileRes = await restaurantAPI.getMine();
        const profile = profileRes.data || {};
        const zones = Array.isArray(profile.deliveryZones) ? profile.deliveryZones : [];
        setSettings((prev) => ({
          ...prev,
          nom: profile.nom || prev.nom,
          description: profile.description || "",
          adresse: profile.adresse || "",
          telephone: profile.telephone || "",
          email: profile.email || user?.email || "",
          logo: profile.logo || "",
          horaires: {
            ouverture: profile.openingTime || prev.horaires.ouverture,
            fermeture: profile.closingTime || prev.horaires.fermeture,
          },
          zonesLivraison: zones,
          newZone: {
            nom: "",
            lat: Number(profile.latitude) || defaultLat,
            lng: Number(profile.longitude) || defaultLng,
          },
          latitude: Number(profile.latitude) || defaultLat,
          longitude: Number(profile.longitude) || defaultLng,
        }));
        syncStoredUserRestaurant(profile);
      } catch (error) {
        console.error("Erreur chargement profil restaurant:", error);
      } finally {
        setLoadingProfile(false);
      }
    };

    loadSettings();
  }, [defaultLat, defaultLng, restaurantId, syncStoredUserRestaurant, user?.email]);

  useEffect(() => {
    localStorage.setItem("darkMode", settings.darkMode ? "true" : "false");
    window.dispatchEvent(new CustomEvent("gerant-dark-mode-changed"));
  }, [settings.darkMode]);

  useEffect(() => {
    const loadStaff = async () => {
      if (!restaurantId) return;
      try {
        setLoadingStaff(true);
        const staffRes = await staffAPI.getStaffAccounts(restaurantId);
        setStaffAccounts(staffRes.data || []);
      } catch (error) {
        console.error("Erreur chargement staff:", error);
      } finally {
        setLoadingStaff(false);
      }
    };
    loadStaff();
  }, [restaurantId]);

  const handleSaveSettings = async () => {
    try {
      if (!restaurantId) return;
      setSavingSettings(true);
      const payload = {
        nom: settings.nom.trim(),
        description: settings.description.trim(),
        adresse: settings.adresse.trim(),
        telephone: settings.telephone.trim(),
        email: settings.email.trim(),
        logo: settings.logo.trim(),
        openingTime: settings.horaires.ouverture,
        closingTime: settings.horaires.fermeture,
        latitude: settings.latitude,
        longitude: settings.longitude,
        deliveryZones: settings.zonesLivraison,
      };

      const response = await restaurantAPI.update(restaurantId, payload);
      const savedProfile = response.data || payload;
      syncStoredUserRestaurant(savedProfile);
      setSettings((prev) => ({
        ...prev,
        nom: savedProfile.nom || prev.nom,
        description: savedProfile.description || "",
        adresse: savedProfile.adresse || "",
        telephone: savedProfile.telephone || "",
        email: savedProfile.email || prev.email,
        logo: savedProfile.logo || "",
        horaires: {
          ouverture: savedProfile.openingTime || prev.horaires.ouverture,
          fermeture: savedProfile.closingTime || prev.horaires.fermeture,
        },
        zonesLivraison: Array.isArray(savedProfile.deliveryZones)
          ? savedProfile.deliveryZones
          : prev.zonesLivraison,
        latitude: Number(savedProfile.latitude) || prev.latitude,
        longitude: Number(savedProfile.longitude) || prev.longitude,
      }));
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2500);
    } catch (error) {
      console.error("Erreur sauvegarde paramètres:", error);
      alert(error.response?.data?.message || "Erreur lors de la sauvegarde des paramètres");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddZone = () => {
    const zoneName = settings.newZone.nom.trim();
    if (!zoneName) {
      alert("Le nom de la zone est requis.");
      return;
    }

    if (
      settings.zonesLivraison.some(
        (zone) => (zone.nom || "").toLowerCase() === zoneName.toLowerCase(),
      )
    ) {
      alert("Cette zone existe déjà.");
      return;
    }

    setSettings((prev) => ({
      ...prev,
      zonesLivraison: [
        ...prev.zonesLivraison,
        {
          nom: zoneName,
          lat: Number(prev.newZone.lat) || null,
          lng: Number(prev.newZone.lng) || null,
        },
      ],
      newZone: {
        ...prev.newZone,
        nom: "",
      },
    }));
  };

  const handleRemoveZone = (zoneToRemove) => {
    setSettings((prev) => ({
      ...prev,
      zonesLivraison: prev.zonesLivraison.filter((zone) => zone.nom !== zoneToRemove.nom),
    }));
  };

  const handleMapPick = ({ lat, lng }) => {
    setSettings((prev) => ({
      ...prev,
      newZone: {
        ...prev.newZone,
        lat,
        lng,
      },
      latitude: lat,
      longitude: lng,
    }));
  };

  const toggleDarkMode = () => {
    setSettings((prev) => ({ ...prev, darkMode: !prev.darkMode }));
  };

  const handleCreateStaff = async () => {
    try {
      if (!staffForm.email || !staffForm.nom) {
        alert("Email et nom sont requis");
        return;
      }

      const staffData = {
        email: staffForm.email,
        nom: staffForm.nom,
        telephone: staffForm.telephone || "",
      };
      if (staffForm.password) {
        staffData.password = staffForm.password;
      }

      const response = await staffAPI.createStaffAccount(restaurantId, staffData);
      const generatedPassword = response.data?.temporaryPassword;

      if (generatedPassword) {
        setStaffCreationNotice(
          `Mot de passe temporaire généré : ${generatedPassword}. Transmets-le au nouveau staff.`,
        );
      } else {
        setStaffCreationNotice(
          "Le compte staff a été créé. Le mot de passe fourni est utilisé.",
        );
      }

      setStaffForm({ email: "", nom: "", telephone: "", password: "" });
      const staffRes = await staffAPI.getStaffAccounts(restaurantId);
      setStaffAccounts(staffRes.data || []);
    } catch (error) {
      console.error("Erreur création staff:", error);
      alert(error.response?.data?.message || "Erreur lors de la création du compte staff");
    }
  };

  const handleToggleStaff = async (staffId, currentStatus) => {
    try {
      await staffAPI.toggleStaffAccount(restaurantId, staffId, {
        actif: !currentStatus,
      });
      const staffRes = await staffAPI.getStaffAccounts(restaurantId);
      setStaffAccounts(staffRes.data || []);
    } catch (error) {
      console.error("Erreur activation/désactivation staff:", error);
      alert("Erreur lors de la modification du statut du compte");
    }
  };


  if (loadingProfile) {
    return (
      <div className="flex min-h-[280px] items-center justify-center">
        <div className="h-10 w-10 rounded-full border-4 border-[#EA580C] border-t-transparent animate-spin" />
      </div>
    );
  }

  const inputCls = "w-full rounded-xl border px-4 py-3.5 text-[15px] outline-none transition focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C]/60";
  const inputStyle = { borderColor: 'rgba(255,140,0,0.2)', background: '#FDF8F3' };

  const SEC_NAV = [
    { id: 'sec-profil',    label: 'Profil',      emoji: '🏠' },
    { id: 'sec-horaires',  label: 'Horaires',    emoji: '🕐' },
    { id: 'sec-livraison', label: 'Livraison',   emoji: '📍' },
    { id: 'sec-apparence', label: 'Apparence',   emoji: '🎨' },
    { id: 'sec-staff',     label: 'Staff',       emoji: '👥' },
    { id: 'sec-securite',  label: 'Sécurité',    emoji: '🔒' },
    { id: 'sec-qr',        label: 'QR Tables',   emoji: '📱' },
  ];

  return (
    <div className="max-w-7xl">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: '#EA580C' }}>Configuration</p>
          <h2 className="mt-1 text-2xl font-bold text-[#1A0C00]">Paramètres du restaurant</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {[
              `${settings.zonesLivraison.length} zone(s) de livraison`,
              `${staffAccounts.length} compte(s) staff`,
              `${settings.horaires.ouverture}–${settings.horaires.fermeture}`,
            ].map(t => (
              <span key={t} className="rounded-full px-3 py-1 text-xs font-medium text-[#1A0C00]" style={{ background: '#FFF0DF' }}>{t}</span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {settingsSaved && (
            <span className="flex items-center gap-1.5 text-sm font-semibold text-green-600">
              <CheckCircle className="h-4 w-4" /> Sauvegardé
            </span>
          )}
          <button
            onClick={handleSaveSettings}
            disabled={savingSettings}
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm transition disabled:opacity-60"
            style={{ background: '#EA580C' }}
          >
            <Settings className="h-4 w-4" />
            {savingSettings ? 'Enregistrement…' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      <div className="flex gap-6 items-start">

        {/* ── Sidebar navigation minimale ── */}
        <aside className="shrink-0" style={{ width: 172, position: 'sticky', top: 80, alignSelf: 'flex-start' }}>
          <nav style={{ background: '#fff', border: '1px solid rgba(255,140,0,0.14)', borderRadius: 18, overflow: 'hidden', boxShadow: '0 2px 10px rgba(139,110,80,0.08)' }}>
            <div style={{ padding: '12px 14px 8px', borderBottom: '1px solid rgba(255,140,0,0.08)' }}>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#EA580C' }}>
                Paramètres
              </p>
            </div>
            <div style={{ padding: '6px 0' }}>
              {SEC_NAV.map(({ id, label, emoji }) => {
                const isActive = activeSection === id;
                return (
                  <button key={id} type="button"
                    onClick={() => setActiveSection(id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 9,
                      width: '100%', padding: '9px 14px',
                      border: 'none',
                      borderLeft: isActive ? '3px solid #EA580C' : '3px solid transparent',
                      background: isActive ? 'rgba(255,140,0,0.07)' : 'transparent',
                      cursor: 'pointer', fontFamily: 'inherit',
                      fontSize: 13, fontWeight: isActive ? 700 : 500,
                      color: isActive ? '#EA580C' : '#8B6E50',
                      textAlign: 'left', transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = '#FFF0DF'; e.currentTarget.style.color = '#EA580C'; }}}
                    onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8B6E50'; }}}
                  >
                    <span style={{ fontSize: 14 }}>{emoji}</span>
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </aside>

        {/* Contenu principal — un seul onglet visible à la fois */}
        <div className="flex-1 min-w-0 space-y-6">

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Colonne gauche (profil, horaires, livraison) */}
        <div className="xl:col-span-2 space-y-6">

          {/* Profil */}
          <div id="sec-profil" className="rounded-2xl border bg-white p-6 scroll-mt-4" style={{ borderColor: 'rgba(255,140,0,0.14)', display: activeSection === 'sec-profil' ? '' : 'none' }}>
            <div className="mb-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: '#EA580C' }}>Identité</p>
              <h3 className="mt-1 text-base font-bold text-[#1A0C00]">Profil du restaurant</h3>
              <p className="mt-0.5 text-xs text-[#8B6E50]">Ces informations apparaissent sur la fiche publique et le tableau de bord.</p>
            </div>

            {/* Logo */}
            <div className="flex items-start gap-4 mb-6 p-4 rounded-xl" style={{ background: '#FDF8F3', border: '1px solid rgba(255,140,0,0.1)' }}>
              <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border" style={{ borderColor: 'rgba(255,140,0,0.18)' }}>
                {settings.logo
                  ? <img src={settings.logo} alt="Logo" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-3xl" style={{ background: '#FFF0DF' }}>🍽️</div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#1A0C00] mb-0.5">Logo du restaurant</p>
                <p className="text-xs text-[#9CA3AF] mb-3">JPG, PNG, WebP — max 5 Mo</p>
                <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer border transition ${uploadingLogo ? 'opacity-50 pointer-events-none' : 'hover:bg-[#FFF0DF]'}`}
                  style={{ borderColor: 'rgba(255,140,0,0.3)', color: '#EA580C', background: '#fff' }}>
                  📷 {uploadingLogo ? 'Téléchargement…' : 'Choisir un fichier'}
                  <input type="file" accept="image/*" className="hidden" disabled={uploadingLogo}
                    onChange={e => handleLogoUpload(e.target.files[0])} />
                </label>
                <input type="text" value={settings.logo}
                  onChange={e => setSettings(p => ({ ...p, logo: e.target.value }))}
                  placeholder="ou collez une URL directement"
                  className="mt-2 w-full rounded-lg border px-3 py-1.5 text-xs outline-none"
                  style={{ borderColor: 'rgba(255,140,0,0.15)', background: '#fff' }}
                />
              </div>
            </div>

            {/* Champs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#374151]">Nom du restaurant</label>
                <input type="text" value={settings.nom}
                  onChange={e => setSettings(p => ({ ...p, nom: e.target.value }))}
                  className={inputCls} style={inputStyle} placeholder="Ex: Le Bistrot d'Abidjan" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#374151]">Téléphone</label>
                <input type="tel" inputMode="tel" pattern={CI_PHONE_PATTERN} maxLength={20} title={MSG.phone} value={settings.telephone}
                  onChange={e => setSettings(p => ({ ...p, telephone: e.target.value }))}
                  className={inputCls} style={inputStyle} placeholder="+225 07 12 34 56 78" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#374151]">Email</label>
                <input type="email" pattern={EMAIL_PATTERN} title={MSG.email} value={settings.email}
                  onChange={e => setSettings(p => ({ ...p, email: e.target.value }))}
                  className={inputCls} style={inputStyle} placeholder="contact@restaurant.ci" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#374151]">Adresse</label>
                <input type="text" value={settings.adresse}
                  onChange={e => setSettings(p => ({ ...p, adresse: e.target.value }))}
                  className={inputCls} style={inputStyle} placeholder="Cocody, Abidjan" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-semibold text-[#374151]">Description</label>
                <textarea value={settings.description}
                  onChange={e => setSettings(p => ({ ...p, description: e.target.value }))}
                  rows={3} placeholder="Décrivez l'ambiance et la spécialité de votre restaurant…"
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition resize-none focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C]/60"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* Horaires */}
          <div id="sec-horaires" className="rounded-2xl border bg-white p-6 scroll-mt-4" style={{ borderColor: 'rgba(255,140,0,0.14)', display: activeSection === 'sec-horaires' ? '' : 'none' }}>
            <div className="mb-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: '#EA580C' }}>Disponibilité</p>
              <h3 className="mt-1 text-base font-bold text-[#1A0C00]">Horaires d'ouverture</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#374151]">Ouverture</label>
                <input type="time" value={settings.horaires.ouverture}
                  onChange={e => setSettings(p => ({ ...p, horaires: { ...p.horaires, ouverture: e.target.value } }))}
                  className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#374151]">Fermeture</label>
                <input type="time" value={settings.horaires.fermeture}
                  onChange={e => setSettings(p => ({ ...p, horaires: { ...p.horaires, fermeture: e.target.value } }))}
                  className={inputCls} style={inputStyle} />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3 p-3 rounded-xl" style={{ background: '#FDF8F3' }}>
              <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
              <p className="text-xs text-[#8B6E50]">
                Ouvert de <strong className="text-[#1A0C00]">{settings.horaires.ouverture}</strong> à <strong className="text-[#1A0C00]">{settings.horaires.fermeture}</strong>
              </p>
            </div>
          </div>

          {/* Zones de livraison */}
          <div id="sec-livraison" className="rounded-2xl border bg-white p-6 scroll-mt-4" style={{ borderColor: 'rgba(255,140,0,0.14)', display: activeSection === 'sec-livraison' ? '' : 'none' }}>
            <div className="mb-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: '#EA580C' }}>Logistique</p>
              <h3 className="mt-1 text-base font-bold text-[#1A0C00]">Zones de livraison</h3>
              <p className="mt-0.5 text-xs text-[#8B6E50]">Cliquez sur la carte pour définir précisément la position.</p>
            </div>
            <div className="flex gap-2 mb-4">
              <input type="text" value={settings.newZone.nom}
                onChange={e => setSettings(p => ({ ...p, newZone: { ...p.newZone, nom: e.target.value } }))}
                placeholder="Nom de la zone (ex: Cocody, Plateau…)"
                className="flex-1 rounded-xl border px-4 py-2.5 text-sm outline-none"
                style={inputStyle}
              />
              <button onClick={handleAddZone}
                className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition"
                style={{ background: '#EA580C' }}>
                <Plus className="h-4 w-4" /> Ajouter
              </button>
            </div>
            {settings.zonesLivraison.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {settings.zonesLivraison.map((zone, i) => (
                  <div key={i} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium"
                    style={{ borderColor: 'rgba(255,140,0,0.2)', background: '#FDF8F3', color: '#1A0C00' }}>
                    <MapPin className="h-3 w-3" style={{ color: '#EA580C' }} />
                    {zone.nom}
                    <button onClick={() => handleRemoveZone(zone)} className="ml-0.5 text-[#9CA3AF] hover:text-red-500 transition font-bold">×</button>
                  </div>
                ))}
              </div>
            )}
            <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'rgba(255,140,0,0.14)' }}>
              <DeliveryZonesMap
                restaurantPosition={{ lat: settings.latitude, lng: settings.longitude }}
                selectedPosition={{ lat: settings.newZone.lat, lng: settings.newZone.lng }}
                zones={settings.zonesLivraison}
                onPick={handleMapPick}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-[#9CA3AF]">
              <span>Restaurant : {Number(settings.latitude).toFixed(4)}, {Number(settings.longitude).toFixed(4)}</span>
              <span>·</span>
              <span>Zone : {Number(settings.newZone.lat).toFixed(4)}, {Number(settings.newZone.lng).toFixed(4)}</span>
            </div>
          </div>
        </div>

        {/* ── Colonne droite (1/3) ── */}
        <div className="space-y-5">

          {/* Apparence */}
          <div id="sec-apparence" className="rounded-2xl border bg-white p-5 scroll-mt-4" style={{ borderColor: 'rgba(255,140,0,0.14)', display: activeSection === 'sec-apparence' ? '' : 'none' }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: '#EA580C' }}>Interface</p>
                <h4 className="mt-0.5 text-sm font-bold text-[#1A0C00]">Mode sombre</h4>
                <p className="text-[11px] text-[#9CA3AF] mt-0.5">{settings.darkMode ? 'Activé' : 'Désactivé'}</p>
              </div>
              <button onClick={toggleDarkMode}
                className="relative h-7 w-12 rounded-full flex-shrink-0 transition-colors"
                style={{ background: settings.darkMode ? '#EA580C' : '#E5E7EB' }}>
                <span className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${settings.darkMode ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          </div>

          {/* Comptes staff */}
          <div id="sec-staff" className="rounded-2xl border bg-white p-5 scroll-mt-4" style={{ borderColor: 'rgba(255,140,0,0.14)', display: activeSection === 'sec-staff' ? '' : 'none' }}>
            <div className="mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: '#EA580C' }}>Équipe</p>
              <h3 className="mt-1 text-sm font-bold text-[#1A0C00]">Comptes staff</h3>
            </div>

            {/* Formulaire création */}
            <div className="rounded-xl p-4 space-y-3 mb-4" style={{ background: '#FDF8F3', border: '1px solid rgba(255,140,0,0.1)' }}>
              <p className="text-xs font-bold text-[#1A0C00] flex items-center gap-2">
                <UserPlus className="h-3.5 w-3.5" style={{ color: '#EA580C' }} /> Nouveau compte
              </p>
              <div className="space-y-2">
                {[
                  { label: 'Email *', key: 'email', type: 'email', ph: 'staff@resto.com' },
                  { label: 'Nom complet *', key: 'nom', type: 'text', ph: 'Konan Aya' },
                  { label: 'Téléphone', key: 'telephone', type: 'tel', ph: '+225 07 00 00 00' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-sm font-semibold text-[#374151] mb-1.5">{f.label}</label>
                    <input type={f.type} value={staffForm[f.key]}
                      onChange={e => setStaffForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.ph}
                      className="w-full rounded-xl border px-4 py-3.5 text-[15px] outline-none transition focus:ring-1 focus:ring-[#EA580C]/30"
                      style={{ borderColor: 'rgba(255,140,0,0.2)', background: '#fff' }}
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-semibold text-[#374151] mb-1.5">Mot de passe (optionnel)</label>
                  <input type="password" value={staffForm.password}
                    onChange={e => setStaffForm(p => ({ ...p, password: e.target.value }))}
                    placeholder="Vide = généré auto"
                    className="w-full rounded-xl border px-4 py-3.5 text-[15px] outline-none"
                    style={{ borderColor: 'rgba(255,140,0,0.2)', background: '#fff' }}
                  />
                </div>
              </div>
              <button onClick={handleCreateStaff}
                className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition"
                style={{ background: '#EA580C' }}>
                Créer le compte
              </button>
              {staffCreationNotice && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-xs text-green-800">
                  {staffCreationNotice}
                </div>
              )}
            </div>

            {/* Liste staff */}
            {loadingStaff ? (
              <div className="flex justify-center py-5">
                <div className="h-6 w-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#EA580C', borderTopColor: 'transparent' }} />
              </div>
            ) : staffAccounts.length === 0 ? (
              <div className="text-center py-6">
                <Users className="mx-auto h-8 w-8 mb-2 text-[#D1D5DB]" />
                <p className="text-xs text-[#9CA3AF]">Aucun compte staff créé</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF] mb-2">
                  Membres actifs ({staffAccounts.length})
                </p>
                {staffAccounts.map(staff => {
                  const ini = (staff.nom || 'S').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                  return (
                    <div key={staff.id} className="flex items-center gap-3 p-3 rounded-xl border"
                      style={{ borderColor: 'rgba(255,140,0,0.1)', background: '#FDF8F3' }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: '#FFF0DF', color: '#EA580C' }}>
                        {ini}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#1A0C00] truncate">{staff.nom}</p>
                        <p className="text-[10px] text-[#9CA3AF] truncate">{staff.email}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${staff.actif ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                          {staff.actif ? 'Actif' : 'Inactif'}
                        </span>
                        <button onClick={() => handleToggleStaff(staff.id, staff.actif)}
                          className={`rounded-lg px-2.5 py-1 text-[10px] font-bold text-white transition ${staff.actif ? 'bg-red-500 hover:bg-red-600' : 'bg-[#EA580C] hover:bg-[#C2410C]'}`}>
                          {staff.actif ? 'Désactiver' : 'Activer'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sécurité */}
          <div id="sec-securite" className="rounded-2xl border bg-white p-5 space-y-4 scroll-mt-4" style={{ borderColor: 'rgba(255,140,0,0.14)', display: (activeSection === 'sec-securite' || activeSection === 'sec-qr') ? '' : 'none' }}>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: '#EA580C' }}>Sécurité</p>
              <h3 className="mt-1 text-sm font-bold text-[#1A0C00]">Authentification & Protection</h3>
            </div>

            {secSuccess && <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2.5 text-xs text-green-700">{secSuccess}</div>}
            {secError   && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">{secError}</div>}

            {/* Email */}
            <div className="flex items-center gap-3 p-3 rounded-xl border"
              style={{ borderColor: 'rgba(255,140,0,0.1)', background: '#FDF8F3' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-50 shrink-0">
                <Mail className="h-3.5 w-3.5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#1A0C00]">Email vérifié</p>
                <p className="text-[10px] text-[#9CA3AF] truncate">{user?.email}</p>
              </div>
              <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700 shrink-0">✓ OK</span>
            </div>

            {/* Mot de passe */}
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(255,140,0,0.1)' }}>
              <div className="flex items-center justify-between gap-3 p-3" style={{ background: '#FDF8F3' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#FFF0DF' }}>
                    <Lock className="h-3.5 w-3.5" style={{ color: '#EA580C' }} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#1A0C00]">Mot de passe</p>
                    <p className="text-[10px] text-[#9CA3AF]">Modifier régulièrement</p>
                  </div>
                </div>
                <button
                  onClick={() => { setShowPasswordForm(!showPasswordForm); setSecError(''); setSecSuccess(''); }}
                  className="rounded-lg px-3 py-1.5 text-[10px] font-bold text-white transition"
                  style={{ background: '#EA580C' }}>
                  Modifier
                </button>
              </div>
              {showPasswordForm && (
                <div className="p-3 border-t space-y-2.5" style={{ borderColor: 'rgba(255,140,0,0.1)' }}>
                  {[
                    { key: 'current', ph: 'Mot de passe actuel' },
                    { key: 'next',    ph: 'Nouveau (6 caractères min.)' },
                    { key: 'confirm', ph: 'Confirmer le nouveau' },
                  ].map(({ key, ph }) => (
                    <div key={key} className="relative">
                      <input
                        type={showSecPwd[key] ? 'text' : 'password'}
                        placeholder={ph} value={secPwd[key]}
                        onChange={e => setSecPwd(p => ({ ...p, [key]: e.target.value }))}
                        className="w-full rounded-lg border px-3 py-2 pr-9 text-xs outline-none transition focus:ring-1 focus:ring-[#EA580C]/30"
                        style={{ borderColor: 'rgba(255,140,0,0.2)', background: '#fff' }}
                      />
                      <button type="button"
                        onClick={() => setShowSecPwd(s => ({ ...s, [key]: !s[key] }))}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
                        {showSecPwd[key] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  ))}
                  {secPwd.next.length > 0 && (
                    <div className="flex gap-1">
                      {[1,2,3,4].map(i => (
                        <div key={i} className="h-1 flex-1 rounded-full" style={{
                          background: i <= Math.min(Math.floor(secPwd.next.length / 3), 4)
                            ? (secPwd.next.length < 6 ? '#EF4444' : secPwd.next.length < 9 ? '#EA580C' : '#16A34A')
                            : '#E5E7EB'
                        }} />
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button onClick={handleChangePwd} disabled={secSaving}
                      className="flex-1 rounded-lg py-2 text-xs font-bold text-white disabled:opacity-50"
                      style={{ background: '#EA580C' }}>
                      {secSaving ? 'Enregistrement…' : 'Confirmer'}
                    </button>
                    <button onClick={() => setShowPasswordForm(false)}
                      className="rounded-lg border px-3 py-2 text-xs text-[#8B6E50]"
                      style={{ borderColor: 'rgba(255,140,0,0.2)' }}>
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 2FA */}
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(255,140,0,0.1)' }}>
              <div className="flex flex-wrap items-center justify-between gap-3 p-3" style={{ background: '#FDF8F3' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#FFF0DF' }}>
                    <Shield className="h-3.5 w-3.5" style={{ color: '#EA580C' }} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#1A0C00]">Double authentification</p>
                    <p className="text-[10px] text-[#9CA3AF]">TOTP — Google Auth / Authy</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {twoFactorEnabled && (
                    <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">Actif</span>
                  )}
                  <button
                    onClick={twoFactorEnabled ? handleDisable2FA : handleSetup2FA}
                    disabled={secSaving}
                    className={`rounded-lg px-3 py-1.5 text-[10px] font-bold text-white transition disabled:opacity-50 ${twoFactorEnabled ? 'bg-red-500 hover:bg-red-600' : 'bg-[#EA580C] hover:bg-[#C2410C]'}`}>
                    {twoFactorEnabled ? 'Désactiver' : 'Configurer'}
                  </button>
                </div>
              </div>

              {show2FA && qrData && (
                <div className="p-3 border-t space-y-3" style={{ borderColor: 'rgba(255,140,0,0.1)' }}>
                  <p className="text-[11px] text-[#8B6E50]">
                    Scannez avec <strong>Google Authenticator</strong> ou <strong>Authy</strong>, puis saisissez le code à 6 chiffres.
                  </p>
                  {qrData.qrCodeDataUrl ? (
                    <div className="flex flex-col items-center gap-2 rounded-xl border p-3" style={{ borderColor: 'rgba(255,140,0,0.1)', background: '#fff' }}>
                      <img src={qrData.qrCodeDataUrl} alt="QR 2FA" className="h-36 w-36 rounded-lg" />
                      <div className="text-center">
                        <p className="text-[10px] text-[#9CA3AF] mb-1">Clé manuelle :</p>
                        <code className="text-[10px] text-[#8B6E50] select-all break-all">{qrData.secret}</code>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed p-3 text-center" style={{ borderColor: 'rgba(255,140,0,0.2)' }}>
                      <p className="text-[10px] text-[#8B6E50] break-all">{qrData.otpAuthUrl}</p>
                    </div>
                  )}
                  <input type="text" maxLength={6} placeholder="Code à 6 chiffres"
                    value={twoFactorCode}
                    onChange={e => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full rounded-xl border px-4 py-2.5 text-center font-mono text-base tracking-[0.4em] outline-none"
                    style={{ borderColor: 'rgba(255,140,0,0.2)', background: '#FDF8F3' }}
                  />
                  <div className="flex gap-2">
                    <button onClick={handleEnable2FA} disabled={secSaving}
                      className="flex-1 rounded-xl py-2.5 text-xs font-bold text-white disabled:opacity-50"
                      style={{ background: '#EA580C' }}>
                      {secSaving ? 'Activation…' : 'Activer la 2FA'}
                    </button>
                    <button onClick={() => setShow2FA(false)}
                      className="rounded-xl border px-4 py-2.5 text-xs text-[#8B6E50]"
                      style={{ borderColor: 'rgba(255,140,0,0.2)' }}>
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── QR Codes Tables ── */}
            <div id="sec-qr" className="rounded-2xl border bg-white p-5 space-y-4 scroll-mt-4" style={{ borderColor: 'rgba(255,140,0,0.14)', display: activeSection === 'sec-qr' ? '' : 'none' }}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <QrCode className="h-4 w-4" style={{ color: '#EA580C' }} />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: '#EA580C' }}>Commande en salle</p>
                </div>
                <h3 className="text-base font-bold text-[#1A0C00]">QR Codes par table</h3>
                <p className="text-xs text-[#8B6E50] mt-0.5">Le client scanne le QR de sa table et commande directement sans app.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-[#374151] whitespace-nowrap">Nombre de tables</label>
                  <input
                    type="number" min={1} max={50}
                    value={nbTables}
                    onChange={e => setNbTables(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                    className="w-16 rounded-xl border px-2 py-1.5 text-sm text-center outline-none"
                    style={{ borderColor: 'rgba(255,140,0,0.3)', background: '#FDF8F3' }}
                  />
                </div>
                <button
                  onClick={handleGenerateTableQR}
                  disabled={tableQrLoading}
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white disabled:opacity-60 transition"
                  style={{ background: '#EA580C' }}
                >
                  <QrCode className="h-3.5 w-3.5" />
                  {tableQrLoading ? 'Génération…' : 'Générer les QR codes'}
                </button>
                {tableQrCodes.length > 0 && (
                  <button
                    onClick={handlePrintTableQR}
                    className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition hover:bg-orange-50"
                    style={{ borderColor: 'rgba(255,140,0,0.35)', color: '#EA580C' }}
                  >
                    <Printer className="h-3.5 w-3.5" /> Imprimer tout
                  </button>
                )}
              </div>
              {tableQrCodes.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 pt-2">
                  {tableQrCodes.map(({ table, dataUrl }) => (
                    <div key={table} className="flex flex-col items-center gap-1.5 rounded-xl border p-2.5" style={{ borderColor: 'rgba(255,140,0,0.15)', background: '#FDF8F3' }}>
                      <img src={dataUrl} alt={`Table ${table}`} className="w-full aspect-square rounded-lg" />
                      <p className="text-xs font-bold text-[#1A0C00]">Table {table}</p>
                      <a
                        href={dataUrl}
                        download={`qr-table-${table}.png`}
                        className="text-[10px] font-semibold rounded-lg px-2 py-0.5 hover:bg-orange-100 transition"
                        style={{ color: '#EA580C' }}
                      >
                        Télécharger
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {backupCodes && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-amber-900">⚠ Codes de secours — notez-les maintenant !</p>
                    <p className="mt-0.5 text-[10px] text-amber-700">Affichés une seule fois. À conserver en lieu sûr.</p>
                  </div>
                  <button onClick={() => setBackupCodes(null)} className="text-amber-600 hover:text-amber-900">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {backupCodes.map((code, i) => (
                    <code key={i} className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-center font-mono text-xs text-amber-900 select-all">{code}</code>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => navigator.clipboard.writeText(backupCodes.join('\n'))}
                    className="flex-1 rounded-xl border border-amber-300 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100">
                    Copier
                  </button>
                  <button onClick={() => { const b=new Blob([`Codes de secours 2FA\n\n${backupCodes.join('\n')}`],{type:'text/plain'}); const u=URL.createObjectURL(b); const a=document.createElement('a'); a.href=u; a.download='codes-secours-2fa.txt'; a.click(); URL.revokeObjectURL(u); }}
                    className="flex-1 rounded-xl bg-amber-600 py-2 text-xs font-semibold text-white hover:bg-amber-700">
                    Télécharger
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>{/* /grid */}

        </div>
      </div>
    </div>
  );
}




/* ══════════════════ Module Historique / Audit ══════════════════ */
