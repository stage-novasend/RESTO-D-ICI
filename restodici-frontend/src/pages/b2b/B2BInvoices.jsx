import { useState, useEffect } from 'react';
import { FileText, CheckCircle, Clock, AlertCircle, CreditCard, Download } from 'lucide-react';
import { b2bAPI } from '../../services/api';

function sanitizePdf(v) {
  return String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[()\\]/g, '').replace(/\s+/g, ' ').trim();
}

function buildInvoicePdfBlob(facture, montantHT, tva, montant) {
  const lines = [
    sanitizePdf(`Facture: ${facture.periode ?? facture.numeroFacture ?? facture.id}`),
    sanitizePdf(`Statut: ${facture.statut ?? 'EN_ATTENTE'}`),
    '',
    sanitizePdf(`Montant HT : ${Math.round(montantHT).toLocaleString()} FCFA`),
    sanitizePdf(`TVA 18%    : ${Math.round(tva).toLocaleString()} FCFA`),
    sanitizePdf(`Total TTC  : ${Math.round(montant).toLocaleString()} FCFA`),
    '',
    facture.nifClient ? sanitizePdf(`NIF client : ${facture.nifClient}`) : '',
    facture.rccmClient ? sanitizePdf(`RCCM       : ${facture.rccmClient}`) : '',
    facture.echeance ? sanitizePdf(`Echeance   : ${facture.echeance}`) : '',
    '',
    "Facture conforme SYSCOHADA - Resto d'ici",
  ].filter(l => l !== null);

  const safeTitle = "FACTURE ENTREPRISE - Resto d'ici";
  const contentLines = [safeTitle, ...lines]
    .map((line, i) => `BT /F1 11 Tf 50 ${780 - i * 18} Td (${line}) Tj ET`)
    .join('\n');
  const stream = `${contentLines}\n`;
  const pdf = `%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n5 0 obj << /Length ${stream.length} >> stream\n${stream}endstream endobj\nxref\n0 6\n0000000000 65535 f \n0000000010 00000 n \n0000000063 00000 n \n0000000122 00000 n \n0000000248 00000 n \n0000000318 00000 n \ntrailer << /Size 6 /Root 1 0 R >>\nstartxref\n${318 + stream.length}\n%%EOF`;
  return new Blob([pdf], { type: 'application/pdf' });
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  window.open(url, '_blank', 'noopener,noreferrer');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

const ACCENT = '#C05015';
const CREAM = '#0F172A';
const MUTED = '#64748B';
const GOLD = '#F97316';
const BORDER = 'rgba(89,67,42,0.10)';

function StatusBadge({ statut }) {
  if (statut === 'PAYEE') return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
      <CheckCircle className="h-3 w-3" /> Payée
    </span>
  );
  if (statut === 'RETARDEE') return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
      <AlertCircle className="h-3 w-3" /> En retard
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
      <Clock className="h-3 w-3" /> En attente
    </span>
  );
}

