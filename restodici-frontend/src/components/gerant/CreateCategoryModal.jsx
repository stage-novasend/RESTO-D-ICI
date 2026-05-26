// src/components/gerant/CreateCategoryModal.jsx
import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { menuAPI } from '../../services/api';

export default function CreateCategoryModal({ isOpen, onClose, onSuccess }) {
  const [form, setForm] = useState({ nom: '', description: '', icone: '🍽️' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nom.trim()) return setError('Nom requis');
    setLoading(true);
    try {
      await menuAPI.createCategory(form);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur création');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[#0F172A]">Nouvelle catégorie</h3>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full"><X className="w-5 h-5" /></button>
        </div>

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-[#0F172A]">Nom</label>
            <input 
              value={form.nom} 
              onChange={e => setForm({...form, nom: e.target.value})}
              className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#C05015] outline-none"
              placeholder="Ex: Plats du jour"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-[#0F172A]">Icône</label>
            <select 
              value={form.icone} 
              onChange={e => setForm({...form, icone: e.target.value})}
              className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-xl focus:ring-2 focus:ring-[#C05015] outline-none"
            >
              <option value="️">🍽️ Plat</option>
              <option value="🥗">🥗 Entrée</option>
              <option value="🍰">🍰 Dessert</option>
              <option value="🥤"> Boisson</option>
              <option value="🍖">🍖 Grillade</option>
            </select>
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#C05015] hover:bg-[#9A3E10] disabled:opacity-50 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
          >
            {loading ? 'Création...' : <><Plus className="w-4 h-4" /> Créer la catégorie</>}
          </button>
        </form>
      </div>
    </div>
  );
}