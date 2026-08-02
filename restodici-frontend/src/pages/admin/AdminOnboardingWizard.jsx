import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminAPI } from '../../services/api';
import { ORANGE as ACCENT, DARK_STONE as DARK, MUTED_WARM as MUTED } from '../../theme/colors';
import { Shield, ArrowRight, CheckCircle, Lock, Phone } from 'lucide-react';
import { BrandMark } from '../../components/shared/BrandLogo';

export default function AdminOnboardingWizard() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);
  
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
    novasendNumber: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Vérification du statut d'onboarding de l'admin
    const checkStatus = async () => {
      try {
        const res = await adminAPI.getOnboardingStatus();
        if (!res.data.isComplete) {
          setIsOpen(true);
        }
      } catch (err) {
        console.error("Erreur vérification onboarding admin:", err);
      }
    };
    
    checkStatus();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(null);
  };

  const handleNext = () => {
    if (step === 0) {
      if (formData.newPassword.length < 8) {
        setError('Le mot de passe doit faire au moins 8 caractères.');
        return;
      }
      if (formData.newPassword !== formData.confirmPassword) {
        setError('Les mots de passe ne correspondent pas.');
        return;
      }
    } else if (step === 1) {
      if (!/^(01|05|07|02)\d{8}$/.test(formData.novasendNumber)) {
        setError('Veuillez entrer un numéro CI valide (ex: 07XXXXXXXX).');
        return;
      }
    }
    setStep(step + 1);
  };

  const handleSubmit = async () => {
    if (step === 1 && !/^(01|05|07|02)\d{8}$/.test(formData.novasendNumber)) {
      setError('Veuillez entrer un numéro CI valide (ex: 07XXXXXXXX).');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await adminAPI.completeOnboarding({
        newPassword: formData.newPassword,
        novasendNumber: formData.novasendNumber
      });
      setStep(2); // Étape de succès
      setTimeout(() => setIsOpen(false), 3000);
    } catch (err) {
      setError(err?.response?.data?.message || "Erreur lors de l'enregistrement");
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 flex items-center justify-center p-4 sm:p-6"
        style={{ zIndex: 2000, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)' }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative w-full max-w-lg bg-white overflow-hidden"
          style={{ borderRadius: 24, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}
        >
          {/* En-tête */}
          <div style={{ background: '#F8FAFC', padding: '24px 32px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BrandMark scale={0.7} />
          </div>

          <div style={{ padding: '32px' }}>
            {step === 0 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(234,60,12, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Lock style={{ width: 28, height: 28, color: ACCENT }} />
                  </div>
                </div>
                <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', textAlign: 'center', margin: '0 0 8px' }}>
                  Sécurisez votre compte
                </h2>
                <p style={{ fontSize: 14, color: '#64748B', textAlign: 'center', margin: '0 0 24px' }}>
                  Bienvenue ! Pour des raisons de sécurité, vous devez modifier le mot de passe administrateur par défaut.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>Nouveau mot de passe</label>
                    <input type="password" name="newPassword" value={formData.newPassword} onChange={handleChange} placeholder="Min. 8 caractères"
                      style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid #CBD5E1', fontSize: 14, outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>Confirmer le mot de passe</label>
                    <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••"
                      style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid #CBD5E1', fontSize: 14, outline: 'none' }} />
                  </div>
                </div>

                {error && <p style={{ fontSize: 13, color: '#EF4444', fontWeight: 600, marginTop: 12, textAlign: 'center' }}>{error}</p>}

                <button onClick={handleNext}
                  style={{ width: '100%', padding: '14px', background: ACCENT, color: '#fff', borderRadius: 12, border: 'none', fontSize: 15, fontWeight: 700, marginTop: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  Suivant <ArrowRight style={{ width: 18, height: 18 }} />
                </button>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Phone style={{ width: 28, height: 28, color: '#16A34A' }} />
                  </div>
                </div>
                <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', textAlign: 'center', margin: '0 0 8px' }}>
                  Numéro Novasend
                </h2>
                <p style={{ fontSize: 14, color: '#64748B', textAlign: 'center', margin: '0 0 24px' }}>
                  Renseignez le numéro Mobile Money qui recevra les commissions de la plateforme.
                </p>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>Numéro de réception</label>
                  <input type="tel" name="novasendNumber" value={formData.novasendNumber} onChange={handleChange} placeholder="ex: 07XXXXXXXX"
                    style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid #CBD5E1', fontSize: 14, outline: 'none' }} />
                </div>

                {error && <p style={{ fontSize: 13, color: '#EF4444', fontWeight: 600, marginTop: 12, textAlign: 'center' }}>{error}</p>}

                <button onClick={handleSubmit} disabled={loading}
                  style={{ width: '100%', padding: '14px', background: ACCENT, color: '#fff', borderRadius: 12, border: 'none', fontSize: 15, fontWeight: 700, marginTop: 24, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loading ? 0.7 : 1 }}>
                  {loading ? 'Enregistrement...' : 'Terminer'}
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '20px 0' }}>
                  <CheckCircle style={{ width: 64, height: 64, color: '#10B981', marginBottom: 20 }} />
                  <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', margin: '0 0 8px' }}>
                    C'est tout bon !
                  </h2>
                  <p style={{ fontSize: 14, color: '#64748B', margin: 0 }}>
                    Votre compte est sécurisé et la plateforme est prête.
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
