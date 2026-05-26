// src/pages/PaymentSuccess.jsx
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, Clock, Download, Loader2 } from 'lucide-react';
import { commandesService } from '../services/api';

function downloadAndOpenBlob(blob, fileName) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.open(url, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => window.URL.revokeObjectURL(url), 60000);
}

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const orderId = id || 'R1234';
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const handleDownloadReceipt = async () => {
    setDownloading(true);
    setError('');

    try {
      const response = await commandesService.getReceiptPdf(orderId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      downloadAndOpenBlob(blob, `recu-commande-${orderId}.pdf`);
    } catch (downloadError) {
      setError(
        downloadError?.response?.data?.message ||
          'Le reçu PDF n’est pas encore disponible.',
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDF5EF] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-8 sm:p-10 border border-stone-100">
        
        {/* Icône succès - Cercle vert */}
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
            <Check className="w-8 h-8 text-white" strokeWidth={3} />
          </div>
        </div>

        {/* Message principal */}
        <h1 className="text-3xl font-bold text-stone-900 text-center mb-2">
          Paiement réussi !
        </h1>
        <p className="text-stone-600 text-center mb-8">
          Votre commande <span className="font-bold text-orange-700">#{orderId}</span> a été confirmée.
        </p>

        {/* Temps de livraison */}
        <div className="bg-stone-100 rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-center mb-3">
            <Clock className="w-5 h-5 text-orange-700 mr-2" />
            <span className="text-stone-600 font-medium">Livraison prévue dans</span>
          </div>
          <p className="text-4xl font-bold text-orange-700 text-center">
            25-35 min
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm mb-4">
            {error}
          </div>
        )}

        <button
          onClick={() => navigate(`/suivi/${orderId}`)}
          className="w-full bg-orange-700 hover:bg-orange-800 text-white font-bold py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 mb-3 transform hover:-translate-y-0.5"
        >
          SUIVRE MA COMMANDE
        </button>

        <button
          onClick={handleDownloadReceipt}
          disabled={downloading}
          className="w-full inline-flex items-center justify-center gap-2 border border-orange-700 text-orange-700 font-bold py-4 px-6 rounded-2xl hover:bg-orange-50 transition-all duration-300 mb-3 disabled:opacity-70"
        >
          {downloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
          TÉLÉCHARGER MON REÇU
        </button>
        
        <button
          onClick={() => navigate('/menu')}
          className="w-full text-orange-700 font-semibold py-3 hover:bg-orange-50 rounded-xl transition-colors duration-200"
        >
          Retour à l'accueil
        </button>
      </div>
    </div>
  );
}