export default function B2BInvoices() {
  const [factures, setFactures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { void load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await b2bAPI.getFacturesMensuelles();
      const data = res.data || [];
      if (data.length > 0) {
        setFactures(data);
      } else {
        // Try legacy invoices
        const legacyRes = await b2bAPI.getInvoices();
        setFactures(legacyRes.data || []);
      }
    } catch {
      setError('Impossible de charger les factures');
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async (id) => {
    setPaying(id);
    setError('');
    try {
      await b2bAPI.payerFacture(id);
      setSuccess('Paiement enregistré avec succès');
      await load();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du paiement');
    } finally {
      setPaying('');
    }
  };

  const totalDu = factures
    .filter(f => f.statut !== 'PAYEE' && f.statut !== 'paid')
    .reduce((s, f) => s + (f.montantTTC ?? f.amount ?? 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDF5EF]">
        <div className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: ACCENT, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8 bg-[#FDF5EF]">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: GOLD }}>
            Facturation mensuelle · SYSCOHADA
          </p>
          <h1 className="mt-1 text-2xl font-bold" style={{ color: CREAM }}>Factures entreprise</h1>
          <p className="mt-1 text-sm" style={{ color: MUTED }}>Conformité SYSCOHADA — TVA 18% incluse</p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
        {success && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>
        )}

        {/* Summary banner */}
        {totalDu > 0 && (
          <div className="rounded-2xl border p-5 bg-white flex items-center justify-between gap-4" style={{ borderColor: BORDER }}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: '#FFF4EE' }}>
                <AlertCircle className="h-5 w-5" style={{ color: ACCENT }} />
              </div>
              <div>
                <p className="text-xs" style={{ color: MUTED }}>Total dû (TTC)</p>
                <p className="text-xl font-bold" style={{ color: CREAM }}>{totalDu.toLocaleString()} FCFA</p>
              </div>
            </div>
            <div className="text-xs" style={{ color: MUTED }}>
              {factures.filter(f => f.statut !== 'PAYEE' && f.statut !== 'paid').length} facture(s) impayée(s)
            </div>
          </div>
        )}

        {/* Invoices list */}
        {factures.length === 0 ? (
          <div className="rounded-2xl border bg-white p-12 text-center" style={{ borderColor: BORDER }}>
            <FileText className="mx-auto h-10 w-10 mb-3" style={{ color: BORDER }} />
            <p className="text-sm" style={{ color: MUTED }}>Aucune facture — les factures mensuelles apparaîtront ici</p>
            <p className="text-xs mt-1" style={{ color: GOLD }}>Générées automatiquement le dernier jour du mois</p>
          </div>
        ) : (
          <div className="space-y-3">
            {factures.map(facture => {
              const isPaid = facture.statut === 'PAYEE' || facture.statut === 'paid';
              const isOverdue = facture.statut === 'RETARDEE';
              const montant = facture.montantTTC ?? facture.amount ?? 0;
              const montantHT = facture.montantHT ?? (montant / 1.18);
              const tva = facture.tva ?? (montant - montantHT);

              return (
                <div key={facture.id} className="rounded-2xl border bg-white p-5" style={{ borderColor: isOverdue ? 'rgba(192,80,21,0.2)' : BORDER }}>
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    {/* Icon */}
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: '#FDF5EF' }}>
                      <FileText className="h-5 w-5" style={{ color: GOLD }} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-bold text-sm" style={{ color: CREAM }}>
                          {facture.periode ?? facture.mois ?? facture.month ?? `Facture ${facture.id?.slice(0, 6)}`}
                        </span>
                        <StatusBadge statut={facture.statut ?? (facture.status === 'paid' ? 'PAYEE' : 'EN_ATTENTE')} />
                        {facture.numeroFacture && (
                          <span className="text-xs" style={{ color: MUTED }}>#{facture.numeroFacture}</span>
                        )}
                      </div>

                      {/* SYSCOHADA details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1 text-xs mt-2" style={{ color: MUTED }}>
                        <span>Montant HT: <strong style={{ color: CREAM }}>{Math.round(montantHT).toLocaleString()} FCFA</strong></span>
                        <span>TVA 18%: <strong style={{ color: CREAM }}>{Math.round(tva).toLocaleString()} FCFA</strong></span>
                        <span>TTC: <strong style={{ color: CREAM }}>{Math.round(montant).toLocaleString()} FCFA</strong></span>
                        {facture.nifClient && <span>NIF client: {facture.nifClient}</span>}
                        {facture.rccmClient && <span>RCCM: {facture.rccmClient}</span>}
                        {facture.echeance && <span>Échéance: {facture.echeance}</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <button
                        onClick={() => downloadBlob(buildInvoicePdfBlob(facture, montantHT, tva, montant), `facture-${facture.numeroFacture ?? facture.id?.slice(0, 8)}.pdf`)}
                        className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition hover:bg-white"
                        style={{ borderColor: BORDER, color: MUTED }}
                      >
                        <Download className="h-3.5 w-3.5" /> PDF
                      </button>
                      {!isPaid && (
                        <button
                          onClick={() => handlePay(facture.id)}
                          disabled={paying === facture.id}
                          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50"
                          style={{ background: ACCENT }}
                        >
                          <CreditCard className="h-4 w-4" />
                          {paying === facture.id ? 'Traitement...' : 'Payer'}
                        </button>
                      )}
                      {isPaid && (
                        <span className="text-sm font-medium" style={{ color: GOLD }}>Soldée ✓</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-center text-xs" style={{ color: MUTED }}>
          Factures conformes SYSCOHADA · TVA 18% · Générations automatiques fin de mois
        </p>
      </div>
    </div>
  );
}
